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
} from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { accrueIncomeForAll } from "@/lib/income-engine"
import { desc, eq, sql } from "drizzle-orm"
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
  return db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: profile.role,
      balance: wallet.balance,
      totalDeposited: wallet.totalDeposited,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .leftJoin(profile, eq(userTable.id, profile.userId))
    .leftJoin(wallet, eq(userTable.id, wallet.userId))
    .orderBy(desc(userTable.createdAt))
    .limit(200)
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
  return {
    ok: true,
    message: `Processed ${result.users} users, credited ${result.credited.toLocaleString()} total`,
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
    })
    .where(eq(bankAccount.id, id))
  
  revalidatePath("/admin")
  return { ok: true, message: "Bank account updated" }
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
