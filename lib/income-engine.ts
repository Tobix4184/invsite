import { db, pool } from "@/lib/db"
import { investment } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Accrues daily income for all of a user's active investments.
 *
 * Each investment is processed inside its own transaction using
 * `SELECT ... FOR UPDATE` to lock the row. This guarantees that two
 * concurrent requests (e.g. dashboard load + router refresh, or the cron
 * running at the same time) can never pay the same day twice — the second
 * caller blocks until the first commits, then re-reads the already-advanced
 * `lastPayoutAt` and finds nothing due.
 *
 * Pays one daily portion for every full 24h elapsed since the last payout,
 * capped at the plan's duration, and completes the investment when fully paid.
 */
export async function accrueIncomeForUser(userId: string): Promise<number> {
  // Cheap, unlocked read just to find candidate investment ids.
  const actives = await db
    .select({ id: investment.id })
    .from(investment)
    .where(and(eq(investment.userId, userId), eq(investment.status, "active")))

  let totalCredited = 0

  for (const { id } of actives) {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      // Lock this investment row. Any concurrent accrual for the same row waits here.
      const { rows } = await client.query(
        `SELECT id, "planName", "dailyEarning", "durationDays", "daysPaid", "lastPayoutAt", status
         FROM investment WHERE id = $1 FOR UPDATE`,
        [id],
      )
      const inv = rows[0]
      if (!inv || inv.status !== "active") {
        await client.query("COMMIT")
        continue
      }

      const daily = Number(inv.dailyEarning)
      const duration = Number(inv.durationDays)
      const daysPaid = Number(inv.daysPaid)
      const last = new Date(inv.lastPayoutAt).getTime()
      const now = Date.now()

      const elapsedDays = Math.floor((now - last) / DAY_MS)
      const remainingDays = duration - daysPaid
      const payDays = Math.min(Math.max(elapsedDays, 0), Math.max(remainingDays, 0))

      if (payDays <= 0) {
        // Nothing due. Complete the investment if it has run its full course.
        if (remainingDays <= 0) {
          await client.query(`UPDATE investment SET status = 'completed' WHERE id = $1`, [id])
        }
        await client.query("COMMIT")
        continue
      }

      const credit = daily * payDays
      const newDaysPaid = daysPaid + payDays
      const newStatus = newDaysPaid >= duration ? "completed" : "active"
      const newLast = new Date(last + payDays * DAY_MS)

      await client.query(
        `UPDATE investment
         SET "daysPaid" = $1, "amountEarned" = "amountEarned" + $2, "lastPayoutAt" = $3, status = $4
         WHERE id = $5`,
        [newDaysPaid, credit, newLast, newStatus, id],
      )

      await client.query(
        `UPDATE wallet
         SET balance = balance + $1, "totalEarned" = "totalEarned" + $1, "updatedAt" = now()
         WHERE "userId" = $2`,
        [credit, userId],
      )

      await client.query(
        `INSERT INTO transaction ("userId", type, amount, description)
         VALUES ($1, 'earning', $2, $3)`,
        [userId, String(credit), `Daily income from ${inv.planName} (${payDays} day${payDays > 1 ? "s" : ""})`],
      )

      await client.query("COMMIT")
      totalCredited += credit
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {})
      console.error(`[v0] accrueIncomeForUser failed for investment ${id}:`, err)
    } finally {
      client.release()
    }
  }

  return totalCredited
}

/** Accrues income for every user with active investments. Used by cron. */
export async function accrueIncomeForAll(): Promise<{ users: number; credited: number }> {
  const rows = await db
    .selectDistinct({ userId: investment.userId })
    .from(investment)
    .where(eq(investment.status, "active"))

  let credited = 0
  for (const r of rows) {
    credited += await accrueIncomeForUser(r.userId)
  }
  return { users: rows.length, credited }
}
