"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
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
  expiresAt: Date | string | null
  createdAt: Date | string
  bankAccountId?: number | null
}

type CheckResult = { status: string; message?: string }

const STATUS_META: Record<string, { icon: typeof Clock; tint: string; bg: string; label: string }> = {
  pending:      { icon: Clock,        tint: "text-gold",        bg: "bg-gold/12",        label: "Pending Payment" },
  processing:   { icon: Loader2,      tint: "text-primary",     bg: "bg-primary/12",     label: "Processing" },
  success:      { icon: CheckCircle,  tint: "text-success",     bg: "bg-success/12",     label: "Completed" },
  approved:     { icon: CheckCircle,  tint: "text-success",     bg: "bg-success/12",     label: "Completed" },
  failed:       { icon: XCircle,      tint: "text-destructive", bg: "bg-destructive/12", label: "Failed" },
  rejected:     { icon: XCircle,      tint: "text-destructive", bg: "bg-destructive/12", label: "Rejected" },
  needs_review: { icon: AlertCircle,  tint: "text-gold",        bg: "bg-gold/12",        label: "Needs Review" },
}

function DepositCard({ dep }: { dep: Deposit }) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)

  const isExpired =
    dep.expiresAt &&
    new Date(dep.expiresAt) < new Date() &&
    dep.status === "pending"

  const canCheck =
    (dep.status === "pending" || dep.status === "processing") && !isExpired

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
        toast.error("Deposit expired and was cancelled.")
        router.refresh()
        return
      }
      if (data.status === "needs_review") {
        toast("Payment found — flagged for review.")
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
    <div className="card-glass rounded-3xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-black tabular-nums">{formatNaira(Number(dep.amount))}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{dep.reference}</p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${meta.bg} ${meta.tint}`}
        >
          <meta.icon className={`h-3 w-3 ${dep.status === "processing" ? "animate-spin" : ""}`} />
          {isExpired ? "Expired" : meta.label}
        </span>
      </div>

      {/* Bank details for active deposits */}
      {dep.assignedBankName &&
        (dep.status === "pending" || dep.status === "processing") && (
          <div className="mt-3 rounded-xl bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Transfer to:</p>
            <p className="text-sm font-semibold">
              {dep.assignedBankName} · {dep.assignedAccountNumber}
            </p>
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
        <span>
          {new Date(dep.createdAt).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        {dep.expiresAt && dep.status === "pending" && !isExpired && (
          <span className="text-gold">
            Expires:{" "}
            {new Date(dep.expiresAt).toLocaleTimeString("en-NG", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Check result feedback */}
      {result && (
        <div
          className={`mt-3 rounded-xl px-3 py-2 text-xs ${
            result.status === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {result.message ?? "Payment not detected yet. Try again in a few minutes."}
        </div>
      )}

      {/* Action buttons */}
      {canCheck && (
        <div className="mt-3 flex gap-2">
          {dep.status === "pending" && dep.assignedAccountNumber && !isExpired && (
            <Link
              href={`/deposits/${dep.reference}`}
              className="flex flex-1 items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
            >
              Continue
            </Link>
          )}
          <button
            onClick={handleCheck}
            disabled={checking}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary py-2.5 text-sm font-bold text-foreground disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Check Payment"}
          </button>
        </div>
      )}
    </div>
  )
}

export function DepositHistoryClient({ deposits }: { deposits: Deposit[] }) {
  return (
    <section className="flex flex-col gap-3">
      {deposits.map((dep) => (
        <DepositCard key={dep.id} dep={dep} />
      ))}
    </section>
  )
}
