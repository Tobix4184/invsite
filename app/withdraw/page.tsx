import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { ComingSoon } from '@/components/coming-soon'

export const dynamic = 'force-dynamic'

export default async function WithdrawPage() {
  const session = await getSession()
  if (!session?.user) redirect('/')

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Withdraw" />
      <ComingSoon
        title="Withdrawals Coming Soon"
        description="Our withdrawal system is under development. We are building a fast, secure, and automated payout experience. Stay tuned."
        backHref="/dashboard"
      />
      <BottomNav />
    </div>
  )
}
