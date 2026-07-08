"use server"

import { db } from "@/lib/db"
import { task, taskSubmission, gameGrant, wallet, transaction, investment, user as userTable, profile } from "@/lib/db/schema"
import { getUserId, requireAdmin } from "@/lib/session"
import { getUserTier } from "@/lib/user-tier"
import { awardPoints } from "@/app/actions/points"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ─── Types ───────────────────────────────────────────────────────────────────

export type Task = typeof task.$inferSelect
export type TaskSubmission = typeof taskSubmission.$inferSelect

// ─── Targeting helper ─────────────────────────────────────────────────────────

/** Whether a task is visible to a user based on its targeting rules. */
async function taskMatchesUser(
  t: Task,
  ctx: { tier: string | null; activePlanIds: number[] },
): Promise<boolean> {
  if (t.targetType === "all" || !t.targetType) return true
  if (t.targetType === "tier") return ctx.tier === t.targetValue
  if (t.targetType === "plan") {
    const pid = Number(t.targetValue)
    return ctx.activePlanIds.includes(pid)
  }
  return true
}

// ─── User actions ────────────────────────────────────────────────────────────

/** Returns published tasks visible to the user, with submission state. */
export async function getTasksForUser() {
  const userId = await getUserId()

  const [tier, activeRows] = await Promise.all([
    getUserTier(userId),
    db
      .select({ planId: investment.planId })
      .from(investment)
      .where(and(eq(investment.userId, userId), eq(investment.status, "active"))),
  ])
  const ctx = { tier, activePlanIds: activeRows.map((r) => r.planId) }

  const tasks = await db
    .select()
    .from(task)
    .where(eq(task.status, "published"))
    .orderBy(desc(task.createdAt))

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

  const visible: (Task & {
    submissions: TaskSubmission[]
    canDo: boolean
    completedCount: number
    pendingCount: number
  })[] = []

  for (const t of tasks) {
    if (!(await taskMatchesUser(t, ctx))) continue
    const done = submissionMap.get(t.id) ?? []
    // Count approved + pending toward the per-user limit so users can't spam
    const counted = done.filter((s) => s.status === "approved" || s.status === "pending").length
    const limit = t.perUserLimit ?? 1
    const canDo = limit === 0 || counted < limit
    visible.push({
      ...t,
      submissions: done,
      canDo,
      completedCount: done.filter((s) => s.status === "approved").length,
      pendingCount: done.filter((s) => s.status === "pending").length,
    })
  }

  return visible
}

/** Returns today's task earnings and total earned by this user. */
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
        sql`submitted_at >= ${today}`,
      ),
    )

  const [allTimeRow] = await db
    .select({ total: sql<number>`coalesce(sum(reward),0)::float` })
    .from(taskSubmission)
    .where(and(eq(taskSubmission.userId, userId), eq(taskSubmission.status, "approved")))

  const [pendingRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(taskSubmission)
    .where(and(eq(taskSubmission.userId, userId), eq(taskSubmission.status, "pending")))

  return {
    todayEarned: todayRow?.total ?? 0,
    totalEarned: allTimeRow?.total ?? 0,
    pendingCount: pendingRow?.c ?? 0,
  }
}

/**
 * Submit a task. Tasks that require proof/approval go to "pending".
 * Tasks with no proof + no approval are credited immediately.
 */
export async function submitTask(
  taskId: number,
  data: Record<string, unknown>,
  proofUrl?: string,
) {
  const userId = await getUserId()

  const [t] = await db.select().from(task).where(eq(task.id, taskId))
  if (!t || t.status !== "published") return { ok: false, message: "Task not available" }

  // Verify targeting
  const [tier, activeRows] = await Promise.all([
    getUserTier(userId),
    db
      .select({ planId: investment.planId })
      .from(investment)
      .where(and(eq(investment.userId, userId), eq(investment.status, "active"))),
  ])
  const matches = await taskMatchesUser(t, { tier, activePlanIds: activeRows.map((r) => r.planId) })
  if (!matches) return { ok: false, message: "This task is not available for your plan." }

  // Per-user limit (count approved + pending)
  if (t.perUserLimit > 0) {
    const [countRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(taskSubmission)
      .where(
        and(
          eq(taskSubmission.userId, userId),
          eq(taskSubmission.taskId, taskId),
          inArray(taskSubmission.status, ["approved", "pending"]),
        ),
      )
    if ((countRow?.c ?? 0) >= t.perUserLimit) {
      return { ok: false, message: "You have already completed this task" }
    }
  }

  if (t.requireProof && !proofUrl) {
    return { ok: false, message: "Please upload the required proof image." }
  }

  const reward = Number(t.reward)
  const needsApproval = t.requireApproval || t.requireProof

  await db.insert(taskSubmission).values({
    userId,
    taskId,
    data: JSON.stringify(data),
    proofUrl: proofUrl ?? null,
    reward: String(reward),
    status: needsApproval ? "pending" : "approved",
    reviewedAt: needsApproval ? null : new Date(),
  })

  if (!needsApproval) {
    await grantTaskRewards(userId, t)
    revalidatePath("/tasks")
    return {
      ok: true,
      message: `Task complete! ${rewardSummary(t)} added to your account.`,
    }
  }

  revalidatePath("/tasks")
  return {
    ok: true,
    message: "Submitted! Your proof is pending admin review. Rewards are credited once approved.",
  }
}

/** Credit all rewards for a task to a user (cash + spins + scratch cards + points). */
async function grantTaskRewards(userId: string, t: Task) {
  const reward = Number(t.reward)
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
  if (t.rewardSpins > 0) {
    await db.insert(gameGrant).values({
      userId,
      kind: "spin",
      amount: t.rewardSpins,
      source: `task:${t.id}`,
    })
  }
  if (t.rewardScratch > 0) {
    await db.insert(gameGrant).values({
      userId,
      kind: "scratch",
      amount: t.rewardScratch,
      source: `task:${t.id}`,
    })
  }
  // Award weekend salary points if the task grants any
  const pts = (t as typeof t & { rewardPoints?: number }).rewardPoints ?? 0
  if (pts > 0) {
    await awardPoints(userId, pts, `Task reward points: ${t.title}`)
  }
}

function rewardSummary(t: Task | { reward: string | number; rewardSpins: number; rewardScratch: number; rewardPoints?: number }) {
  const parts: string[] = []
  const cash = Number(t.reward)
  if (cash > 0) parts.push(`₦${cash.toLocaleString()}`)
  if (t.rewardSpins > 0) parts.push(`${t.rewardSpins} spin${t.rewardSpins > 1 ? "s" : ""}`)
  if (t.rewardScratch > 0) parts.push(`${t.rewardScratch} scratch card${t.rewardScratch > 1 ? "s" : ""}`)
  const pts = (t as { rewardPoints?: number }).rewardPoints ?? 0
  if (pts > 0) parts.push(`${pts.toLocaleString()} pts`)
  return parts.length ? parts.join(" + ") : "Reward"
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
  const pending = await db
    .select({ taskId: taskSubmission.taskId, c: sql<number>`count(*)::int` })
    .from(taskSubmission)
    .where(eq(taskSubmission.status, "pending"))
    .groupBy(taskSubmission.taskId)
  const countMap = new Map(counts.map((r) => [r.taskId, r.c]))
  const pendingMap = new Map(pending.map((r) => [r.taskId, r.c]))
  return tasks.map((t) => ({
    ...t,
    submissionCount: countMap.get(t.id) ?? 0,
    pendingCount: pendingMap.get(t.id) ?? 0,
  }))
}

/** Admin: list submissions (optionally filter by status) with user + task info. */
export async function adminGetSubmissions(status?: "pending" | "approved" | "rejected") {
  await requireAdmin()
  const rows = await db
    .select({
      id: taskSubmission.id,
      userId: taskSubmission.userId,
      taskId: taskSubmission.taskId,
      data: taskSubmission.data,
      proofUrl: taskSubmission.proofUrl,
      reward: taskSubmission.reward,
      status: taskSubmission.status,
      submittedAt: taskSubmission.submittedAt,
      reviewedAt: taskSubmission.reviewedAt,
      taskTitle: task.title,
      rewardSpins: task.rewardSpins,
      rewardScratch: task.rewardScratch,
      userName: userTable.name,
      userEmail: userTable.email,
      userPhone: profile.phone,
    })
    .from(taskSubmission)
    .leftJoin(task, eq(taskSubmission.taskId, task.id))
    .leftJoin(userTable, eq(taskSubmission.userId, userTable.id))
    .leftJoin(profile, eq(taskSubmission.userId, profile.userId))
    .where(status ? eq(taskSubmission.status, status) : undefined)
    .orderBy(desc(taskSubmission.submittedAt))
    .limit(200)
  return rows
}

/** Admin: approve a submission — credits rewards to the user. */
export async function adminApproveSubmission(submissionId: number) {
  await requireAdmin()
  const [s] = await db.select().from(taskSubmission).where(eq(taskSubmission.id, submissionId))
  if (!s) return { ok: false, message: "Submission not found" }
  if (s.status === "approved") return { ok: false, message: "Already approved" }

  const [t] = await db.select().from(task).where(eq(task.id, s.taskId))
  if (!t) return { ok: false, message: "Task not found" }

  await db
    .update(taskSubmission)
    .set({ status: "approved", reviewedAt: new Date() })
    .where(eq(taskSubmission.id, submissionId))

  await grantTaskRewards(s.userId, t)

  revalidatePath("/admin")
  revalidatePath("/tasks")
  return { ok: true, message: `Approved — ${rewardSummary(t)} credited.` }
}

/** Admin: reject a submission (no reward). */
export async function adminRejectSubmission(submissionId: number) {
  await requireAdmin()
  await db
    .update(taskSubmission)
    .set({ status: "rejected", reviewedAt: new Date() })
    .where(eq(taskSubmission.id, submissionId))
  revalidatePath("/admin")
  revalidatePath("/tasks")
  return { ok: true, message: "Submission rejected" }
}

/** Admin: create a new task. */
export async function adminCreateTask(data: {
  title: string
  description: string
  imageUrl?: string
  reward: number
  rewardSpins?: number
  rewardScratch?: number
  rewardPoints?: number
  taskType: string
  fields?: string[]
  targetType?: "all" | "tier" | "plan"
  targetValue?: string | null
  requireProof?: boolean
  proofLabel?: string | null
  requireApproval?: boolean
  perUserLimit: number
}) {
  await requireAdmin()
  await db.insert(task).values({
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl ?? null,
    reward: String(data.reward),
    rewardSpins: data.rewardSpins ?? 0,
    rewardScratch: data.rewardScratch ?? 0,
    rewardPoints: data.rewardPoints ?? 0,
    taskType: data.taskType,
    fields: data.fields ? JSON.stringify(data.fields) : null,
    targetType: data.targetType ?? "all",
    targetValue: data.targetValue ?? null,
    requireProof: data.requireProof ?? false,
    proofLabel: data.proofLabel ?? null,
    requireApproval: data.requireApproval ?? true,
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
    rewardSpins: number
    rewardScratch: number
    rewardPoints: number
    taskType: string
    fields: string[]
    targetType: "all" | "tier" | "plan"
    targetValue: string | null
    requireProof: boolean
    proofLabel: string | null
    requireApproval: boolean
    perUserLimit: number
    status: string
  }>,
) {
  await requireAdmin()
  await db
    .update(task)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.reward !== undefined && { reward: String(data.reward) }),
      ...(data.rewardSpins !== undefined && { rewardSpins: data.rewardSpins }),
      ...(data.rewardScratch !== undefined && { rewardScratch: data.rewardScratch }),
      ...(data.rewardPoints !== undefined && { rewardPoints: data.rewardPoints }),
      ...(data.taskType !== undefined && { taskType: data.taskType }),
      ...(data.fields !== undefined && { fields: JSON.stringify(data.fields) }),
      ...(data.targetType !== undefined && { targetType: data.targetType }),
      ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
      ...(data.requireProof !== undefined && { requireProof: data.requireProof }),
      ...(data.proofLabel !== undefined && { proofLabel: data.proofLabel }),
      ...(data.requireApproval !== undefined && { requireApproval: data.requireApproval }),
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

/**
 * Seeds the three core system tasks if they have not already been created.
 * Safe to call multiple times — uses title uniqueness check.
 */
export async function seedSystemTasks() {
  await requireAdmin()

  const existing = await db.select({ title: task.title }).from(task)
  const titles = new Set(existing.map((r) => r.title))

  const systemTasks = [
    {
      title: "Join Our Telegram Group",
      description:
        "Join the official 247 Incum Telegram group to stay updated with the latest news, bonuses, and announcements. Tap the link and join: https://t.me/incomehh — then come back and submit your Telegram username as proof.",
      reward: 200,
      rewardPoints: 500,
      taskType: "social",
      requireProof: false,
      requireApproval: false,
      proofLabel: null,
      perUserLimit: 1,
    },
    {
      title: "Follow Our Telegram Channel",
      description:
        "Subscribe to our official Telegram channel for daily earnings updates and platform news. Tap here to follow: https://t.me/incomehh — then submit your Telegram username below.",
      reward: 150,
      rewardPoints: 300,
      taskType: "social",
      requireProof: false,
      requireApproval: false,
      proofLabel: null,
      perUserLimit: 1,
    },
    {
      title: "Send Withdrawal Proof to Support",
      description:
        "After receiving your withdrawal, take a screenshot of the credit alert and send it to support on Telegram (@incum247SPT). Upload the screenshot below — this helps us verify payments and unlock future bonuses.",
      reward: 100,
      rewardPoints: 200,
      taskType: "proof",
      requireProof: true,
      requireApproval: true,
      proofLabel: "Screenshot of your withdrawal / credit alert",
      perUserLimit: 10, // can do this multiple times (once per withdrawal)
    },
  ]

  let seeded = 0
  for (const t of systemTasks) {
    if (titles.has(t.title)) continue
    await db.insert(task).values({
      title: t.title,
      description: t.description,
      reward: String(t.reward),
      rewardPoints: t.rewardPoints,
      rewardSpins: 0,
      rewardScratch: 0,
      taskType: t.taskType,
      targetType: "all",
      targetValue: null,
      requireProof: t.requireProof,
      proofLabel: t.proofLabel ?? null,
      requireApproval: t.requireApproval,
      perUserLimit: t.perUserLimit,
      status: "published",
    })
    seeded++
  }

  revalidatePath("/admin")
  revalidatePath("/tasks")
  return { ok: true, seeded, message: seeded > 0 ? `${seeded} task(s) seeded.` : "All system tasks already exist." }
}
