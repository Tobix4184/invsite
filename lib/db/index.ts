import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })

// Lazy schema migrations — add new columns without a full migration runner
pool.query(`
  ALTER TABLE bank_account ADD COLUMN IF NOT EXISTS "sabussPin" text;
  ALTER TABLE deposit ADD COLUMN IF NOT EXISTS "sabussRef" text;
`).catch(() => { /* columns already exist or not connected yet — safe to ignore */ })
