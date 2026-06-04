import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getDashboardData } from "@/app/actions/account"
import { db } from "@/lib/db"
import { investment } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { WithdrawForm } from "@/components/withdraw-form"

export const dynamic = "force-dynamic"

export default async function WithdrawPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  
  // Check if user has active investments
  const activeInvestments = await db
    .select()
    .from(investment)
    .where(eq(investment.userId, session.user.id))
    .limit(1)
  
  if (activeInvestments.length === 0) {
    redirect("/products?error=must_invest_first")
  }

  const data = await getDashboardData()

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Withdraw" />
      <WithdrawForm balance={data.balance} />
      <BottomNav />
    </div>
  )
}
