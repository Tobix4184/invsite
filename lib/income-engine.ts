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
  // Sweep any already-credited earnings back into investments for users with
  // autoReinvest=true (handles earnings that dropped before the feature existed)
  await backfillReinvestForUser(userId)

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
        `SELECT id, "planName", "dailyEarning", "durationDays", "daysPaid", "lastPayoutAt", status, "autoReinvest"
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
      const autoReinvest = inv.autoReinvest === true

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
      const newLast = new Date(last + payDays * DAY_MS)

      if (autoReinvest) {
        // REINVEST: extend investment instead of crediting wallet
        const newDurationDays = duration + payDays
        const newTotalEarning = inv.totalEarning + credit
        const newStatus = "active" // reset to active so it keeps earning
        const newDaysPaid = 0 // reset days paid counter since we extended duration

        await client.query(
          `UPDATE investment
           SET "durationDays" = $1, "totalEarning" = $2, "daysPaid" = $3, "lastPayoutAt" = $4, status = $5
           WHERE id = $6`,
          [newDurationDays, newTotalEarning, newDaysPaid, newLast, newStatus, id],
        )

        // Log the reinvestment backdated to the payout time so history is accurate
        await client.query(
          `INSERT INTO transaction ("userId", type, amount, description, status, "createdAt")
           VALUES ($1, 'reinvest', $2, $3, 'completed', $4)`,
          [userId, String(credit), `Earnings reinvested into ${inv.planName}`, newLast],
        )
      } else {
        // NORMAL: credit wallet with earnings
        const newDaysPaid = daysPaid + payDays
        const newStatus = newDaysPaid >= duration ? "completed" : "active"

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
      }

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

/**
 * Backfill: find `earning` transactions that were credited to the wallet
 * before auto-reinvest existed, and pull them back into the matching investment.
 *
 * Only runs for users whose active investment has autoReinvest=true.
 * For each unmatched `earning` transaction (no corresponding `reinvest` with
 * the same amount on the same day), we:
 *   1. Deduct the amount from the wallet
 *   2. Extend the investment's duration by 1 day per earning
 *   3. Replace the `earning` transaction with a `reinvest` one, keeping the
 *      original createdAt so history timestamps are accurate
 */
export async function backfillReinvestForUser(userId: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Find investments with autoReinvest ON for this user — active OR completed
    // (completed investments may still have un-backfilled earnings sitting in wallet)
    const { rows: invRows } = await client.query(
      `SELECT id, "planName", "dailyEarning", "durationDays", "daysPaid", "totalEarning"
       FROM investment
       WHERE "userId" = $1
         AND "autoReinvest" = true
         AND status IN ('active', 'completed')`,
      [userId],
    )
    if (invRows.length === 0) {
      await client.query("COMMIT")
      return
    }

    for (const inv of invRows) {
      const daily = Number(inv.dailyEarning)

      // Find earning transactions not yet converted to reinvest.
      // Use ::numeric cast to ensure amount comparison works across text/numeric types.
      // Also check no reinvest with same description already exists on that day.
      const { rows: earningRows } = await client.query(
        `SELECT t.id, t.amount::numeric AS amount, t."createdAt"
         FROM transaction t
         WHERE t."userId" = $1
           AND t.type = 'earning'
           AND t.description ILIKE $2
           AND NOT EXISTS (
             SELECT 1 FROM transaction r
             WHERE r."userId" = t."userId"
               AND r.type = 'reinvest'
               AND r.amount::numeric = t.amount::numeric
               AND DATE(r."createdAt") = DATE(t."createdAt")
           )
         ORDER BY t."createdAt" ASC`,
        [userId, `%${inv.planName}%`],
      )

      if (earningRows.length === 0) continue

      for (const earning of earningRows) {
        const amount = Number(earning.amount)
        const originalAt = earning.createdAt

        // 1. Deduct from wallet (clamp at 0 to avoid going negative)
        await client.query(
          `UPDATE wallet
           SET balance = GREATEST(balance - $1, 0),
               "totalEarned" = GREATEST("totalEarned" - $1, 0),
               "updatedAt" = now()
           WHERE "userId" = $2`,
          [amount, userId],
        )

        // 2. Extend investment: +1 day per earning, +amount to totalEarning
        const extraDays = Math.max(1, Math.round(amount / Math.max(daily, 1)))
        await client.query(
          `UPDATE investment
           SET "durationDays" = "durationDays" + $1,
               "totalEarning"  = "totalEarning"  + $2,
               status = 'active'
           WHERE id = $3`,
          [extraDays, amount, inv.id],
        )

        // 3. Convert the earning tx to reinvest, keeping original createdAt for accurate history
        await client.query(
          `UPDATE transaction
           SET type = 'reinvest',
               description = $1
           WHERE id = $2`,
          [`Earnings reinvested into ${inv.planName}`, earning.id],
        )
      }
    }

    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("[v0] backfillReinvestForUser failed:", err)
  } finally {
    client.release()
  }
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
