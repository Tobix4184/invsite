"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { formatNaira } from "@/lib/plans"

type Deposit = {
  id: number
  reference: string
  amount: string
  status: string
  assignedBankName: string | null
  assignedAccountNumber: string | null
  assignedAccountName: string | null
  senderName: string | null
  expiresAt: string | null
  createdAt: string
  bankAccountId: number | null
}

type CheckResult = { status: string; message?: string }

const STATUS_META: Record<string, { icon: typeof Clock; tint: string; bg: string; label: string }> = {
  pending:      { icon: Clock,        tint: "text-amber-400",    bg: "bg-amber-400/10",    label: "Pending Payment" },
  processing:   { icon: Loader2,      tint: "text-primary",      bg: "bg-primary/10",      label: "Processing" },
  success:      { icon: CheckCircle,  tint: "text-success",      bg: "bg-success/10",      label: "Completed" },
  failed:       { icon: XCircle,      tint: "text-destructive",  bg: "bg-destructive/10",  label: "Failed" },
  needs_review: { icon: AlertCircle,  tint: "text-orange-400",   bg: "bg-orange-400/10",   label: "Needs Review" },
}

function DepositCard({ dep }: { dep: Deposit }) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)

  const isExpired = dep.expiresAt && new Date(dep.expiresAt) < new Date() && dep.status === "pending"
  const canContinue = dep.status === "pending" && !isExpired && dep.assignedAccountNumber
  const canCheck = (dep.status === "pending" || dep.status === "processing") && !isExpired

  const meta = STATUS_META[dep.status] ?? STATUS_META.pending

  const handleCheck = useCallback(async () => {
    setChecking(true)
    setResult(null)
    try {
      const res = await fetch(`/api/deposits/check?reference=${dep.reference}`)
      const data: CheckResult = await res.json()
      if (data.status === "approved") {
        toast.success("Payment confirmed! Wallet credited.")
        router.refresh()
        return
      }
      if (data.status === "expired" || data.status === "cancelled") {
        toast.error("Deposit expired and cancelled.")
        router.refresh()
        return
      }
      if (data.status === "needs_review") {
        toast("Payment found — flagged for review.", { icon: "?" })
        router.refresh()
        return
      }
      setResult(data)
    } catch {
      setResult({ status: "error", message: "Could not reach check server" })
    } finally {
      setChecking(false)
    }
  }, [dep.reference, router])

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold">{formatNaira(Number(dep.amount))}</p>
          <p className="font-mono text-xs text-muted-foreground">{dep.reference}</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${meta.bg} ${meta.tint}`}>
          <meta.icon className={`h-3 w-3 ${dep.status === "processing" ? "animate-spin" : ""}`} />
          {isExpired ? "Expired" : meta.label}
        </span>
      </div>

      {/* Bank details for pending/processing */}
      {dep.assignedBankName && (dep.status === "pending" || dep.status === "processing") && (
        <div className="mt-3 rounded-xl bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">Transfer to:</p>
          <p className="text-sm font-semibold">{dep.assignedBankName} - {dep.assignedAccountNumber}</p>
          <p className="text-xs text-muted-foreground">{dep.assignedAccountName}</p>
        </div>
      )}

      {/* Sender name */}
      {dep.senderName && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sender: <span className="font-medium text-foreground">{dep.senderName}</span>
        </p>
      )}

      {/* Timestamps */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{new Date(dep.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span>
        {dep.expiresAt && dep.status === "pending" && !isExpired && (
          <span className="text-amber-400">
            Expires: {new Date(dep.expiresAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Check result feedback */}
      {result && (
        <div className={`mt-3 rounded-xl px-3 py-2 text-xs ${result.status === "pending" ? "bg-secondary text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>
          {result.message ?? "Payment not detected yet. Try again in a few minutes."}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        {canContinue && (
          <Link
            href={`/deposits/${dep.reference}`}
            className="flex flex-1 items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
          >
            Continue Payment
          </Link>
        )}

        {canCheck && (
          <button
            onClick={handleCheck}
            disabled={checking}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary py-2.5 text-sm font-bold text-foreground disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Check Payment"}
          </button>
        )}

        {dep.status === "processing" && !canCheck && (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Auto-checking...
          </div>
        )}
      </div>
    </div>
  )
}

// Page fetches data server-side via a separate server component wrapper
import type { ReactNode } from "react"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { getUserDeposits } from "@/app/actions/deposit"

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
            <p className="text-xs text-muted-foreground">View and check pending deposits</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            Deposits are auto-detected within <span className="font-semibold text-foreground">0-30 minutes</span>. Use the{" "}
            <span className="font-semibold text-foreground">Check Payment</span> button to trigger an immediate check.
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
            {deposits.map((dep) => (
              <DepositCard key={dep.id} dep={dep as unknown as Deposit} />
            ))}
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
