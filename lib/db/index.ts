import { neon, type NeonQueryFunction } from "@neondatabase/serverless"
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http"
import * as schema from "./schema"

// Lazily initialise so the env var is read after Next.js loads .env files
let _sql: NeonQueryFunction<false, false> | undefined
let _db: NeonHttpDatabase<typeof schema> | undefined

function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is not set")
    _sql = neon(url)
  }
  return _sql
}

function getDb() {
  if (!_db) {
    _db = drizzle(getSql(), { schema })
  }
  return _db
}

// Convenience proxy so existing `db.select()...` call-sites still work
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Better Auth pool — use a factory so it reads env at call time, not at module load
import { Pool } from "pg"

let _pool: Pool | undefined

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is not set")
    _pool = new Pool({ connectionString: url })
  }
  return _pool
}

// Lazy pool accessor for Better Auth
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    // Pass through all Pool methods/props to the lazy instance
    const instance = getPool()
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === "function") {
      return value.bind(instance)
    }
    return value
  },
})
