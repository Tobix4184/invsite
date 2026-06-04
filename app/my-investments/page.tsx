import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { db } from "@/lib/db"
import { investment } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { formatNaira } from "@/lib/plans"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { TrendingUp, Calendar, DollarSign } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function MyInvestmentsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const investments = await db
    .select()
    .from(investment)
    .where(eq(investment.userId, session.user.id))

  const activeInvestments = investments.filter((i) => i.status === "active")
  const completedInvestments = investments.filter((i) => i.status === "completed")

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="My Investments" />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        {investments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 opacity-30" />
            <p>No investments yet. Start investing to grow your income!</p>
          </div>
        ) : (
          <>
            {/* Active Investments */}
            {activeInvestments.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Active ({activeInvestments.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {activeInvestments.map((inv) => (
                    <InvestmentCard key={inv.id} investment={inv} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Investments */}
            {completedInvestments.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Completed ({completedInvestments.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {completedInvestments.map((inv) => (
                    <InvestmentCard key={inv.id} investment={inv} completed />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function InvestmentCard({
  investment: inv,
  completed,
}: {
  investment: any
  completed?: boolean
}) {
  const dailyEarning = Number(inv.dailyEarning)
  const totalEarning = Number(inv.totalEarning)
  const amountEarned = Number(inv.amountEarned)
  const daysLeft = Math.max(0, inv.durationDays - inv.daysPaid)
  const progressPercent = (inv.daysPaid / inv.durationDays) * 100

  return (
    <div className={`rounded-2xl border ${completed ? 'border-border/50 bg-card/50' : 'border-border bg-card'} p-4`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-foreground">{inv.planName}</h3>
          <p className="text-xs text-muted-foreground">{formatNaira(Number(inv.price))} investment</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
            completed
              ? 'bg-border/50 text-muted-foreground'
              : 'bg-success/15 text-success'
          }`}
        >
          {completed ? 'Completed' : 'Active'}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <Row icon={DollarSign} label="Daily earning" value={formatNaira(dailyEarning)} />
        <Row
          icon={TrendingUp}
          label="Total earning"
          value={formatNaira(totalEarning)}
          highlight
        />
        <Row
          icon={DollarSign}
          label="Earned so far"
          value={formatNaira(amountEarned)}
        />
      </div>

      {!completed && (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs">
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-success transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="tabular-nums text-muted-foreground">
              {inv.daysPaid}/{inv.durationDays}d
            </span>
          </div>
          {daysLeft > 0 && (
            <p className="text-xs text-muted-foreground">
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
            </p>
          )}
        </>
      )}

      {completed && (
        <p className="text-xs text-muted-foreground">
          Completed on {new Date(inv.createdAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className={`tabular-nums text-sm ${highlight ? 'font-bold text-success' : ''}`}>
        {value}
      </span>
    </div>
  )
}
