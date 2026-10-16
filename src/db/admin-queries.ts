// Cross-user queries for the admin dashboard. Unlike src/db/queries.ts these are
// NOT scoped to one user: only call them after requireAdmin(). They expose counts,
// never task content.
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { tasks, users } from "./schema";

export type AdminUserRow = {
  id: string;
  username: string;
  role: "user" | "admin";
  createdAt: Date;
  totalTasks: number;
  doneTasks: number;
};

export function listUsersWithTaskStats(): Promise<AdminUserRow[]> {
  return db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
      totalTasks: count(tasks.id),
      doneTasks: sql<number>`count(${tasks.id}) filter (where ${tasks.status} = 'done')`.mapWith(Number),
    })
    .from(users)
    .leftJoin(tasks, eq(tasks.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));
}
