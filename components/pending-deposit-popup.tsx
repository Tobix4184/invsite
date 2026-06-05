"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, Clock, ArrowRight, AlertTriangle, Loader2 } from "lucide-react"
import { formatNaira } from "@/lib/plans"

type PendingDeposit = {
  id: number
  reference: string
  amount: string
  status: string
  assignedBankName: string | null
  assignedAccountNumber: string | null
  senderName: string | null
  expiresAt: Date | string | null
  createdAt: Date | string
}

export function PendingDepositPopup({ deposits }: { deposits: PendingDeposit[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])

  // Filter out dismissed deposits and get only valid pending ones
  const validDeposits = deposits.filter(dep => {
    if (dismissed.includes(dep.reference)) return false
    if (dep.status !== "pending" && dep.status !== "processing") return false
    return true
  })

  // Check localStorage for dismissed deposits on mount
  useEffect(() => {
    const stored = localStorage.getItem("dismissedDepositPopups")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setDismissed(parsed)
      } catch {
        // ignore
      }
    }
  }, [])

  // Show popup if there are pending deposits
  useEffect(() => {
    if (validDeposits.length > 0) {
      // Small delay to not show immediately on page load
      const timer = setTimeout(() => setIsOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [validDeposits.length])

  function handleDismiss(reference: string) {
    const newDismissed = [...dismissed, reference]
    setDismissed(newDismissed)
    localStorage.setItem("dismissedDepositPopups", JSON.stringify(newDismissed))
    
    // Close popup if no more deposits
    if (validDeposits.filter(d => d.reference !== reference).length === 0) {
      setIsOpen(false)
    }
  }

  function handleClose() {
    setIsOpen(false)
  }

  if (!isOpen || validDeposits.length === 0) return null

  const latestDeposit = validDeposits[0]
  const isProcessing = latestDeposit.status === "processing"
  const needsSenderName = !latestDeposit.senderName && latestDeposit.status === "pending"
  const createdAt = new Date(latestDeposit.createdAt)
  const minutesElapsed = Math.floor((Date.now() - createdAt.getTime()) / 1000 / 60)
  const showNameWarning = needsSenderName && minutesElapsed >= 3

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
        <div className="rounded-2xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Clock className="h-5 w-5 text-amber-400" />
              )}
              <span className="font-bold">
                {isProcessing ? "Payment Processing" : "Pending Deposit"}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {isProcessing ? (
              <div className="text-center">
                <p className="text-2xl font-bold">{formatNaira(Number(latestDeposit.amount))}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your payment is being processed (0-15 min)
                </p>
                <div className="mt-4 rounded-xl bg-primary/10 p-3">
                  <p className="text-sm text-primary">
                    You will be notified once approved
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatNaira(Number(latestDeposit.amount))}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Waiting for your payment
                  </p>
                </div>

                {/* Bank details summary */}
                {latestDeposit.assignedBankName && (
                  <div className="mt-4 rounded-xl bg-secondary/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Transfer to:</p>
                    <p className="font-bold">{latestDeposit.assignedBankName}</p>
                    <p className="text-lg font-bold text-primary">{latestDeposit.assignedAccountNumber}</p>
                  </div>
                )}

                {/* Sender name warning */}
                {showNameWarning && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <p className="text-xs text-amber-400">
                      Add your sender name to speed up verification
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleDismiss(latestDeposit.reference)}
                className="flex-1 rounded-xl border border-border bg-secondary py-3 text-sm font-bold"
              >
                Dismiss
              </button>
              <Link
                href={`/deposits/${latestDeposit.reference}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
              >
                {isProcessing ? "View Status" : "Continue"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Other pending deposits */}
            {validDeposits.length > 1 && (
              <Link
                href="/deposits"
                className="mt-3 block text-center text-xs text-muted-foreground underline"
              >
                View all {validDeposits.length} pending deposits
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
