import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { db } from "@/lib/db"
import { wallet, investment } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { accrueIncomeForUser } from "@/lib/income-engine"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // Run income accrual so balance is always up-to-date
  await accrueIncomeForUser(userId)

  const [[w], investments] = await Promise.all([
    db.select().from(wallet).where(eq(wallet.userId, userId)),
    db
      .select()
      .from(investment)
      .where(and(eq(investment.userId, userId), eq(investment.status, "active"))),
  ])

  const todayIncome = investments.reduce(
    (sum, inv) => sum + Number(inv.dailyEarning),
    0,
  )

  return NextResponse.json({
    balance: Number(w?.balance ?? 0),
    todayIncome,
    investments: investments.map((inv) => ({
      id: inv.id,
      planName: inv.planName,
      dailyEarning: inv.dailyEarning,
      amountEarned: inv.amountEarned,
      totalEarning: inv.totalEarning,
      daysPaid: inv.daysPaid,
      durationDays: inv.durationDays,
      status: inv.status,
      autoReinvest: inv.autoReinvest,
      lastPayoutAt: inv.lastPayoutAt,
    })),
  })
}
