"use server"

import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { wallet, investment, lockVault, luckyDrawSlot, luckyDrawRound } from "@/lib/db/schema"
import { eq, and, desc, gt } from "drizzle-orm"
import { SITE } from "@/lib/plans"
import { getGameConfig } from "@/app/actions/settings"
import { GamesHub } from "@/components/games/games-hub"
import { BottomNav } from "@/components/bottom-nav"

export default async function GamesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  const userId = session.user.id

  // Fetch all data in parallel for speed
  const [w, activeInvestments, vaults, cfg] = await Promise.all([
    db.select().from(wallet).where(eq(wallet.userId, userId)).then((r) => r[0]),
    db.select().from(investment).where(and(eq(investment.userId, userId), eq(investment.status, "active"))),
    db.select().from(lockVault).where(eq(lockVault.userId, userId)).orderBy(desc(lockVault.createdAt)),
    getGameConfig(),
  ])

  const balance = Number(w?.balance ?? 0)
  // Gate: user must have made at least one approved deposit (totalDeposited > 0)
  const hasDeposited = Number(w?.totalDeposited ?? 0) > 0

  const today = new Date().toISOString().slice(0, 10)

  const [round, todaySlots] = await Promise.all([
    db.select().from(luckyDrawRound).where(eq(luckyDrawRound.drawDate, today)).then((r) => r[0] ?? null),
    db.select().from(luckyDrawSlot).where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.drawDate, today))),
  ])

  return (
    <>
      <GamesHub
        balance={balance}
        activeInvestments={activeInvestments.length}
        hasDeposited={hasDeposited}
        today={today}
        round={round}
        todaySlotsCount={todaySlots.length}
        freeSlotsTotal={activeInvestments.length * SITE.luckyDrawFreePerInvestment}
        vaults={vaults}
        features={SITE.features}
        vaultTiers={cfg.vaultTiers}
        stakeMin={cfg.stakeMin}
        stakeMax={cfg.stakeMax}
        slotCost={cfg.luckyDrawSlotCost}
        vaultMin={cfg.vaultMin}
      />
      <BottomNav />
    </>
  )
}
