import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getTeamData } from "@/app/actions/team"
import { getAvailableMilestones } from "@/app/actions/referral"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { TeamView } from "@/components/team-view"

export const dynamic = "force-dynamic"

export default async function TeamPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  
  const [data, milestonesData] = await Promise.all([
    getTeamData(),
    getAvailableMilestones(),
  ])

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="My Team" />
      <TeamView data={data} milestonesData={milestonesData} />
      <BottomNav />
    </div>
  )
}
