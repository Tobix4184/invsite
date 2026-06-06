"use server"

import { db } from "@/lib/db"
import {
  withdrawal,
  wallet,
  transaction,
  user as userTable,
  profile,
  deposit,
  giftCode,
  investment,
  bankAccount,
  referral,
  referralMilestone,
  milestoneClaim,
  promoterCode,
} from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { accrueIncomeForAll } from "@/lib/income-engine"
import { getPauseFlags, setSetting, SETTING_KEYS } from "@/app/actions/settings"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getAdminStats() {
  await requireAdmin()
  const [users] = await db.select({ c: sql<number>`count(*)::int` }).from(userTable)
  const [deposited] = await db
    .select({ s: sql<number>`coalesce(sum("totalDeposited"),0)::float` })
    .from(wallet)
  const [withdrawn] = await db
    .select({ s: sql<number>`coalesce(sum("totalWithdrawn"),0)::float` })
    .from(wallet)
  const [balances] = await db
    .select({ s: sql<number>`coalesce(sum(balance),0)::float` })
    .from(wallet)
  const [activeInv] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(investment)
    .where(eq(investment.status, "active"))
  const [pendingW] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(withdrawal)
    .where(eq(withdrawal.status, "pending"))

  return {
    users: users?.c ?? 0,
    totalDeposited: deposited?.s ?? 0,
    totalWithdrawn: withdrawn?.s ?? 0,
    totalBalance: balances?.s ?? 0,
    activeInvestments: activeInv?.c ?? 0,
    pendingWithdrawals: pendingW?.c ?? 0,
  }
}

export async function getPendingWithdrawals() {
  await requireAdmin()
  return db
    .select({
      id: withdrawal.id,
      userId: withdrawal.userId,
      amount: withdrawal.amount,
      charge: withdrawal.charge,
      netAmount: withdrawal.netAmount,
      bankName: withdrawal.bankName,
      accountNumber: withdrawal.accountNumber,
      accountName: withdrawal.accountName,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      userName: userTable.name,
      userEmail: userTable.email,
    })
    .from(withdrawal)
    .leftJoin(userTable, eq(withdrawal.userId, userTable.id))
    .orderBy(desc(withdrawal.createdAt))
    .limit(100)
}

export async function approveWithdrawal(id: number) {
  await requireAdmin()
  const [w] = await db.select().from(withdrawal).where(eq(withdrawal.id, id))
  if (!w || w.status !== "pending") return { ok: false, message: "Not a pending withdrawal" }

  await db
    .update(withdrawal)
    .set({ status: "approved", processedAt: new Date() })
    .where(eq(withdrawal.id, id))
  await db
    .update(wallet)
    .set({ totalWithdrawn: sql`${wallet.totalWithdrawn} + ${Number(w.amount)}`, updatedAt: new Date() })
    .where(eq(wallet.userId, w.userId))
  await db
    .update(transaction)
    .set({ status: "completed" })
    .where(eq(transaction.userId, w.userId))

  revalidatePath("/admin")
  return { ok: true, message: "Withdrawal approved" }
}

export async function rejectWithdrawal(id: number) {
  await requireAdmin()
  const [w] = await db.select().from(withdrawal).where(eq(withdrawal.id, id))
  if (!w || w.status !== "pending") return { ok: false, message: "Not a pending withdrawal" }

  // refund the held amount
  await db
    .update(withdrawal)
    .set({ status: "rejected", processedAt: new Date() })
    .where(eq(withdrawal.id, id))
  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} + ${Number(w.amount)}`, updatedAt: new Date() })
    .where(eq(wallet.userId, w.userId))
  await db.insert(transaction).values({
    userId: w.userId,
    type: "refund",
    amount: String(w.amount),
    description: "Withdrawal rejected - amount refunded",
  })

  revalidatePath("/admin")
  return { ok: true, message: "Withdrawal rejected and refunded" }
}

export async function getAdminUsers() {
  await requireAdmin()
  
  const users = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: profile.role,
      isPromoter: profile.isPromoter,
      promoterCommission: profile.promoterCommission,
      balance: wallet.balance,
      totalDeposited: wallet.totalDeposited,
      referralEarnings: wallet.referralEarnings,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .leftJoin(profile, eq(userTable.id, profile.userId))
    .leftJoin(wallet, eq(userTable.id, wallet.userId))
    .orderBy(desc(userTable.createdAt))
    .limit(200)
  
  const referralCounts = await db
    .select({
      referrerId: referral.referrerId,
      count: sql<number>`count(*)::int`,
    })
    .from(referral)
    .where(eq(referral.level, 1))
    .groupBy(referral.referrerId)
  
  const countMap = new Map(referralCounts.map(r => [r.referrerId, r.count]))
  
  return users.map(u => ({
    ...u,
    referralCount: countMap.get(u.id) || 0,
  }))
}

export async function adjustBalance(userId: string, amount: number, note: string) {
  await requireAdmin()
  const amt = Number(amount)
  if (!amt) return { ok: false, message: "Enter a non-zero amount" }
  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} + ${amt}`, updatedAt: new Date() })
    .where(eq(wallet.userId, userId))
  await db.insert(transaction).values({
    userId,
    type: amt > 0 ? "credit" : "debit",
    amount: String(Math.abs(amt)),
    description: note || "Admin balance adjustment",
  })
  revalidatePath("/admin")
  return { ok: true, message: "Balance adjusted" }
}

export async function createGiftCode(data: { code: string; amount: number; maxUses: number }) {
  await requireAdmin()
  const code = data.code.trim().toUpperCase()
  if (!code || !data.amount) return { ok: false, message: "Enter a code and amount" }
  const exists = await db.select().from(giftCode).where(eq(giftCode.code, code))
  if (exists.length > 0) return { ok: false, message: "Code already exists" }
  await db.insert(giftCode).values({
    code,
    amount: String(data.amount),
    maxUses: data.maxUses || 1,
  })
  revalidatePath("/admin")
  return { ok: true, message: `Gift code ${code} created` }
}

export async function getGiftCodes() {
  await requireAdmin()
  return db.select().from(giftCode).orderBy(desc(giftCode.createdAt)).limit(100)
}

export async function getRecentDeposits() {
  await requireAdmin()
  return db
    .select({
      id: deposit.id,
      amount: deposit.amount,
      reference: deposit.reference,
      status: deposit.status,
      createdAt: deposit.createdAt,
      userEmail: userTable.email,
      senderName: deposit.senderName,
      assignedBankName: deposit.assignedBankName,
      assignedAccountNumber: deposit.assignedAccountNumber,
      assignedAccountName: deposit.assignedAccountName,
    })
    .from(deposit)
    .leftJoin(userTable, eq(deposit.userId, userTable.id))
    .orderBy(desc(deposit.createdAt))
    .limit(50)
}

/** Admin: process daily income for all users with active investments. */
export async function processAllIncome() {
  await requireAdmin()
  const result = await accrueIncomeForAll()
  revalidatePath("/admin")
  
  if (result.credited === 0) {
    return {
      ok: true,
      message: `Found ${result.users} user(s) with active investments. No payments due yet (income is paid every 24 hours from investment time).`,
    }
  }
  
  return {
    ok: true,
    message: `Processed ${result.users} users, credited ₦${result.credited.toLocaleString()} total`,
  }
}

// ===================== BANK ACCOUNT MANAGEMENT =====================

export async function getBankAccounts() {
  await requireAdmin()
  return db
    .select()
    .from(bankAccount)
    .orderBy(desc(bankAccount.createdAt))
}

export async function addBankAccount(data: {
  accountNumber: string
  bankName: string
  accountName: string
  label?: string
  weight?: number
}) {
  await requireAdmin()
  const accNum = data.accountNumber.trim()
  if (!accNum || !data.bankName || !data.accountName) {
    return { ok: false, message: "All fields are required" }
  }
  
  // Check if account number already exists
  const exists = await db
    .select()
    .from(bankAccount)
    .where(eq(bankAccount.accountNumber, accNum))
  if (exists.length > 0) {
    return { ok: false, message: "Account number already exists" }
  }
  
  await db.insert(bankAccount).values({
    accountNumber: accNum,
    bankName: data.bankName.trim(),
    accountName: data.accountName.trim(),
    label: data.label?.trim() || null,
    weight: Math.max(1, Math.floor(Number(data.weight) || 1)),
    isActive: true,
  })
  
  revalidatePath("/admin")
  return { ok: true, message: "Bank account added" }
}

export async function updateBankAccount(
  id: number,
  data: {
    accountNumber?: string
    bankName?: string
    accountName?: string
    label?: string
    isActive?: boolean
    weight?: number
  }
) {
  await requireAdmin()
  
  const [existing] = await db
    .select()
    .from(bankAccount)
    .where(eq(bankAccount.id, id))
  if (!existing) {
    return { ok: false, message: "Bank account not found" }
  }
  
  await db
    .update(bankAccount)
    .set({
      accountNumber: data.accountNumber?.trim() ?? existing.accountNumber,
      bankName: data.bankName?.trim() ?? existing.bankName,
      accountName: data.accountName?.trim() ?? existing.accountName,
      label: data.label?.trim() ?? existing.label,
      isActive: data.isActive ?? existing.isActive,
      weight: data.weight != null ? Math.max(1, Math.floor(Number(data.weight))) : existing.weight,
    })
    .where(eq(bankAccount.id, id))
  
  revalidatePath("/admin")
  return { ok: true, message: "Bank account updated" }
}

/** Admin: set just the display weight for an account (higher = shown more often). */
export async function setBankAccountWeight(id: number, weight: number) {
  await requireAdmin()
  const w = Math.max(1, Math.floor(Number(weight) || 1))
  await db.update(bankAccount).set({ weight: w }).where(eq(bankAccount.id, id))
  revalidatePath("/admin")
  return { ok: true, message: `Display weight set to ${w}` }
}

export async function deleteBankAccount(id: number) {
  await requireAdmin()
  
  const [existing] = await db
    .select()
    .from(bankAccount)
    .where(eq(bankAccount.id, id))
  if (!existing) {
    return { ok: false, message: "Bank account not found" }
  }
  
  await db.delete(bankAccount).where(eq(bankAccount.id, id))
  
  revalidatePath("/admin")
  return { ok: true, message: "Bank account deleted" }
}

export async function toggleBankAccountStatus(id: number) {
  await requireAdmin()
  
  const [existing] = await db
    .select()
    .from(bankAccount)
    .where(eq(bankAccount.id, id))
  if (!existing) {
    return { ok: false, message: "Bank account not found" }
  }
  
  await db
    .update(bankAccount)
    .set({ isActive: !existing.isActive })
    .where(eq(bankAccount.id, id))
  
  revalidatePath("/admin")
  return { ok: true, message: existing.isActive ? "Account deactivated" : "Account activated" }
}

export async function getAccountDeposits(accountId: number) {
  await requireAdmin()
  return db
    .select({
      id: deposit.id,
      amount: deposit.amount,
      reference: deposit.reference,
      status: deposit.status,
      createdAt: deposit.createdAt,
      userEmail: userTable.email,
      senderName: deposit.senderName,
    })
    .from(deposit)
    .leftJoin(userTable, eq(deposit.userId, userTable.id))
    .where(eq(deposit.bankAccountId, accountId))
    .orderBy(desc(deposit.createdAt))
    .limit(100)
}

// ===================== PROMOTER MANAGEMENT =====================

export async function togglePromoter(userId: string) {
  await requireAdmin()
  const [p] = await db.select().from(profile).where(eq(profile.userId, userId))
  if (!p) return { ok: false, message: "User not found" }
  
  await db
    .update(profile)
    .set({ isPromoter: !p.isPromoter })
    .where(eq(profile.userId, userId))
  
  revalidatePath("/admin")
  return { ok: true, message: p.isPromoter ? "Promoter status removed" : "User is now a promoter (40% L1 commission)" }
}

// ===================== MILESTONE MANAGEMENT =====================

export async function getMilestones() {
  await requireAdmin()
  return db.select().from(referralMilestone).orderBy(referralMilestone.referralCount)
}

export async function createMilestone(data: { referralCount: number; rewardAmount: number }) {
  await requireAdmin()
  if (!data.referralCount || !data.rewardAmount) {
    return { ok: false, message: "Referral count and reward amount are required" }
  }
  
  const exists = await db.select().from(referralMilestone).where(eq(referralMilestone.referralCount, data.referralCount))
  if (exists.length > 0) {
    return { ok: false, message: "A milestone with this referral count already exists" }
  }
  
  await db.insert(referralMilestone).values({
    referralCount: data.referralCount,
    rewardAmount: String(data.rewardAmount),
    isActive: true,
  })
  
  revalidatePath("/admin")
  return { ok: true, message: `Milestone created: ${data.referralCount} referrals = ₦${data.rewardAmount.toLocaleString()}` }
}

export async function updateMilestone(id: number, data: { referralCount?: number; rewardAmount?: number; isActive?: boolean }) {
  await requireAdmin()
  const [existing] = await db.select().from(referralMilestone).where(eq(referralMilestone.id, id))
  if (!existing) return { ok: false, message: "Milestone not found" }
  
  await db
    .update(referralMilestone)
    .set({
      referralCount: data.referralCount ?? existing.referralCount,
      rewardAmount: data.rewardAmount ? String(data.rewardAmount) : existing.rewardAmount,
      isActive: data.isActive ?? existing.isActive,
    })
    .where(eq(referralMilestone.id, id))
  
  revalidatePath("/admin")
  return { ok: true, message: "Milestone updated" }
}

export async function deleteMilestone(id: number) {
  await requireAdmin()
  await db.delete(referralMilestone).where(eq(referralMilestone.id, id))
  revalidatePath("/admin")
  return { ok: true, message: "Milestone deleted" }
}

export async function toggleMilestoneStatus(id: number) {
  await requireAdmin()
  const [existing] = await db.select().from(referralMilestone).where(eq(referralMilestone.id, id))
  if (!existing) return { ok: false, message: "Milestone not found" }
  
  await db
    .update(referralMilestone)
    .set({ isActive: !existing.isActive })
    .where(eq(referralMilestone.id, id))
  
  revalidatePath("/admin")
  return { ok: true, message: existing.isActive ? "Milestone deactivated" : "Milestone activated" }
}

// ===================== SITE SETTINGS (PAUSE TOGGLES) =====================

export async function getSiteControls() {
  await requireAdmin()
  return getPauseFlags()
}

export async function setDepositsPaused(paused: boolean) {
  await requireAdmin()
  await setSetting(SETTING_KEYS.depositsPaused, paused ? "true" : "false")
  revalidatePath("/admin")
  return { ok: true, message: paused ? "Deposits paused" : "Deposits resumed" }
}

export async function setWithdrawalsPaused(paused: boolean) {
  await requireAdmin()
  await setSetting(SETTING_KEYS.withdrawalsPaused, paused ? "true" : "false")
  revalidatePath("/admin")
  return { ok: true, message: paused ? "Withdrawals paused" : "Withdrawals resumed" }
}

// ===================== TRANSACTIONS FEED =====================

/** Admin: site-wide transaction feed, optionally filtered by type. */
export async function getAllTransactions(opts?: { type?: string; limit?: number }) {
  await requireAdmin()
  const limit = Math.min(opts?.limit ?? 100, 500)
  const where = opts?.type && opts.type !== "all" ? eq(transaction.type, opts.type) : undefined

  return db
    .select({
      id: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      description: transaction.description,
      reference: transaction.reference,
      createdAt: transaction.createdAt,
      userName: userTable.name,
      userEmail: userTable.email,
    })
    .from(transaction)
    .leftJoin(userTable, eq(transaction.userId, userTable.id))
    .where(where)
    .orderBy(desc(transaction.createdAt))
    .limit(limit)
}

// ===================== PROMOTER CODES =====================

function genPromoCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let s = "PROMO"
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function getPromoterCodes() {
  await requireAdmin()
  return db.select().from(promoterCode).orderBy(desc(promoterCode.createdAt)).limit(100)
}

export async function createPromoterCode(data: {
  code?: string
  label?: string
  maxSignups?: number | null
  commissionRate?: number | null
}) {
  await requireAdmin()

  let code = data.code?.trim().toUpperCase().replace(/\s+/g, "")
  if (code) {
    const exists = await db.select().from(promoterCode).where(eq(promoterCode.code, code))
    if (exists.length > 0) return { ok: false, message: "That code already exists" }
  } else {
    code = genPromoCode()
    for (let i = 0; i < 5; i++) {
      const clash = await db.select().from(promoterCode).where(eq(promoterCode.code, code!))
      if (clash.length === 0) break
      code = genPromoCode()
    }
  }

  // Validate commissionRate 1-100
  const commission = data.commissionRate != null ? Math.min(100, Math.max(1, Math.round(data.commissionRate))) : null
  const maxSignups = data.maxSignups != null ? Math.max(1, Math.round(data.maxSignups)) : null

  await db.insert(promoterCode).values({
    code: code!,
    label: data.label?.trim() || null,
    isActive: true,
    maxSignups,
    commissionRate: commission,
  })

  revalidatePath("/admin")
  return { ok: true, message: `Promoter code ${code} created` }
}

export async function updatePromoterCode(id: number, data: { maxSignups?: number | null; commissionRate?: number | null; label?: string | null }) {
  await requireAdmin()
  const [existing] = await db.select().from(promoterCode).where(eq(promoterCode.id, id))
  if (!existing) return { ok: false, message: "Code not found" }

  const commission = data.commissionRate != null ? Math.min(100, Math.max(1, Math.round(data.commissionRate))) : null
  const maxSignups = data.maxSignups != null ? Math.max(1, Math.round(data.maxSignups)) : null

  await db.update(promoterCode).set({
    label: data.label !== undefined ? (data.label?.trim() || null) : existing.label,
    maxSignups: data.maxSignups !== undefined ? maxSignups : existing.maxSignups,
    commissionRate: data.commissionRate !== undefined ? commission : existing.commissionRate,
  }).where(eq(promoterCode.id, id))

  revalidatePath("/admin")
  return { ok: true, message: "Code updated" }
}

export async function setPromoterCommission(userId: string, rate: number | null) {
  await requireAdmin()
  const [p] = await db.select().from(profile).where(eq(profile.userId, userId))
  if (!p) return { ok: false, message: "User not found" }
  if (!p.isPromoter) return { ok: false, message: "User is not a promoter" }

  const commission = rate != null ? Math.min(100, Math.max(1, Math.round(rate))) : null
  await db.update(profile).set({ promoterCommission: commission }).where(eq(profile.userId, userId))

  revalidatePath("/admin")
  return { ok: true, message: commission != null ? `Commission set to ${commission}%` : "Commission reset to default" }
}

export async function togglePromoterCode(id: number) {
  await requireAdmin()
  const [existing] = await db.select().from(promoterCode).where(eq(promoterCode.id, id))
  if (!existing) return { ok: false, message: "Code not found" }

  await db.update(promoterCode).set({ isActive: !existing.isActive }).where(eq(promoterCode.id, id))
  revalidatePath("/admin")
  return { ok: true, message: existing.isActive ? "Code deactivated" : "Code activated" }
}

export async function deletePromoterCode(id: number) {
  await requireAdmin()
  await db.delete(promoterCode).where(eq(promoterCode.id, id))
  revalidatePath("/admin")
  return { ok: true, message: "Promoter code deleted" }
}
