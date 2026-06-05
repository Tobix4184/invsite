import { db } from "@/lib/db"
import { siteSetting, bankAccount } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const SETTING_KEYS = {
  depositsPaused: "deposits_paused",
  withdrawalsPaused: "withdrawals_paused",
} as const

/** Reads a single setting value, returns null if missing. */
export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteSetting).where(eq(siteSetting.key, key))
  return row?.value ?? null
}

/** Reads a boolean setting (defaults to false if unset). */
export async function getBoolSetting(key: string): Promise<boolean> {
  const v = await getSetting(key)
  return v === "true"
}

/** Upserts a setting value. */
export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(siteSetting)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSetting.key, set: { value, updatedAt: new Date() } })
}

/** Convenience: returns both pause flags. */
export async function getPauseFlags(): Promise<{ depositsPaused: boolean; withdrawalsPaused: boolean }> {
  const rows = await db.select().from(siteSetting)
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return {
    depositsPaused: map.get(SETTING_KEYS.depositsPaused) === "true",
    withdrawalsPaused: map.get(SETTING_KEYS.withdrawalsPaused) === "true",
  }
}

/**
 * Picks an active bank account using weighted random selection.
 * Higher `weight` = higher chance of being shown. Optionally avoids
 * re-picking the same account that was used last (when more than one is active).
 */
export async function pickWeightedBankAccount(excludeId?: number) {
  const accounts = await db.select().from(bankAccount).where(eq(bankAccount.isActive, true))
  if (accounts.length === 0) return null

  let pool = accounts
  if (excludeId != null && accounts.length > 1) {
    const filtered = accounts.filter((a) => a.id !== excludeId)
    if (filtered.length > 0) pool = filtered
  }

  const totalWeight = pool.reduce((sum, a) => sum + Math.max(1, a.weight ?? 1), 0)
  let r = Math.random() * totalWeight
  for (const acc of pool) {
    r -= Math.max(1, acc.weight ?? 1)
    if (r <= 0) return acc
  }
  return pool[pool.length - 1]
}
