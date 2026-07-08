import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getUserPoints } from "@/app/actions/points"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { WeekendSalaryClient } from "@/components/weekend-salary-client"
import { getDashboardData } from "@/app/actions/account"

export const dynamic = "force-dynamic"

export default async function WeekendSalaryPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const [pointsData, dashData] = await Promise.all([
    getUserPoints(),
    getDashboardData(),
  ])

  return (
    <div className="min-h-screen pb-28">
      <AppHeader isPromoter={dashData.isPromoter} title="Weekend Salary" />
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <WeekendSalaryClient
          points={pointsData.points}
          nairaEquivalent={pointsData.nairaEquivalent}
          pointsPerNaira={pointsData.pointsPerNaira}
          nextPayoutDay={pointsData.nextPayoutDay}
        />
      </main>
      <BottomNav />
    </div>
  )
}
