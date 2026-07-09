import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { task, taskSubmission, withdrawal } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { and, eq, sql } from "drizzle-orm"

export async function GET() {
  try {
    const userId = await getUserId()

    const [tasks, submissions, withdrawalRow] = await Promise.all([
      db.select().from(task).where(eq(task.status, "published")),
      db.select().from(taskSubmission).where(eq(taskSubmission.userId, userId)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(withdrawal)
        .where(eq(withdrawal.userId, userId))
        .then((r) => r[0]),
    ])

    const withdrawalCount = Number(withdrawalRow?.c ?? 0)

    // Build a map of taskId -> { approved+pending count }
    const countMap = new Map<number, number>()
    for (const s of submissions) {
      if (s.status === "approved" || s.status === "pending") {
        countMap.set(s.taskId, (countMap.get(s.taskId) ?? 0) + 1)
      }
    }

    let pending = 0
    for (const t of tasks) {
      const counted = countMap.get(t.id) ?? 0
      if (t.taskType === "withdrawal_proof") {
        if (withdrawalCount > 0 && counted < withdrawalCount) pending++
      } else {
        const limit = t.perUserLimit ?? 1
        if (limit === 0 || counted < limit) pending++
      }
    }

    return NextResponse.json({ count: pending })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
