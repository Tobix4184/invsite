"use server"

import { db } from "@/lib/db"
import {
  promoterSalary,
  salaryPayment,
  wallet,
  transaction,
  profile,
  user as userTable,
} from "@/lib/db/schema"
import { getUserId, requireAdmin } from "@/lib/session"
import { desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/** User-facing: fetch the signed-in promoter's salary + recent payments */
export async function getMySalary() {
  const userId = await getUserId()
  const [sal] = await db.select().from(promoterSalary).where(eq(promoterSalary.userId, userId))
  if (!sal) return null
  const payments = await db
    .select()
    .from(salaryPayment)
    .where(eq(salaryPayment.userId, userId))
    .orderBy(desc(salaryPayment.paidAt))
    .limit(10)
  const [{ total }] = await db
    .select({ total: sql<number>`coalesce(sum(amount),0)::float` })
    .from(salaryPayment)
    .where(eq(salaryPayment.userId, userId))
  return {
    weeklyAmount: Number(sal.weeklyAmount),
    isActive: sal.isActive,
    lastPaidAt: sal.lastPaidAt,
    totalPaid: Number(total),
    payments,
  }
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function listPromoterSalaries() {
  await requireAdmin()
  return db
    .select({
      id: promoterSalary.id,
      userId: promoterSalary.userId,
      weeklyAmount: promoterSalary.weeklyAmount,
      isActive: promoterSalary.isActive,
      note: promoterSalary.note,
      lastPaidAt: promoterSalary.lastPaidAt,
      userName: userTable.name,
      userEmail: userTable.email,
      userPhone: profile.phone,
      isPromoter: profile.isPromoter,
    })
    .from(promoterSalary)
    .leftJoin(userTable, eq(promoterSalary.userId, userTable.id))
    .leftJoin(profile, eq(promoterSalary.userId, profile.userId))
    .orderBy(desc(promoterSalary.createdAt))
}

/** Create or update a promoter's weekly salary. Also flags the user as a promoter. */
export async function setPromoterSalary(input: {
  identifier: string
  weeklyAmount: number
  note?: string
}) {
  await requireAdmin()
  const id = input.identifier.trim()
  const amount = Math.max(0, Math.round(Number(input.weeklyAmount) || 0))
  if (!id) return { ok: false, message: "Enter the promoter's phone or email" }

  // Resolve by email first, then by phone number
  let u: { id: string; name: string | null } | undefined
  if (id.includes("@")) {
    ;[u] = await db.select().from(userTable).where(eq(userTable.email, id.toLowerCase()))
  } else {
    const digits = id.replace(/[^\d]/g, "")
    const [p] = await db.select().from(profile).where(eq(profile.phone, digits))
    if (p) [u] = await db.select().from(userTable).where(eq(userTable.id, p.userId))
  }
  if (!u) return { ok: false, message: "No user with that phone or email" }

  await db.update(profile).set({ isPromoter: true }).where(eq(profile.userId, u.id))

  const [existing] = await db.select().from(promoterSalary).where(eq(promoterSalary.userId, u.id))
  if (existing) {
    await db
      .update(promoterSalary)
      .set({ weeklyAmount: String(amount), note: input.note ?? existing.note, isActive: true })
      .where(eq(promoterSalary.userId, u.id))
  } else {
    await db.insert(promoterSalary).values({
      userId: u.id,
      weeklyAmount: String(amount),
      note: input.note,
    })
  }
  revalidatePath("/admin")
  return { ok: true, message: `Salary set to ₦${amount.toLocaleString()}/week for ${u.name}` }
}

export async function togglePromoterSalary(userId: string, isActive: boolean) {
  await requireAdmin()
  await db.update(promoterSalary).set({ isActive }).where(eq(promoterSalary.userId, userId))
  revalidatePath("/admin")
  return { ok: true }
}

/** Pay a single promoter their weekly salary into their wallet. */
export async function payPromoterSalary(userId: string) {
  await requireAdmin()
  const [sal] = await db.select().from(promoterSalary).where(eq(promoterSalary.userId, userId))
  if (!sal || !sal.isActive) return { ok: false, message: "No active salary for this promoter" }
  const amount = Math.round(Number(sal.weeklyAmount))
  if (amount <= 0) return { ok: false, message: "Salary amount is zero" }

  await creditSalary(userId, amount)
  revalidatePath("/admin")
  return { ok: true, message: `Paid ₦${amount.toLocaleString()} salary` }
}

/** Pay every active promoter their weekly salary. */
export async function payAllSalaries() {
  await requireAdmin()
  const rows = await db.select().from(promoterSalary).where(eq(promoterSalary.isActive, true))
  let count = 0
  let total = 0
  for (const sal of rows) {
    const amount = Math.round(Number(sal.weeklyAmount))
    if (amount <= 0) continue
    await creditSalary(sal.userId, amount)
    count++
    total += amount
  }
  revalidatePath("/admin")
  return { ok: true, message: `Paid ${count} promoter(s) a total of ₦${total.toLocaleString()}` }
}

async function creditSalary(userId: string, amount: number) {
  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${amount}`,
      totalEarned: sql`${wallet.totalEarned} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, userId))
  await db.insert(salaryPayment).values({ userId, amount: String(amount), note: "Weekly salary" })
  await db.update(promoterSalary).set({ lastPaidAt: new Date() }).where(eq(promoterSalary.userId, userId))
  await db.insert(transaction).values({
    userId,
    type: "salary",
    amount: String(amount),
    description: "Promoter weekly salary",
  })
}
