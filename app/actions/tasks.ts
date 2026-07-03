"use server"

import { db } from "@/lib/db"
import { task, taskSubmission, wallet, transaction } from "@/lib/db/schema"
import { getUserId, requireAdmin } from "@/lib/session"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ─── Types ───────────────────────────────────────────────────────────────────

export type Task = typeof task.$inferSelect
export type TaskSubmission = typeof taskSubmission.$inferSelect

// ─── User actions ────────────────────────────────────────────────────────────

/** Returns all published tasks with whether the current user has completed them. */
export async function getTasksForUser() {
  const userId = await getUserId()

  const tasks = await db
    .select()
    .from(task)
    .where(eq(task.status, "published"))
    .orderBy(desc(task.createdAt))

  // Fetch user's submissions for these tasks
  const submissions = await db
    .select()
    .from(taskSubmission)
    .where(eq(taskSubmission.userId, userId))

  const submissionMap = new Map<number, TaskSubmission[]>()
  for (const s of submissions) {
    const arr = submissionMap.get(s.taskId) ?? []
    arr.push(s)
    submissionMap.set(s.taskId, arr)
  }

  return tasks.map((t) => {
    const done = submissionMap.get(t.id) ?? []
    const limit = t.perUserLimit ?? 1
    const canDo = limit === 0 || done.length < limit
    return { ...t, submissions: done, canDo, completedCount: done.length }
  })
}

/** Returns today's task commission and total earned by this user. */
export async function getTaskStats() {
  const userId = await getUserId()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [todayRow] = await db
    .select({ total: sql<number>`coalesce(sum(reward),0)::float` })
    .from(taskSubmission)
    .where(
      and(
        eq(taskSubmission.userId, userId),
        eq(taskSubmission.status, "approved"),
        sql`submitted_at >= ${today}`
      )
    )

  const [allTimeRow] = await db
    .select({ total: sql<number>`coalesce(sum(reward),0)::float` })
    .from(taskSubmission)
    .where(and(eq(taskSubmission.userId, userId), eq(taskSubmission.status, "approved")))

  return {
    todayEarned: todayRow?.total ?? 0,
    totalEarned: allTimeRow?.total ?? 0,
  }
}

/** Submit a completed task. Credits reward to wallet immediately on approval. */
export async function submitTask(taskId: number, data: Record<string, unknown>) {
  const userId = await getUserId()

  const [t] = await db.select().from(task).where(eq(task.id, taskId))
  if (!t || t.status !== "published") return { ok: false, message: "Task not available" }

  // Check per-user limit
  if (t.perUserLimit > 0) {
    const [countRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(taskSubmission)
      .where(and(eq(taskSubmission.userId, userId), eq(taskSubmission.taskId, taskId)))
    if ((countRow?.c ?? 0) >= t.perUserLimit) {
      return { ok: false, message: "You have already completed this task" }
    }
  }

  const reward = Number(t.reward)

  await db.insert(taskSubmission).values({
    userId,
    taskId,
    data: JSON.stringify(data),
    reward: String(reward),
    status: "approved",
  })

  // Credit wallet immediately
  if (reward > 0) {
    await db
      .update(wallet)
      .set({
        balance: sql`${wallet.balance} + ${reward}`,
        totalEarned: sql`${wallet.totalEarned} + ${reward}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.userId, userId))

    await db.insert(transaction).values({
      userId,
      type: "task_reward",
      amount: String(reward),
      description: `Task reward: ${t.title}`,
    })
  }

  revalidatePath("/tasks")
  return { ok: true, message: `Task complete! ₦${reward.toLocaleString()} credited to your wallet.` }
}

// ─── Admin actions ───────────────────────────────────────────────────────────

/** Admin: fetch all tasks (all statuses) with submission counts. */
export async function adminGetTasks() {
  await requireAdmin()
  const tasks = await db.select().from(task).orderBy(desc(task.createdAt))
  const counts = await db
    .select({ taskId: taskSubmission.taskId, c: sql<number>`count(*)::int` })
    .from(taskSubmission)
    .groupBy(taskSubmission.taskId)
  const countMap = new Map(counts.map((r) => [r.taskId, r.c]))
  return tasks.map((t) => ({ ...t, submissionCount: countMap.get(t.id) ?? 0 }))
}

/** Admin: create a new task. */
export async function adminCreateTask(data: {
  title: string
  description: string
  imageUrl?: string
  reward: number
  taskType: string
  fields?: string[]
  perUserLimit: number
}) {
  await requireAdmin()
  await db.insert(task).values({
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl ?? null,
    reward: String(data.reward),
    taskType: data.taskType,
    fields: data.fields ? JSON.stringify(data.fields) : null,
    perUserLimit: data.perUserLimit,
    status: "published",
  })
  revalidatePath("/admin")
  revalidatePath("/tasks")
  return { ok: true }
}

/** Admin: update an existing task. */
export async function adminUpdateTask(
  taskId: number,
  data: Partial<{
    title: string
    description: string
    imageUrl: string
    reward: number
    taskType: string
    fields: string[]
    perUserLimit: number
    status: string
  }>
) {
  await requireAdmin()
  await db
    .update(task)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.reward !== undefined && { reward: String(data.reward) }),
      ...(data.taskType !== undefined && { taskType: data.taskType }),
      ...(data.fields !== undefined && { fields: JSON.stringify(data.fields) }),
      ...(data.perUserLimit !== undefined && { perUserLimit: data.perUserLimit }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .where(eq(task.id, taskId))
  revalidatePath("/admin")
  revalidatePath("/tasks")
  return { ok: true }
}

/** Admin: set task status (published / paused / deleted). */
export async function adminSetTaskStatus(taskId: number, status: "published" | "paused" | "deleted") {
  await requireAdmin()
  await db.update(task).set({ status }).where(eq(task.id, taskId))
  revalidatePath("/admin")
  revalidatePath("/tasks")
  return { ok: true }
}
