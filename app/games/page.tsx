import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { wallet, investment, luckyDrawSlot, referral } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { getGameConfig } from "@/app/actions/settings"
import { getLuckyDrawState, getRecentDrawWinners, getSpinState } from "@/app/actions/games"
import { GamesHub } from "@/components/games/games-hub"
import { BottomNav } from "@/components/bottom-nav"

export const dynamic = "force-dynamic"

export default async function GamesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  const userId = session.user.id

  const [w, cfg, drawState, recentWinners, spinState] = await Promise.all([
    db.select().from(wallet).where(eq(wallet.userId, userId)).then((r) => r[0]),
    getGameConfig(),
    getLuckyDrawState(),
    getRecentDrawWinners(),
    getSpinState(),
  ])

  const balance = Number(w?.balance ?? 0)
  const hasDeposited = Number(w?.totalDeposited ?? 0) > 0

  // Count active investments (for gating)
  const activeInv = await db
    .select({ id: investment.id })
    .from(investment)
    .where(and(eq(investment.userId, userId), eq(investment.status, "active")))

  // Referral bonus slots available = qualifying referrals - claimed referral slots
  const qualifying = await db
    .select({ id: referral.id })
    .from(referral)
    .where(and(eq(referral.referrerId, userId), sql`${referral.totalCommission} > 0`))

  const claimedReferral = await db
    .select({ id: luckyDrawSlot.id })
    .from(luckyDrawSlot)
    .where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.source, "referral")))

  const referralSlotsAvailable = Math.max(0, qualifying.length - claimedReferral.length)

  return (
    <>
      <GamesHub
        balance={balance}
        hasDeposited={hasDeposited}
        activeInvestments={activeInv.length}
        today={drawState.today}
        round={drawState.round}
        todaySlotsCount={drawState.slotsEntered}
        freeSlotsRemaining={drawState.freeSlotsRemaining}
        hasActiveInvestment={drawState.hasActiveInvestment}
        referralSlotsAvailable={referralSlotsAvailable}
        recentWinners={recentWinners}
        spinsAvailable={spinState.spinsAvailable}
        slotCost={cfg.luckyDrawSlotCost}
        spinPrizes={cfg.spinPrizes}
      />
      <BottomNav />
    </>
  )
}
