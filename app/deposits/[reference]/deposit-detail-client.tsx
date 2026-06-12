"use client"

import { useState, useTransition, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Copy, Check, User, ShieldCheck, Loader2,
  Clock, Zap, AlertCircle, RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
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

type PollStatus = "idle" | "checking" | "pending" | "approved" | "expired" | "no_api_key"

export default function DepositDetailClient({ deposit }: { deposit: DepositData }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [senderName, setSenderName] = useState(deposit.senderName ?? "")
  const [nameSaved, setNameSaved] = useState(!!deposit.senderName)
  const [savePending, startSaveTransition] = useTransition()
  const [paidPending, startPaidTransition] = useTransition()
  const [pollStatus, setPollStatus] = useState<PollStatus>("idle")
  const [pollMessage, setPollMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(30)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isExpired = !!deposit.expiresAt && new Date(deposit.expiresAt) < new Date()
  const isPending = ["pending", "processing"].includes(deposit.status)

  // ── Polling ──────────────────────────────────────────────────────────────
  const runPoll = useCallback(async () => {
    setPollStatus("checking")
    try {
      const res = await fetch(`/api/deposits/check?reference=${deposit.reference}`)
      const data = await res.json() as { status: string; message?: string; ok: boolean }
      setPollStatus(data.status as PollStatus)
      setPollMessage(data.message ?? null)
      setCountdown(30)

      if (data.status === "approved") {
        toast.success("Payment confirmed! Your wallet has been credited.")
        router.refresh()
      } else if (data.status === "expired") {
        toast.error("Deposit expired.")
        router.refresh()
      }
    } catch {
      setPollStatus("pending")
      setPollMessage("Could not reach server")
    }
  }, [deposit.reference, router])

  useEffect(() => {
    if (!isPending) return

    // First check after 10 seconds
    const first = setTimeout(() => runPoll(), 10_000)

    // Then every 30 seconds
    pollRef.current = setInterval(() => runPoll(), 30_000)

    // Countdown display
    countRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1))
    }, 1_000)

    return () => {
      clearTimeout(first)
      if (pollRef.current) clearInterval(pollRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [isPending, runPoll])

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleCopy() {
    if (!deposit.assignedAccountNumber) return
    navigator.clipboard.writeText(deposit.assignedAccountNumber)
    setCopied(true)
    toast.success("Account number copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSaveName() {
    if (!senderName.trim()) return
    startSaveTransition(async () => {
      const res = await updateDepositSenderName(deposit.reference, senderName.trim())
      if (res.ok) {
        setNameSaved(true)
        toast.success("Sender name saved")
      } else {
        toast.error(res.message ?? "Failed to save")
      }
    })
  }

  function handleMarkAsPaid() {
    if (!nameSaved) {
      toast.error("Please save your sender name first")
      return
    }
    startPaidTransition(async () => {
      const res = await markDepositAsPaid(deposit.reference)
      if (res.ok) {
        toast.success(res.message)
        router.refresh()
      } else {
        toast.error(res.message ?? "Failed")
      }
    })
  }

  function fmtExpiry(d: Date | string) {
    return new Date(d).toLocaleString("en-NG", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: true,
    })
  }

  // ── Processing state ──────────────────────────────────────────────────────
  if (deposit.status === "processing") {
    return (
      <main className="mx-auto flex max-w-md flex-col">
        <PageHeader title="Processing Payment" />
        <div className="flex flex-col items-center gap-6 p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{formatNaira(Number(deposit.amount))}</p>
            <p className="mt-1 text-sm text-muted-foreground">Waiting for Sabuss to confirm</p>
          </div>
          <div className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
            <Zap className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="text-sm font-medium">Auto-detection is active</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your wallet will be credited automatically once Sabuss notifies us.
            </p>
          </div>
          <div className="w-full rounded-xl bg-secondary/50 p-3">
            <p className="text-center text-xs text-muted-foreground">
              Ref: <span className="font-mono font-medium text-foreground">{deposit.reference}</span>
            </p>
          </div>
          <Link href="/deposits" className="w-full rounded-2xl border border-border bg-card py-4 text-center text-base font-bold">
            View All Deposits
          </Link>
        </div>
      </main>
    )
  }

  // ── Expired state ─────────────────────────────────────────────────────────
  if (isExpired && isPending) {
    return (
      <main className="mx-auto flex max-w-md flex-col">
        <PageHeader title="Payment Expired" />
        <div className="flex flex-col items-center gap-6 p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <Clock className="h-10 w-10 text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{formatNaira(Number(deposit.amount))}</p>
            <p className="mt-1 text-sm text-destructive">This payment session has expired</p>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            If you already made a transfer, please contact support. Otherwise start a new deposit.
          </p>
          <Link href="/topup" className="w-full rounded-2xl bg-primary py-4 text-center text-base font-bold text-primary-foreground">
            Start New Deposit
          </Link>
        </div>
      </main>
    )
  }

  // ── Active pending state ──────────────────────────────────────────────────
  return (
    <main className="mx-auto flex max-w-md flex-col">
      <PageHeader title="Payment Details" />

      <div className="flex flex-col gap-3 p-4">

        {/* ── STEP 1: Sender name — required ───────────────────────────── */}
        <div className={`rounded-2xl border-2 p-4 ${nameSaved ? "border-success/40 bg-success/5" : "border-primary/50 bg-primary/5"}`}>
          <label className="mb-1 flex items-center gap-2 text-sm font-bold">
            <User className="h-4 w-4 text-primary" />
            Your Sender Name
            {!nameSaved && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                Required
              </span>
            )}
            {nameSaved && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                Saved
              </span>
            )}
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            Enter your name exactly as it appears on your bank account. This lets our system match and credit your payment automatically.
          </p>

          {nameSaved ? (
            <div className="flex items-center gap-3 rounded-xl bg-success/10 px-3 py-2.5">
              <Check className="h-4 w-4 shrink-0 text-success" />
              <span className="flex-1 text-sm font-medium text-success">{senderName}</span>
              <button
                onClick={() => setNameSaved(false)}
                className="text-xs text-muted-foreground underline"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className="flex-1 rounded-xl border border-primary/40 bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={!senderName.trim() || savePending}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {savePending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* ── STEP 2: Bank details ──────────────────────────────────────── */}
        <p className="text-center text-sm">
          Send exactly{" "}
          <span className="font-bold text-primary">{formatNaira(Number(deposit.amount))}</span>{" "}
          to this account:
        </p>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <BankRow label="Bank" value={deposit.assignedBankName ?? "—"} />
          <BankRow label="Account Name" value={deposit.assignedAccountName ?? "—"} />
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">Account Number</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary tracking-widest">{deposit.assignedAccountNumber}</span>
              <button
                onClick={handleCopy}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-label="Copy account number"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Important notice ─────────────────────────────────────────── */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/8 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-foreground">
            Send <span className="font-bold">exactly {formatNaira(Number(deposit.amount))}</span>. Sending a different amount may delay or prevent auto-detection.
          </p>
        </div>

        {/* ── Auto-detection status ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${pollStatus === "checking" ? "animate-pulse bg-primary" : pollStatus === "approved" ? "bg-success" : "bg-muted-foreground/40"}`} />
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Auto-Detection</p>
            </div>
            <button
              onClick={runPoll}
              disabled={pollStatus === "checking"}
              className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${pollStatus === "checking" ? "animate-spin" : ""}`} />
              Check now
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {pollStatus === "checking" && "Checking Sabuss for your payment..."}
            {pollStatus === "pending" && (pollMessage ?? "Not detected yet.")}
            {pollStatus === "idle" && "Checking every 30 s. First check in 10 s after page load."}
            {pollStatus === "no_api_key" && (pollMessage ?? "Manual approval — admin will confirm shortly.")}
            {pollStatus === "approved" && "Payment confirmed!"}
          </p>

          {["idle", "pending", "checking"].includes(pollStatus) && (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
              next check in {countdown}s
            </p>
          )}
        </div>

        {/* Expiry */}
        {deposit.expiresAt && (
          <p className="text-center text-xs text-muted-foreground">
            Expires: <span className="font-medium text-foreground">{fmtExpiry(deposit.expiresAt)}</span>
          </p>
        )}

        {/* Reference */}
        <p className="text-center text-xs text-muted-foreground">
          Ref: <span className="font-mono text-foreground">{deposit.reference}</span>
        </p>

        {/* ── CTA — blocked until sender name is saved ─────────────────── */}
        <button
          onClick={handleMarkAsPaid}
          disabled={!nameSaved || paidPending}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {paidPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          I&apos;ve Made the Transfer
        </button>

        {!nameSaved && (
          <p className="text-center text-xs text-destructive">
            Save your sender name above before confirming payment
          </p>
        )}

        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" />
          Payment auto-detected via Sabuss or approved within 0-15 minutes
        </p>
      </div>
    </main>
  )
}

function PageHeader({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
      <Link
        href="/deposits"
        aria-label="Back"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="flex-1 text-center text-lg font-bold">{title}</h1>
      <div className="w-10" />
    </div>
  )
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  )
}
