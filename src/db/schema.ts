import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const taskStatus = pgEnum("task_status", ["todo", "doing", "done"]);
export const taskSource = pgEnum("task_source", ["manual", "seed", "recurring"]);
export const userRole = pgEnum("user_role", ["user", "admin"]);
export const sessionKind = pgEnum("session_kind", ["focus", "short_break", "long_break"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // lowercase; unique
  username: text("username").notNull().unique(),
  // null = unclaimed placeholder that owns pre-multi-user data until the first sign-up adopts it
  passwordHash: text("password_hash"),
  role: userRole("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const userId = () =>
  uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userId(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const recurringRules = pgTable("recurring_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userId(),
  title: text("title").notNull(),
  notes: text("notes"),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  estimatedPomodoros: integer("estimated_pomodoros"),
  // 0 = sunday ... 6 = saturday
  weekdays: integer("weekdays").array().notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  active: boolean("active").notNull().default(true),
});

// Occurrences the user deleted or moved away, so generation never recreates them.
export const recurringSkips = pgTable(
  "recurring_skips",
  {
    recurringRuleId: uuid("recurring_rule_id")
      .notNull()
      .references(() => recurringRules.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.recurringRuleId, t.date] })],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    title: text("title").notNull(),
    notes: text("notes"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    // local day (America/Sao_Paulo); null = backlog
    date: date("date", { mode: "string" }),
    status: taskStatus("status").notNull().default("todo"),
    sortOrder: integer("sort_order").notNull().default(0),
    estimatedPomodoros: integer("estimated_pomodoros"),
    timeSpentSec: integer("time_spent_sec").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    source: taskSource("source").notNull().default("manual"),
    recurringRuleId: uuid("recurring_rule_id").references(() => recurringRules.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tasks_user_date_idx").on(t.userId, t.date),
    // generation is idempotent per rule per day
    uniqueIndex("tasks_rule_date_uniq").on(t.recurringRuleId, t.date),
    // only one task per user can be "doing" at a time
    uniqueIndex("tasks_single_doing_uniq")
      .on(t.userId)
      .where(sql`${t.status} = 'doing'`),
  ],
);

export const pomodoroSessions = pgTable(
  "pomodoro_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    kind: sessionKind("kind").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    plannedSec: integer("planned_sec").notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    completed: boolean("completed").notNull().default(false),
  },
  (t) => [
    index("pomodoro_sessions_task_idx").on(t.taskId),
    // only one open session per user at a time
    uniqueIndex("pomodoro_single_open_uniq")
      .on(t.userId)
      .where(sql`${t.endedAt} is null`),
  ],
);

export const settings = pgTable("settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  focusSec: integer("focus_sec").notNull().default(1500),
  shortBreakSec: integer("short_break_sec").notNull().default(300),
  longBreakSec: integer("long_break_sec").notNull().default(900),
  pomodorosUntilLongBreak: integer("pomodoros_until_long_break").notNull().default(4),
});
