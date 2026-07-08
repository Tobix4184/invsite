import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getDashboardData } from "@/app/actions/account"
import { BottomNav } from "@/components/bottom-nav"
import { ProfileView } from "@/components/profile-view"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  const data = await getDashboardData()

  return (
    <div className="min-h-screen pb-24">
      <ProfileView
        name={data.name}
        email={data.email}
        phone={data.phone}
        role={data.role}
        balance={data.balance}
        totalDeposited={data.totalDeposited}
        totalEarned={data.totalEarned}
        referralEarnings={data.referralEarnings}
        weekendPoints={data.weekendPoints ?? 0}
        pointsPerNaira={data.pointsPerNaira ?? 0.5}
        nextPayoutDay={data.nextPayoutDay ?? "Saturday"}
      />
      <BottomNav />
    </div>
  )
}
