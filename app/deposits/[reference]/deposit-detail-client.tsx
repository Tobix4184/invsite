"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Check, User, ShieldCheck, Loader2, Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { formatNaira } from "@/lib/plans"
import { updateDepositSenderName, markDepositAsPaid } from "@/app/actions/deposit"

type DepositData = {
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
}

type CheckStatus = {
  status: "pending" | "approved" | "expired" | "cancelled" | "needs_review" | "no_api_key" | "checking"
  message?: string
  checkedAt?: string
}

export default function DepositDetailClient({ deposit }: { deposit: DepositData }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [senderName, setSenderName] = useState(deposit.senderName || "")
  const [pending, startTransition] = useTransition()
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [checkStatus, setCheckStatus] = useState<CheckStatus | null>(null)
  const [nextCheckIn, setNextCheckIn] = useState(180) // seconds until next poll

  const isExpired = deposit.expiresAt && new Date(deposit.expiresAt) < new Date()
  const isProcessing = deposit.status === "processing"
  const isPending = deposit.status === "pending" || deposit.status === "processing"

  // Poll the Sabuss check endpoint
  const pollCheck = useCallback(async () => {
    setCheckStatus({ status: "checking" })
    try {
      const res = await fetch(`/api/deposits/check?reference=${deposit.reference}`)
      const data: CheckStatus & { ok: boolean } = await res.json()

      if (data.status === "approved") {
        toast.success("Payment confirmed! Your wallet has been credited.")
        router.refresh()
        return
      }
      if (data.status === "expired" || data.status === "cancelled") {
        toast.error("Deposit expired and was cancelled.")
        router.refresh()
        return
      }
      if (data.status === "needs_review") {
        toast("Payment found but flagged for review.", { icon: "?" })
        router.refresh()
        return
      }
      setCheckStatus(data)
      setNextCheckIn(180) // reset 3-min countdown
    } catch {
      setCheckStatus({ status: "pending", message: "Could not reach check server" })
    }
  }, [deposit.reference, router])

  // Countdown timer + trigger poll every 3 minutes
  useEffect(() => {
    if (!isPending) return

    // Run first check after 30 seconds (give user time to transfer)
    const firstCheck = setTimeout(() => pollCheck(), 30_000)

    const countdown = setInterval(() => {
      setNextCheckIn((s) => {
        if (s <= 1) {
          pollCheck()
          return 180
        }
        return s - 1
      })
    }, 1000)

    // Show name prompt after 3 minutes if no sender name
    const namePrompt = setTimeout(() => {
      if (!deposit.senderName && !senderName.trim()) setShowNamePrompt(true)
    }, 3 * 60 * 1000)

    return () => {
      clearTimeout(firstCheck)
      clearInterval(countdown)
      clearTimeout(namePrompt)
    }
  }, [isPending, deposit.senderName, senderName, pollCheck])

  function handleCopyAccount() {
    if (!deposit.assignedAccountNumber) return
    navigator.clipboard.writeText(deposit.assignedAccountNumber)
    setCopied(true)
    toast.success("Account number copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSaveSenderName() {
    if (!senderName.trim()) return
    startTransition(async () => {
      const res = await updateDepositSenderName(deposit.reference, senderName)
      if (res.ok) {
        toast.success("Sender name saved")
        setShowNamePrompt(false)
      } else {
        toast.error(res.message ?? "Failed to save sender name")
      }
    })
  }

  function handleMarkAsPaid() {
    startTransition(async () => {
      const res = await markDepositAsPaid(deposit.reference)
      if (res.ok) {
        toast.success(res.message)
        router.refresh()
      } else {
        toast.error(res.message ?? "Failed to mark as paid")
      }
    })
  }

  function formatExpiry(date: Date | string) {
    return new Date(date).toLocaleString("en-NG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Processing state
  if (isProcessing) {
    return (
      <main className="mx-auto flex max-w-md flex-col">
        <div className="flex items-center gap-3 bg-card px-4 py-4">
          <Link
            href="/deposits"
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-center text-lg font-bold">Payment Processing</h1>
          <div className="w-10" />
        </div>

        <div className="flex flex-col items-center gap-6 bg-background p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          
          <div className="text-center">
            <p className="text-xl font-bold">{formatNaira(Number(deposit.amount))}</p>
            <p className="mt-1 text-sm text-muted-foreground">Payment is being processed</p>
          </div>

          <div className="w-full rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-sm text-foreground">
              Your payment will be confirmed within <span className="font-bold text-primary">0-15 minutes</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              You will be notified once your deposit is approved
            </p>
          </div>

          <div className="w-full rounded-xl bg-secondary/50 p-4">
            <p className="text-center text-xs text-muted-foreground">
              Reference: <span className="font-mono font-medium text-foreground">{deposit.reference}</span>
            </p>
          </div>

          <Link
            href="/deposits"
            className="w-full rounded-2xl border border-border bg-secondary py-4 text-center text-base font-bold"
          >
            View All Deposits
          </Link>
        </div>
      </main>
    )
  }

  // Expired state
  if (isExpired && isPending) {
    return (
      <main className="mx-auto flex max-w-md flex-col">
        <div className="flex items-center gap-3 bg-card px-4 py-4">
          <Link
            href="/deposits"
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-center text-lg font-bold">Payment Expired</h1>
          <div className="w-10" />
        </div>

        <div className="flex flex-col items-center gap-6 bg-background p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <Clock className="h-10 w-10 text-destructive" />
          </div>
          
          <div className="text-center">
            <p className="text-xl font-bold">{formatNaira(Number(deposit.amount))}</p>
            <p className="mt-1 text-sm text-destructive">This payment session has expired</p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            If you already made a transfer, please contact support. Otherwise, start a new deposit.
          </p>

          <Link
            href="/topup"
            className="w-full rounded-2xl bg-primary py-4 text-center text-base font-bold text-primary-foreground"
          >
            Start New Deposit
          </Link>
        </div>
      </main>
    )
  }

  // Normal pending state - show payment details
  return (
    <main className="mx-auto flex max-w-md flex-col">
      <div className="flex items-center gap-3 bg-card px-4 py-4">
        <Link
          href="/deposits"
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold">Payment Confirmation</h1>
        <div className="w-10" />
      </div>

      <div className="flex flex-col gap-4 bg-background p-4">
        {/* Instructions */}
        <p className="text-center text-sm text-foreground">
          Kindly send <span className="font-bold text-primary">{formatNaira(Number(deposit.amount))}</span> to the account details below.
        </p>

        {/* Warning Box */}
        <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4">
          <p className="text-center text-sm text-destructive">
            <span className="font-bold">Important:</span> Send exactly {formatNaira(Number(deposit.amount))}. Sending a different amount may result in loss of funds.
          </p>
        </div>

        {/* Bank Details */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <span className="text-sm text-muted-foreground">Deposit Amount</span>
            <span className="text-lg font-bold text-primary">{formatNaira(Number(deposit.amount))}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <span className="text-sm text-muted-foreground">Bank Name</span>
            <span className="font-bold text-foreground">{deposit.assignedBankName}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <span className="text-sm text-muted-foreground">Account Name</span>
            <span className="text-right font-bold text-foreground">{deposit.assignedAccountName}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <span className="text-sm text-muted-foreground">Account Number</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">{deposit.assignedAccountNumber}</span>
              <button
                onClick={handleCopyAccount}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                aria-label="Copy account number"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sender Name Prompt - shown after 3-5 min */}
        {showNamePrompt && !deposit.senderName && (
          <div className="rounded-xl border-2 border-amber-400/50 bg-amber-400/10 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">Speed up verification</span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Add your sender name to help us verify your payment faster
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                onClick={handleSaveSenderName}
                disabled={!senderName.trim() || pending}
                className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Sender Name — always visible, prominent tip for auto-detection */}
        {!showNamePrompt && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
            <label className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <User className="h-4 w-4 text-primary" />
              Your Sender Name <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Recommended</span>
            </label>
            <p className="mb-3 text-xs text-muted-foreground">
              Add your first or last name as it appears on your bank account. This helps the system identify your deposit automatically and credit your wallet faster.
            </p>
            {deposit.senderName ? (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2">
                <Check className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">{deposit.senderName}</span>
                <button
                  onClick={() => setSenderName(deposit.senderName || "")}
                  className="ml-auto text-xs text-muted-foreground underline"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. John or Doe or John Doe"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="flex-1 rounded-lg border border-primary/30 bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                />
                <button
                  onClick={handleSaveSenderName}
                  disabled={!senderName.trim() || pending}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Expiry Notice */}
        {deposit.expiresAt && (
          <p className="text-center text-sm text-muted-foreground">
            Please note that payment expires on{" "}
            <span className="font-medium text-foreground">{formatExpiry(deposit.expiresAt)}</span>
          </p>
        )}

        {/* Reference */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-center text-xs text-muted-foreground">
            Reference: <span className="font-mono font-medium text-foreground">{deposit.reference}</span>
          </p>
        </div>

        {/* Auto-check status panel */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Auto-Detection</p>
            <button
              onClick={pollCheck}
              disabled={checkStatus?.status === "checking"}
              className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${checkStatus?.status === "checking" ? "animate-spin" : ""}`} />
              Check Now
            </button>
          </div>

          {checkStatus?.status === "checking" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking Sabuss for your payment...
            </div>
          )}
          {checkStatus?.status === "pending" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {checkStatus.message ?? "Payment not found yet."}
              <span className="ml-auto font-mono text-[10px]">next check in {Math.floor(nextCheckIn / 60)}:{String(nextCheckIn % 60).padStart(2, "0")}</span>
            </div>
          )}
          {checkStatus?.status === "no_api_key" && (
            <p className="text-xs text-muted-foreground">{checkStatus.message}</p>
          )}
          {!checkStatus && (
            <p className="text-xs text-muted-foreground">System will auto-check every 3 minutes. First check in 30 seconds.</p>
          )}
        </div>

        {/* Mark as Paid Button */}
        <button
          onClick={handleMarkAsPaid}
          disabled={pending}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-5 w-5 animate-spin" />}
          I&apos;ve Made the Transfer
        </button>

        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" />
          Payment will be auto-detected or processed within 0-30 minutes
        </p>
      </div>
    </main>
  )
}
