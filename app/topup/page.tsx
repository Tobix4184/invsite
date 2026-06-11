import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { ComingSoon } from '@/components/coming-soon'

export const dynamic = 'force-dynamic'

export default async function TopupPage() {
  const session = await getSession()
  if (!session?.user) redirect('/')

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Deposit" />
      <ComingSoon
        title="Deposits Coming Soon"
        description="We are integrating a secure payment gateway to make deposits fast, safe, and seamless. You will be notified as soon as it is live."
        backHref="/dashboard"
      />
      <BottomNav />
    </div>
  )
}
