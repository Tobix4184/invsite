import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import {
  getAdminStats,
  getPendingWithdrawals,
  getAdminUsers,
  getGiftCodes,
  getRecentDeposits,
  getBankAccounts,
  getMilestones,
  getSiteControls,
  getAllTransactions,
} from "@/app/actions/admin"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const [p] = await db.select().from(profile).where(eq(profile.userId, session.user.id))
  if (!p || p.role !== "admin") redirect("/dashboard")

  const [stats, withdrawals, users, giftCodes, deposits, bankAccounts, milestones, controls, transactions] =
    await Promise.all([
      getAdminStats(),
      getPendingWithdrawals(),
      getAdminUsers(),
      getGiftCodes(),
      getRecentDeposits(),
      getBankAccounts(),
      getMilestones(),
      getSiteControls(),
      getAllTransactions({ limit: 100 }),
    ])

  return (
    <AdminDashboard
      stats={stats}
      withdrawals={withdrawals}
      users={users}
      giftCodes={giftCodes}
      deposits={deposits}
      bankAccounts={bankAccounts}
      milestones={milestones}
      controls={controls}
      transactions={transactions}
    />
  )
}
