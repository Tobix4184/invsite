"use server"

import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { wallet, investment, lockVault, luckyDrawSlot, luckyDrawRound } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { SITE } from "@/lib/plans"
import { GamesHub } from "@/components/games/games-hub"
import { BottomNav } from "@/components/bottom-nav"

export default async function GamesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  const userId = session.user.id

  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))
  const balance = Number(w?.balance ?? 0)

  const activeInvestments = await db
    .select()
    .from(investment)
    .where(and(eq(investment.userId, userId), eq(investment.status, "active")))

  const today = new Date().toISOString().slice(0, 10)

  // Today's draw round
  const [round] = await db
    .select()
    .from(luckyDrawRound)
    .where(eq(luckyDrawRound.drawDate, today))

  // User's slots today
  const todaySlots = await db
    .select()
    .from(luckyDrawSlot)
    .where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.drawDate, today)))

  // User's vaults
  const vaults = await db
    .select()
    .from(lockVault)
    .where(eq(lockVault.userId, userId))
    .orderBy(desc(lockVault.createdAt))

  return (
    <>
      <GamesHub
        balance={balance}
        activeInvestments={activeInvestments.length}
        hasInvestment={activeInvestments.length > 0}
        today={today}
        round={round ?? null}
        todaySlotsCount={todaySlots.length}
        freeSlotsTotal={activeInvestments.length * SITE.luckyDrawFreePerInvestment}
        vaults={vaults}
        features={SITE.features}
        vaultTiers={SITE.vaultTiers}
        stakeMin={SITE.stakeMin}
        stakeMax={SITE.stakeMax}
        slotCost={SITE.luckyDrawSlotCost}
      />
      <BottomNav />
    </>
  )
}
