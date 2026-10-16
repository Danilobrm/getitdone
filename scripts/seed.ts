// Usage: pnpm db:seed [path/to/file.json] [--user <username>] [--dry-run]
// Default file: seed/data.json. See seed/data.example.json for the format.
// Seeds into one user: --user, or the only registered user, or the unclaimed
// placeholder (adopted by the first sign-up) when nobody has signed up yet.
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, isNull, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "../src/db";
import { categories, tasks, users } from "../src/db/schema";

const seedSchema = z.object({
  categories: z
    .array(z.object({ name: z.string().trim().min(1).max(40), sortOrder: z.number().int().optional() }))
    .default([]),
  tasks: z.array(
    z.object({
      title: z.string().trim().min(1).max(200),
      notes: z.string().max(10_000).nullish(),
      // Category name; created on the fly if it is not listed above.
      category: z.string().trim().min(1).max(40).nullish(),
      // Local day YYYY-MM-DD; omit or null for the backlog.
      date: z.iso.date().nullish(),
      estimatedPomodoros: z.number().int().min(1).max(99).nullish(),
    }),
  ),
});

type Counts = { createdCategories: number; createdTasks: number; skippedTasks: number };

/** Thrown inside the transaction on --dry-run to roll everything back. */
class DryRunRollback extends Error {
  constructor(readonly counts: Counts) {
    super("dry run");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const userFlag = args.indexOf("--user");
  const usernameArg = userFlag >= 0 ? args[userFlag + 1]?.toLowerCase() : undefined;
  const fileArg = args.find((a, i) => !a.startsWith("--") && i !== userFlag + 1);
  const file = resolve(process.cwd(), fileArg ?? "seed/data.json");

  if (!existsSync(file)) {
    console.error(`File not found: ${file}\nSee seed/data.example.json for the expected format.`);
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`Invalid JSON in ${file}: ${(err as Error).message}`);
    process.exit(1);
  }

  const parsed = seedSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Invalid seed file:");
    for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    process.exit(1);
  }
  const data = parsed.data;

  const allUsers = await db.select({ id: users.id, username: users.username, passwordHash: users.passwordHash }).from(users);
  const claimed = allUsers.filter((u) => u.passwordHash);
  const target = usernameArg
    ? allUsers.find((u) => u.username === usernameArg)
    : claimed.length === 1
      ? claimed[0]
      : claimed.length === 0
        ? allUsers[0]
        : undefined;
  if (!target) {
    console.error(
      usernameArg
        ? `User not found: ${usernameArg}`
        : `Several users exist; pick one with --user <username> (${claimed.map((u) => u.username).join(", ")}).`,
    );
    process.exit(1);
  }
  const userId = target.id;
  console.log(`Seeding into user: ${target.username}${target.passwordHash ? "" : " (unclaimed, adopted by the first sign-up)"}`);

  const result = await db.transaction(async (tx) => {
    // Categories: reuse by name, create the missing ones.
    const existingCats = await tx.select().from(categories).where(eq(categories.userId, userId));
    const catIds = new Map(existingCats.map((c) => [c.name, c.id]));
    let nextCatOrder = existingCats.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1;
    let createdCategories = 0;

    const wanted = [
      ...data.categories,
      ...data.tasks.flatMap((t) => (t.category ? [{ name: t.category, sortOrder: undefined }] : [])),
    ];
    for (const c of wanted) {
      if (catIds.has(c.name)) continue;
      const [row] = await tx
        .insert(categories)
        .values({ userId, name: c.name, color: "neutral", sortOrder: c.sortOrder ?? nextCatOrder++ })
        .returning({ id: categories.id });
      if (!row) throw new Error(`failed to create category ${c.name}`);
      catIds.set(c.name, row.id);
      createdCategories++;
    }

    // Tasks: skip ones already seeded (same title and day), keep file order per day.
    const existingSeed = await tx
      .select({ title: tasks.title, date: tasks.date })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.source, "seed")));
    const seen = new Set(existingSeed.map((t) => `${t.date ?? "backlog"}|${t.title}`));
    const nextOrder = new Map<string, number>();
    let createdTasks = 0;
    let skippedTasks = 0;

    for (const t of data.tasks) {
      const date = t.date ?? null;
      const key = `${date ?? "backlog"}|${t.title}`;
      if (seen.has(key)) {
        skippedTasks++;
        continue;
      }
      seen.add(key);

      const bucket = date ?? "backlog";
      if (!nextOrder.has(bucket)) {
        const [row] = await tx
          .select({ top: max(tasks.sortOrder) })
          .from(tasks)
          .where(and(eq(tasks.userId, userId), date ? eq(tasks.date, date) : isNull(tasks.date)));
        nextOrder.set(bucket, (row?.top ?? -1) + 1);
      }
      const sortOrder = nextOrder.get(bucket)!;
      nextOrder.set(bucket, sortOrder + 1);

      await tx.insert(tasks).values({
        userId,
        title: t.title,
        notes: t.notes ?? null,
        categoryId: t.category ? (catIds.get(t.category) ?? null) : null,
        date,
        estimatedPomodoros: t.estimatedPomodoros ?? null,
        source: "seed",
        sortOrder,
      });
      createdTasks++;
    }

    const counts: Counts = { createdCategories, createdTasks, skippedTasks };
    if (dryRun) throw new DryRunRollback(counts);
    return counts;
  }).catch((err: unknown) => {
    if (err instanceof DryRunRollback) return err.counts;
    throw err;
  });

  const label = dryRun ? "[dry-run, nothing written] " : "";
  console.log(
    `${label}categories created: ${result.createdCategories}, tasks created: ${result.createdTasks}, tasks skipped (already seeded): ${result.skippedTasks}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
