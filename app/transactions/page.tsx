import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Gift, TrendingUp, Users, Receipt } from "lucide-react"
import { getSession } from "@/lib/session"
import { getTransactions } from "@/app/actions/account"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { formatNaira } from "@/lib/plans"

export const dynamic = "force-dynamic"

const META: Record<string, { icon: typeof Gift; tint: string; bg: string; chip: string; sign: string }> = {
  deposit: { icon: ArrowDownLeft, tint: "text-success", bg: "bg-success", chip: "text-success-foreground", sign: "+" },
  withdrawal: { icon: ArrowUpRight, tint: "text-gold-foreground", bg: "bg-gold", chip: "text-gold-foreground", sign: "-" },
  earning: { icon: TrendingUp, tint: "text-success", bg: "bg-success", chip: "text-success-foreground", sign: "+" },
  referral: { icon: Users, tint: "text-primary", bg: "bg-primary", chip: "text-primary-foreground", sign: "+" },
  bonus: { icon: Gift, tint: "text-gold-foreground", bg: "bg-gold", chip: "text-gold-foreground", sign: "+" },
  investment: { icon: Receipt, tint: "text-primary", bg: "bg-primary", chip: "text-primary-foreground", sign: "-" },
  refund: { icon: ArrowDownLeft, tint: "text-success", bg: "bg-success", chip: "text-success-foreground", sign: "+" },
  credit: { icon: ArrowDownLeft, tint: "text-success", bg: "bg-success", chip: "text-success-foreground", sign: "+" },
  debit: { icon: ArrowUpRight, tint: "text-destructive", bg: "bg-destructive", chip: "text-destructive-foreground", sign: "-" },
}

export default async function TransactionsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  const txns = await getTransactions(100)

  return (
    <div className="min-h-screen pb-28">
      <AppHeader title="Transactions" />
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5 animate-fade-up">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            aria-label="Back"
            className="press flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-black uppercase tracking-tight">Transaction History</h1>
        </div>

        {txns.length === 0 ? (
          <div className="card-glass flex flex-col items-center gap-2 rounded-3xl px-4 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-surface">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </span>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <section className="card-glass overflow-hidden rounded-3xl">
            {txns.map((t, i) => {
              const meta = META[t.type] ?? META.bonus
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-4 transition-colors hover:bg-surface ${i !== txns.length - 1 ? "border-b-2 border-ink/15" : ""}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${meta.bg}`}>
                    <meta.icon className={`h-5 w-5 ${meta.chip}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold capitalize">{t.description ?? t.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                      {t.status === "pending" && " · Pending"}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-black tabular-nums ${meta.tint}`}>
                    {meta.sign}
                    {formatNaira(Number(t.amount))}
                  </span>
                </div>
              )
            })}
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
