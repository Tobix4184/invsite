import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { task, taskSubmission } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { eq, and, sql, notInArray } from "drizzle-orm"

export async function GET() {
  try {
    const userId = await getUserId()

    // IDs of tasks the user has already submitted (any status)
    const done = await db
      .select({ taskId: taskSubmission.taskId })
      .from(taskSubmission)
      .where(eq(taskSubmission.userId, userId))

    const doneIds = [...new Set(done.map((r) => r.taskId))]

    const query = db
      .select({ count: sql<number>`count(*)::int` })
      .from(task)
      .where(eq(task.status, "published"))

    const [row] = doneIds.length > 0
      ? await db
          .select({ count: sql<number>`count(*)::int` })
          .from(task)
          .where(and(eq(task.status, "published"), notInArray(task.id, doneIds)))
      : await query

    return NextResponse.json({ count: row?.count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
