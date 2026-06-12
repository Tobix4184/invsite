import { redirect } from "next/navigation"
import { requireAdminOrModerator } from "@/lib/session"
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
  getPromoterCodes,
  getAllInvestments,
  getFinancials,
  getLuckyDrawRounds,
  getAllSpins,
  getAllVaults,
  getAllDrawSlots,
  getGameStats,
} from "@/app/actions/admin"
import { getGameConfig } from "@/app/actions/settings"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  let isModerator = false
  try {
    const result = await requireAdminOrModerator()
    isModerator = result.isModerator
  } catch {
    redirect("/dashboard")
  }

  const [
    stats,
    withdrawals,
    users,
    giftCodes,
    deposits,
    bankAccounts,
    milestones,
    controls,
    transactions,
    promoterCodes,
    investments,
    financials,
    drawRounds,
    spins,
    vaults,
    drawSlots,
    gameStats,
    gameConfig,
  ] = await Promise.all([
    getAdminStats(),
    getPendingWithdrawals(),
    getAdminUsers(),
    getGiftCodes(),
    getRecentDeposits(),
    getBankAccounts(),
    getMilestones(),
    getSiteControls(),
    getAllTransactions({ limit: 100 }),
    getPromoterCodes(),
    getAllInvestments(),
    getFinancials(),
    getLuckyDrawRounds(),
    getAllSpins(),
    getAllVaults(),
    getAllDrawSlots(),
    getGameStats(),
    getGameConfig(),
  ])

  return (
    <AdminDashboard
      isModerator={isModerator}
      stats={stats}
      withdrawals={withdrawals}
      users={users}
      giftCodes={giftCodes}
      deposits={deposits}
      bankAccounts={bankAccounts}
      milestones={milestones}
      controls={controls}
      transactions={transactions}
      promoterCodes={promoterCodes}
      investments={investments}
      financials={financials}
      drawRounds={drawRounds}
      spins={spins}
      vaults={vaults}
      drawSlots={drawSlots}
      gameStats={gameStats}
      gameConfig={gameConfig}
    />
  )
}
