// Usage: pnpm db:make-admin <username>
// Promotes an existing user to admin. Uses DATABASE_URL from the environment.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";

async function main() {
  const username = process.argv[2]?.trim().toLowerCase();
  if (!username) {
    console.error("Usage: pnpm db:make-admin <username>");
    process.exit(1);
  }
  const updated = await db.update(users).set({ role: "admin" }).where(eq(users.username, username)).returning({ id: users.id });
  if (updated.length === 0) {
    console.error(`User "${username}" not found.`);
    process.exit(1);
  }
  console.log(`"${username}" is now an admin.`);
  process.exit(0);
}

main();
