import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { getSession } from "@/lib/session"
import { getUserDeposits } from "@/app/actions/deposit"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { formatNaira } from "@/lib/plans"

export const dynamic = "force-dynamic"

const STATUS_META: Record<string, { icon: typeof Clock; tint: string; bg: string; label: string }> = {
  pending: { icon: Clock, tint: "text-amber-400", bg: "bg-amber-400/10", label: "Pending Payment" },
  processing: { icon: Loader2, tint: "text-primary", bg: "bg-primary/10", label: "Processing" },
  success: { icon: CheckCircle, tint: "text-success", bg: "bg-success/10", label: "Completed" },
  failed: { icon: XCircle, tint: "text-destructive", bg: "bg-destructive/10", label: "Failed" },
}

export default async function DepositsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  const deposits = await getUserDeposits()

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Deposits" />
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Deposit History</h1>
            <p className="text-xs text-muted-foreground">View and continue pending deposits</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            Deposits are processed within <span className="font-semibold text-foreground">0-15 minutes</span> after payment confirmation.
          </p>
        </div>

        {deposits.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/30" />
            <div>
              <p className="font-medium text-foreground">No deposits yet</p>
              <p className="text-sm text-muted-foreground">Start by making your first deposit</p>
            </div>
            <Link
              href="/topup"
              className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Make Deposit
            </Link>
          </div>
        ) : (
          <section className="flex flex-col gap-3">
            {deposits.map((dep) => {
              const meta = STATUS_META[dep.status] ?? STATUS_META.pending
              const isExpired = dep.expiresAt && new Date(dep.expiresAt) < new Date() && dep.status === "pending"
              const canContinue = dep.status === "pending" && !isExpired && dep.assignedAccountNumber
              
              return (
                <div key={dep.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold">{formatNaira(Number(dep.amount))}</p>
                      <p className="text-xs text-muted-foreground font-mono">{dep.reference}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${meta.bg} ${meta.tint}`}>
                      <meta.icon className={`h-3 w-3 ${dep.status === "processing" ? "animate-spin" : ""}`} />
                      {isExpired ? "Expired" : meta.label}
                    </span>
                  </div>

                  {/* Bank Details - only show for pending/processing deposits */}
                  {dep.assignedBankName && (dep.status === "pending" || dep.status === "processing") && (
                    <div className="mt-3 rounded-xl bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">Transfer to:</p>
                      <p className="font-semibold text-sm">{dep.assignedBankName} - {dep.assignedAccountNumber}</p>
                      <p className="text-xs text-muted-foreground">{dep.assignedAccountName}</p>
                    </div>
                  )}

                  {/* Sender name if provided */}
                  {dep.senderName && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Sender: <span className="font-medium text-foreground">{dep.senderName}</span>
                    </p>
                  )}

                  {/* Timestamps */}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(dep.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    {dep.expiresAt && dep.status === "pending" && !isExpired && (
                      <span className="text-amber-400">
                        Expires: {new Date(dep.expiresAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {/* Continue button for pending deposits */}
                  {canContinue && (
                    <Link
                      href={`/deposits/${dep.reference}`}
                      className="mt-3 flex w-full items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
                    >
                      Continue Payment
                    </Link>
                  )}

                  {/* Processing message */}
                  {dep.status === "processing" && (
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing (0-15 min)
                    </div>
                  )}
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
