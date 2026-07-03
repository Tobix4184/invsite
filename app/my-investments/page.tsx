import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { db } from "@/lib/db"
import { investment } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { formatNaira } from "@/lib/plans"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { TrendingUp } from "lucide-react"

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
          <div className="card-glass rounded-3xl px-4 py-12 text-center text-sm font-semibold text-muted-foreground">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-surface">
              <TrendingUp className="h-6 w-6 text-foreground" />
            </span>
            <p>No investments yet. Start investing to grow your income!</p>
          </div>
        ) : (
          <>
            {/* Active Investments */}
            {activeInvestments.length > 0 && (
              <section>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Active ({activeInvestments.length})
                </p>
                <div className="flex flex-col gap-2">
                  {activeInvestments.map((inv) => (
                    <InvestmentCard key={inv.id} investment={inv} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Investments */}
            {completedInvestments.length > 0 && (
              <section>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Completed ({completedInvestments.length})
                </p>
                <div className="flex flex-col gap-2">
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
  const progressPercent = Math.min(100, Math.round((inv.daysPaid / inv.durationDays) * 100))

  return (
    <article className={`relative overflow-hidden rounded-2xl border-2 border-ink bg-card pl-5 pr-4 py-4 shadow-[3px_3px_0_0_var(--ink)] ${
      completed ? "opacity-80" : ""
    }`}>
      {/* Left accent stripe */}
      <span className={`absolute left-0 top-0 h-full w-2 border-r-2 border-ink ${completed ? "bg-surface" : "bg-success"}`} />

      {/* Plan name + status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black uppercase tracking-tight">{inv.planName}</h3>
          <p className="text-[11px] font-semibold text-muted-foreground">{formatNaira(Number(inv.price))} invested</p>
        </div>
        <span className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
          completed ? "bg-surface text-muted-foreground" : "bg-success text-success-foreground"
        }`}>
          {completed ? "Completed" : "Active"}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border-2 border-ink bg-surface px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Daily</p>
          <p className="text-sm font-black text-success">{formatNaira(dailyEarning)}</p>
        </div>
        <div className="rounded-xl border-2 border-ink bg-surface px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Earned</p>
          <p className="text-sm font-black">{formatNaira(amountEarned)}</p>
        </div>
        <div className="rounded-xl border-2 border-ink bg-surface px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="text-sm font-black">{formatNaira(totalEarning)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-surface">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-[10px] font-bold tabular-nums text-muted-foreground">
            {inv.daysPaid}/{inv.durationDays}d
          </p>
          {!completed && daysLeft > 0 && (
            <p className="text-[10px] font-bold text-muted-foreground">{daysLeft}d left</p>
          )}
          {completed && (
            <p className="text-[10px] font-bold text-muted-foreground">
              {new Date(inv.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}


