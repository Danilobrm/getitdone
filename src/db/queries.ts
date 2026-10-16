import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, max, ne, or, sql } from "drizzle-orm";
import { db } from "./index";
import { env } from "@/lib/env";
import { todayLocal, weekdayOf } from "@/lib/dates";
import { categories, pomodoroSessions, recurringRules, recurringSkips, settings, tasks, users } from "./schema";

// Every function below takes the signed-in user's id first and scopes every
// statement by it, so one user can never read or touch another user's rows.

export type CategoryRow = typeof categories.$inferSelect;
export type TaskWithCategory = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  date: string | null;
  categoryId: string | null;
  recurringRuleId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categorySort: number | null;
};

const taskColumns = {
  id: tasks.id,
  title: tasks.title,
  status: tasks.status,
  date: tasks.date,
  categoryId: tasks.categoryId,
  recurringRuleId: tasks.recurringRuleId,
  categoryName: categories.name,
  categoryColor: categories.color,
  categorySort: categories.sortOrder,
};

type Executor = Pick<typeof db, "select" | "insert">;

// ---------- users ----------

export async function findUserByUsername(username: string) {
  const [row] = await db
    .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.username, username));
  return row ?? null;
}

export async function getUser(userId: string) {
  const [row] = await db.select({ id: users.id, username: users.username, role: users.role })
    .from(users)
    .where(eq(users.id, userId));
  return row ?? null;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Creates an account. The very first sign-up adopts the unclaimed placeholder
 * user that owns the data created before multi-user support existed.
 */
export async function registerUser(username: string, passwordHash: string): Promise<string | null> {
  try {
    return await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(users)
        .set({ username, passwordHash })
        .where(isNull(users.passwordHash))
        .returning({ id: users.id });
      const id =
        claimed?.id ??
        (await tx.insert(users).values({ username, passwordHash }).returning({ id: users.id }))[0]?.id;
      if (!id) throw new Error("failed to create user");
      await tx.insert(settings).values({ userId: id }).onConflictDoNothing();
      return id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) return null;
    throw err;
  }
}

// ---------- categories ----------

export function listCategories(userId: string): Promise<CategoryRow[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/** Returns the id only if the category belongs to the user; otherwise null. */
async function ownedCategory(executor: Executor, userId: string, id: string | null): Promise<string | null> {
  if (!id) return null;
  const [row] = await executor
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  return row?.id ?? null;
}

export async function createCategory(userId: string, input: { name: string }) {
  const [row] = await db
    .select({ top: max(categories.sortOrder) })
    .from(categories)
    .where(eq(categories.userId, userId));
  // The UI is black & white; the color column keeps a neutral token.
  await db.insert(categories).values({ ...input, userId, color: "neutral", sortOrder: (row?.top ?? -1) + 1 });
}

export async function updateCategory(userId: string, id: string, input: { name: string }) {
  await db
    .update(categories)
    .set(input)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

/** Tasks keep existing; their category_id becomes null (FK on delete set null). */
export async function deleteCategory(userId: string, id: string) {
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

/**
 * Persists a new category order. `ids` is the full desired order; ids that do not
 * belong to the user are ignored, and categories missing from `ids` keep their
 * relative order after the listed ones.
 */
export async function reorderCategories(userId: string, ids: string[]) {
  await db.transaction(async (tx) => {
    const mine = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
    const owned = new Set(mine.map((c) => c.id));
    const listed = [...new Set(ids)].filter((id) => owned.has(id));
    const rest = mine.map((c) => c.id).filter((id) => !listed.includes(id));
    const final = [...listed, ...rest];
    for (const [index, id] of final.entries()) {
      await tx
        .update(categories)
        .set({ sortOrder: index })
        .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    }
  });
}

// ---------- tasks ----------

export function listTasksForDay(userId: string, day: string): Promise<TaskWithCategory[]> {
  return db
    .select(taskColumns)
    .from(tasks)
    .leftJoin(categories, eq(tasks.categoryId, categories.id))
    .where(and(eq(tasks.userId, userId), eq(tasks.date, day)))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
}

/** Not-done tasks planned before `day`. */
export function listOverdue(userId: string, day: string): Promise<TaskWithCategory[]> {
  return db
    .select(taskColumns)
    .from(tasks)
    .leftJoin(categories, eq(tasks.categoryId, categories.id))
    .where(and(eq(tasks.userId, userId), isNotNull(tasks.date), lt(tasks.date, day), ne(tasks.status, "done")))
    .orderBy(asc(tasks.date), asc(tasks.sortOrder));
}

export async function getDoingTask(userId: string) {
  const [row] = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, "doing")))
    .limit(1);
  return row ?? null;
}

async function skipOccurrence(executor: Executor, ruleId: string, day: string) {
  await executor.insert(recurringSkips).values({ recurringRuleId: ruleId, date: day }).onConflictDoNothing();
}

async function nextSortOrder(executor: Executor, userId: string, day: string | null): Promise<number> {
  const [row] = await executor
    .select({ top: max(tasks.sortOrder) })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), day === null ? isNull(tasks.date) : eq(tasks.date, day)));
  return (row?.top ?? -1) + 1;
}

export async function createTask(
  userId: string,
  input: {
    title: string;
    categoryId: string | null;
    date: string | null;
    notes?: string | null;
    estimatedPomodoros?: number | null;
  },
) {
  await db.insert(tasks).values({
    userId,
    title: input.title,
    categoryId: await ownedCategory(db, userId, input.categoryId),
    date: input.date,
    notes: input.notes ?? null,
    estimatedPomodoros: input.estimatedPomodoros ?? null,
    sortOrder: await nextSortOrder(db, userId, input.date),
  });
}

/** Completing needs a day: tasks without one (backlog) cannot be marked done. */
export async function setTaskDone(userId: string, id: string, done: boolean) {
  await db.transaction(async (tx) => {
    if (done) {
      const [task] = await tx
        .select({ date: tasks.date })
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
      if (!task?.date) return;
      // A finished task cannot keep a running focus session.
      await tx
        .update(pomodoroSessions)
        .set({ endedAt: sql`now()`, completed: false })
        .where(
          and(
            eq(pomodoroSessions.userId, userId),
            eq(pomodoroSessions.taskId, id),
            eq(pomodoroSessions.kind, "focus"),
            isNull(pomodoroSessions.endedAt),
          ),
        );
    }
    await tx
      .update(tasks)
      .set({
        status: done ? "done" : "todo",
        completedAt: done ? sql`now()` : null,
        updatedAt: sql`now()`,
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  });
}

/**
 * Moves tasks to `day`, appending after the tasks already there. A routine task
 * whose rule already has an occurrence on `day` is merged into it (dropped).
 */
export async function moveTasksToDay(userId: string, ids: string[], day: string) {
  if (ids.length === 0) return;
  await db.transaction(async (tx) => {
    const ordered = await tx
      .select({ id: tasks.id, date: tasks.date, ruleId: tasks.recurringRuleId })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, ids)))
      .orderBy(asc(tasks.date), asc(tasks.sortOrder));
    let next = await nextSortOrder(tx, userId, day);
    for (const t of ordered) {
      if (t.date === day) continue;
      if (t.ruleId) {
        const [dup] = await tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.recurringRuleId, t.ruleId), eq(tasks.date, day)));
        if (t.date) await skipOccurrence(tx, t.ruleId, t.date);
        if (dup) {
          await tx.delete(tasks).where(eq(tasks.id, t.id));
          continue;
        }
      }
      await tx
        .update(tasks)
        .set({ date: day, sortOrder: next++, updatedAt: sql`now()` })
        .where(eq(tasks.id, t.id));
    }
  });
}

export type TaskDetail = typeof tasks.$inferSelect;

export async function getTask(userId: string, id: string): Promise<TaskDetail | null> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function countCompletedFocus(userId: string, taskId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.userId, userId),
        eq(pomodoroSessions.taskId, taskId),
        eq(pomodoroSessions.kind, "focus"),
        eq(pomodoroSessions.completed, true),
      ),
    );
  return row?.n ?? 0;
}

export async function updateTask(
  userId: string,
  id: string,
  input: {
    title: string;
    notes: string | null;
    categoryId: string | null;
    date: string | null;
  },
): Promise<"ok" | "duplicate_routine"> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ date: tasks.date, ruleId: tasks.recurringRuleId })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    if (!current) return "ok";
    const moved = input.date !== current.date;

    if (moved && current.ruleId) {
      if (input.date) {
        const [dup] = await tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.recurringRuleId, current.ruleId), eq(tasks.date, input.date)));
        if (dup) return "duplicate_routine";
      }
      // Moved away: generation must not recreate this occurrence.
      if (current.date) await skipOccurrence(tx, current.ruleId, current.date);
    }

    // Moving to another day appends to that day's list.
    const sortOrder = moved && input.date ? await nextSortOrder(tx, userId, input.date) : undefined;
    await tx
      .update(tasks)
      .set({
        ...input,
        categoryId: await ownedCategory(tx, userId, input.categoryId),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: sql`now()`,
      })
      .where(eq(tasks.id, id));
    return "ok";
  });
}

export async function deleteTask(userId: string, id: string) {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ date: tasks.date, ruleId: tasks.recurringRuleId })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    if (!current) return;
    if (current.ruleId && current.date) await skipOccurrence(tx, current.ruleId, current.date);
    await tx.delete(tasks).where(eq(tasks.id, id));
  });
}

// ---------- settings ----------

export type SettingsRow = typeof settings.$inferSelect;

export async function getSettings(userId: string): Promise<SettingsRow> {
  await db.insert(settings).values({ userId }).onConflictDoNothing();
  const [row] = await db.select().from(settings).where(eq(settings.userId, userId));
  if (!row) throw new Error("settings row missing");
  return row;
}

export async function updateSettings(userId: string, input: Omit<SettingsRow, "userId">) {
  await db.insert(settings).values({ userId }).onConflictDoNothing();
  await db.update(settings).set(input).where(eq(settings.userId, userId));
}

// ---------- pomodoro ----------

export type OpenSession = {
  id: string;
  kind: "focus" | "short_break" | "long_break";
  startedAt: Date;
  plannedSec: number;
  taskId: string | null;
  taskTitle: string | null;
};

export async function getOpenSession(userId: string): Promise<OpenSession | null> {
  const [row] = await db
    .select({
      id: pomodoroSessions.id,
      kind: pomodoroSessions.kind,
      startedAt: pomodoroSessions.startedAt,
      plannedSec: pomodoroSessions.plannedSec,
      taskId: pomodoroSessions.taskId,
      taskTitle: tasks.title,
    })
    .from(pomodoroSessions)
    .leftJoin(tasks, eq(pomodoroSessions.taskId, tasks.id))
    .where(and(eq(pomodoroSessions.userId, userId), isNull(pomodoroSessions.endedAt)))
    .limit(1);
  return row ?? null;
}

export async function getLastSession(userId: string) {
  const [row] = await db
    .select({
      kind: pomodoroSessions.kind,
      completed: pomodoroSessions.completed,
      endedAt: pomodoroSessions.endedAt,
      taskId: pomodoroSessions.taskId,
    })
    .from(pomodoroSessions)
    .where(eq(pomodoroSessions.userId, userId))
    .orderBy(desc(pomodoroSessions.startedAt))
    .limit(1);
  return row ?? null;
}

/** "Fazer agora": makes `taskId` the only doing task and starts a focus session. */
export async function startFocus(userId: string, taskId: string) {
  await getSettings(userId);
  await db.transaction(async (tx) => {
    const [task] = await tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
    if (!task) return;
    const [cfg] = await tx.select().from(settings).where(eq(settings.userId, userId));
    if (!cfg) throw new Error("settings row missing");

    await tx
      .update(pomodoroSessions)
      .set({ endedAt: sql`now()`, completed: false })
      .where(and(eq(pomodoroSessions.userId, userId), isNull(pomodoroSessions.endedAt)));
    await tx
      .update(tasks)
      .set({ status: "todo", updatedAt: sql`now()` })
      .where(and(eq(tasks.userId, userId), eq(tasks.status, "doing"), ne(tasks.id, taskId)));
    await tx
      .update(tasks)
      .set({ status: "doing", completedAt: null, updatedAt: sql`now()` })
      .where(eq(tasks.id, taskId));
    await tx.insert(pomodoroSessions).values({ userId, taskId, kind: "focus", plannedSec: cfg.focusSec });
  });
}

export async function interruptOpenSession(userId: string) {
  await db
    .update(pomodoroSessions)
    .set({ endedAt: sql`now()`, completed: false })
    .where(and(eq(pomodoroSessions.userId, userId), isNull(pomodoroSessions.endedAt)));
}

const COMPLETE_TOLERANCE_SEC = 2;

/** Completes the open session only if its planned time has really elapsed. */
export async function completeOpenSession(userId: string): Promise<"completed" | "too_early" | "none"> {
  return db.transaction(async (tx) => {
    const [open] = await tx
      .select({
        id: pomodoroSessions.id,
        kind: pomodoroSessions.kind,
        taskId: pomodoroSessions.taskId,
        plannedSec: pomodoroSessions.plannedSec,
        elapsedSec: sql<number>`extract(epoch from (now() - ${pomodoroSessions.startedAt}))::float`,
      })
      .from(pomodoroSessions)
      .where(and(eq(pomodoroSessions.userId, userId), isNull(pomodoroSessions.endedAt)))
      .for("update")
      .limit(1);
    if (!open) return "none";
    if (open.elapsedSec < open.plannedSec - COMPLETE_TOLERANCE_SEC) return "too_early";

    await tx
      .update(pomodoroSessions)
      .set({ endedAt: sql`now()`, completed: true })
      .where(eq(pomodoroSessions.id, open.id));
    if (open.kind === "focus" && open.taskId) {
      await tx
        .update(tasks)
        .set({ timeSpentSec: sql`${tasks.timeSpentSec} + ${open.plannedSec}`, updatedAt: sql`now()` })
        .where(eq(tasks.id, open.taskId));
    }
    return "completed";
  });
}

export async function startBreak(userId: string, kind: "short_break" | "long_break") {
  const cfg = await getSettings(userId);
  // The unique index on open sessions rejects this if something is already running.
  await db
    .insert(pomodoroSessions)
    .values({ userId, kind, plannedSec: kind === "short_break" ? cfg.shortBreakSec : cfg.longBreakSec })
    .onConflictDoNothing();
}

/** Break to suggest after a focus: long after every N focus sessions done today since the last long break. */
export async function suggestBreak(userId: string) {
  const cfg = await getSettings(userId);
  const [lastLong] = await db
    .select({ at: max(pomodoroSessions.startedAt) })
    .from(pomodoroSessions)
    .where(and(eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.kind, "long_break")));

  const conditions = [
    eq(pomodoroSessions.userId, userId),
    eq(pomodoroSessions.kind, "focus"),
    eq(pomodoroSessions.completed, true),
    sql`(${pomodoroSessions.startedAt} at time zone ${env.tz})::date = ${todayLocal()}::date`,
  ];
  if (lastLong?.at) conditions.push(gt(pomodoroSessions.startedAt, lastLong.at));
  const [row] = await db
    .select({ n: count() })
    .from(pomodoroSessions)
    .where(and(...conditions));

  const done = row?.n ?? 0;
  const long = done > 0 && done % cfg.pomodorosUntilLongBreak === 0;
  return {
    kind: long ? ("long_break" as const) : ("short_break" as const),
    sec: long ? cfg.longBreakSec : cfg.shortBreakSec,
    done,
  };
}

// ---------- recurring rules ----------

export type RuleRow = typeof recurringRules.$inferSelect;
export type RuleInput = {
  title: string;
  notes: string | null;
  categoryId: string | null;
  weekdays: number[];
  startDate: string;
  endDate: string | null;
  active: boolean;
};

export function listRules(userId: string): Promise<RuleRow[]> {
  return db.select().from(recurringRules).where(eq(recurringRules.userId, userId)).orderBy(asc(recurringRules.title));
}

export async function createRule(userId: string, input: RuleInput) {
  await db.insert(recurringRules).values({
    ...input,
    userId,
    categoryId: await ownedCategory(db, userId, input.categoryId),
  });
}

export async function updateRule(userId: string, id: string, input: RuleInput) {
  const categoryId = await ownedCategory(db, userId, input.categoryId);
  await db.transaction(async (tx) => {
    await tx
      .update(recurringRules)
      .set({ ...input, categoryId })
      .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
    // Propagate to occurrences already generated from today on; finished ones and history stay.
    await tx
      .update(tasks)
      .set({ title: input.title, notes: input.notes, categoryId })
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.recurringRuleId, id),
          gte(tasks.date, todayLocal()),
          ne(tasks.status, "done"),
        ),
      );
  });
}

/** Already generated tasks stay (their rule link is nulled by the FK). */
export async function deleteRule(userId: string, id: string) {
  await db.delete(recurringRules).where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
}

/**
 * Creates the day's tasks for every active rule that covers it. Idempotent:
 * the unique index on (recurring_rule_id, date) and the skip table make
 * repeated or concurrent calls safe.
 */
export async function ensureRecurringForDay(userId: string, day: string) {
  await db.transaction(async (tx) => {
    const rules = await tx
      .select()
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.userId, userId),
          eq(recurringRules.active, true),
          lte(recurringRules.startDate, day),
          or(isNull(recurringRules.endDate), gte(recurringRules.endDate, day)),
          sql`${weekdayOf(day)} = any(${recurringRules.weekdays})`,
        ),
      );
    if (rules.length === 0) return;
    const ruleIds = rules.map((r) => r.id);

    const [existing, skipped] = await Promise.all([
      tx
        .select({ ruleId: tasks.recurringRuleId })
        .from(tasks)
        .where(and(eq(tasks.date, day), inArray(tasks.recurringRuleId, ruleIds))),
      tx
        .select({ ruleId: recurringSkips.recurringRuleId })
        .from(recurringSkips)
        .where(and(eq(recurringSkips.date, day), inArray(recurringSkips.recurringRuleId, ruleIds))),
    ]);
    const blocked = new Set([...existing, ...skipped].map((r) => r.ruleId));
    const missing = rules.filter((r) => !blocked.has(r.id));
    if (missing.length === 0) return;

    let order = await nextSortOrder(tx, userId, day);
    await tx
      .insert(tasks)
      .values(
        missing.map((r) => ({
          userId,
          title: r.title,
          notes: r.notes,
          categoryId: r.categoryId,
          estimatedPomodoros: r.estimatedPomodoros,
          date: day,
          source: "recurring" as const,
          recurringRuleId: r.id,
          sortOrder: order++,
        })),
      )
      .onConflictDoNothing({ target: [tasks.recurringRuleId, tasks.date] });
  });
}

// ---------- week & backlog ----------

export function listTasksInRange(userId: string, start: string, end: string): Promise<TaskWithCategory[]> {
  return db
    .select(taskColumns)
    .from(tasks)
    .leftJoin(categories, eq(tasks.categoryId, categories.id))
    .where(and(eq(tasks.userId, userId), gte(tasks.date, start), lte(tasks.date, end)))
    .orderBy(asc(tasks.date), asc(tasks.sortOrder), asc(tasks.createdAt));
}

export function listBacklog(userId: string): Promise<TaskWithCategory[]> {
  return db
    .select(taskColumns)
    .from(tasks)
    .leftJoin(categories, eq(tasks.categoryId, categories.id))
    .where(and(eq(tasks.userId, userId), isNull(tasks.date), ne(tasks.status, "done")))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
}
