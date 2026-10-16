import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const client = globalForDb.pgClient ?? postgres(process.env.DATABASE_URL!, {
    // Serverless (Vercel): each instance keeps a tiny pool so we never exhaust Railway's connections.
    max: process.env.NODE_ENV === "production" ? 2 : 10,
    idle_timeout: 20,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export * from "./schema";
