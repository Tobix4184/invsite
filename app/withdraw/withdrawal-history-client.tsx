"use client"

import { CheckCircle, Clock, XCircle } from "lucide-react"
import { formatNaira } from "@/lib/plans"

type Withdrawal = {
  id: number
  amount: string | number
  netAmount: string | number | null
  charge: string | number | null
  bankName: string | null
  accountNumber: string | null
  accountName: string | null
  status: string
  createdAt: Date | string
  processedAt: Date | string | null
}

const STATUS_META: Record<string, { icon: typeof Clock; tint: string; bg: string; label: string }> = {
  pending:   { icon: Clock,        tint: "text-gold",        bg: "bg-gold/12",        label: "Pending" },
  approved:  { icon: CheckCircle,  tint: "text-success",     bg: "bg-success/12",     label: "Approved" },
  completed: { icon: CheckCircle,  tint: "text-success",     bg: "bg-success/12",     label: "Paid" },
  rejected:  { icon: XCircle,      tint: "text-destructive", bg: "bg-destructive/12", label: "Rejected" },
  failed:    { icon: XCircle,      tint: "text-destructive", bg: "bg-destructive/12", label: "Failed" },
}

export function WithdrawalHistoryClient({ withdrawals }: { withdrawals: Withdrawal[] }) {
  return (
    <div className="flex flex-col gap-3">
      {withdrawals.map((w) => {
        const meta = STATUS_META[w.status] ?? STATUS_META.pending
        const Icon = meta.icon
        const net = w.netAmount ? Number(w.netAmount) : Number(w.amount)

        return (
          <div key={w.id} className="card-glass rounded-3xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black tabular-nums">{formatNaira(Number(w.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  You receive: <span className="font-semibold text-foreground">{formatNaira(net)}</span>
                  {w.charge && Number(w.charge) > 0 && (
                    <span className="ml-1 text-muted-foreground/70">
                      (fee: {formatNaira(Number(w.charge))})
                    </span>
                  )}
                </p>
              </div>
              <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.bg} ${meta.tint}`}>
                <Icon className="h-3 w-3" />
                {meta.label}
              </span>
            </div>

            <div className="mt-3 rounded-2xl bg-surface p-3">
              <p className="text-xs text-muted-foreground">To</p>
              <p className="text-sm font-semibold">{w.bankName} · {w.accountNumber}</p>
              <p className="text-xs text-muted-foreground">{w.accountName}</p>
            </div>

            <p className="mt-2 text-xs text-muted-foreground" suppressHydrationWarning>
              {new Date(w.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
            </p>

            {w.status === "pending" && (
              <p className="mt-2 text-xs text-gold">
                Your request is being reviewed. Funds are held until processed.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
