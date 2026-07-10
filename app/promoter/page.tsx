import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getMySalary } from "@/app/actions/salary"
import { getDashboardData } from "@/app/actions/account"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { PromoterDashboard } from "@/components/promoter-dashboard"

export const dynamic = "force-dynamic"

export default async function PromoterPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const [salary, dashData] = await Promise.all([
    getMySalary(),
    getDashboardData(),
  ])

  if (!dashData.isPromoter || !salary) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen pb-28">
      <AppHeader isPromoter title="Partner Earnings" />
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <PromoterDashboard salary={salary} />
      </main>
      <BottomNav />
    </div>
  )
}
