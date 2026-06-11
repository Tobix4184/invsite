import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Gift, TrendingUp, Users, Receipt } from "lucide-react"
import { getSession } from "@/lib/session"
import { getTransactions } from "@/app/actions/account"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { formatNaira } from "@/lib/plans"

export const dynamic = "force-dynamic"

const META: Record<string, { icon: typeof Gift; tint: string; sign: string }> = {
  deposit: { icon: ArrowDownLeft, tint: "text-success", sign: "+" },
  withdrawal: { icon: ArrowUpRight, tint: "text-amber-400", sign: "-" },
  earning: { icon: TrendingUp, tint: "text-success", sign: "+" },
  referral: { icon: Users, tint: "text-primary", sign: "+" },
  bonus: { icon: Gift, tint: "text-pink-400", sign: "+" },
  investment: { icon: Receipt, tint: "text-primary", sign: "-" },
  refund: { icon: ArrowDownLeft, tint: "text-success", sign: "+" },
  credit: { icon: ArrowDownLeft, tint: "text-success", sign: "+" },
  debit: { icon: ArrowUpRight, tint: "text-destructive", sign: "-" },
}

export default async function TransactionsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  const txns = await getTransactions(100)

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Transactions" />
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Transaction History</h1>
        </div>

        {txns.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-12 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            {txns.map((t, i) => {
              const meta = META[t.type] ?? META.bonus
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-4 ${i !== txns.length - 1 ? "border-b border-border" : ""}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <meta.icon className={`h-4 w-4 ${meta.tint}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize">{t.description ?? t.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                      {t.status === "pending" && " · Pending"}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${meta.tint}`}>
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
