"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Copy, Check, ShieldCheck, Loader2,
  Clock, AlertCircle, RefreshCw, Zap, Building2,
} from "lucide-react"
import { toast } from "sonner"
import { formatNaira } from "@/lib/plans"
import { markDepositAsPaid } from "@/app/actions/deposit"

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

type PollStatus = "idle" | "checking" | "pending" | "approved" | "expired"

export default function DepositDetailClient({ deposit }: { deposit: DepositData }) {
  const router = useRouter()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [paidPending, setPaidPending] = useState(false)
  const [pollStatus, setPollStatus] = useState<PollStatus>("idle")
  const [timeLeft, setTimeLeft] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [pollCountdown, setPollCountdown] = useState(20)

  const isExpired = !!deposit.expiresAt && new Date(deposit.expiresAt) < new Date()
  const isPending = ["pending", "processing"].includes(deposit.status)

  // ── Expiry countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (!deposit.expiresAt || !isPending) return
    function update() {
      const secs = Math.max(0, Math.floor((new Date(deposit.expiresAt!).getTime() - Date.now()) / 1000))
      setTimeLeft(secs)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [deposit.expiresAt, isPending])

  function fmtTimeLeft(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0")
    const s = (secs % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  // ── Copy helper ────────────────────────────────────────────────────────
  function copy(value: string, field: string) {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value).catch(() => legacyCopy(value))
      } else {
        legacyCopy(value)
      }
    } catch {
      legacyCopy(value)
    }
    setCopiedField(field)
    toast.success(`${field} copied!`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function legacyCopy(value: string) {
    const el = document.createElement("textarea")
    el.value = value
    el.style.cssText = "position:fixed;opacity:0;pointer-events:none"
    document.body.appendChild(el)
    el.focus()
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
  }

  // ── Polling ────────────────────────────────────────────────────────────
  const runPoll = useCallback(async () => {
    setPollStatus("checking")
    try {
      const res = await fetch(`/api/deposits/check?reference=${deposit.reference}`)
      const data = await res.json() as { status: string; ok: boolean }
      setPollStatus(data.status as PollStatus)
      setPollCountdown(20)
      if (data.status === "approved") {
        toast.success("Payment confirmed! Wallet credited.")
        router.refresh()
      } else if (data.status === "expired") {
        toast.error("This payment session has expired.")
        router.refresh()
      }
    } catch {
      setPollStatus("pending")
    }
  }, [deposit.reference, router])

  useEffect(() => {
    if (!isPending) return
    const first = setTimeout(() => runPoll(), 8_000)
    pollRef.current = setInterval(() => runPoll(), 20_000)
    countRef.current = setInterval(() => setPollCountdown((c) => (c <= 1 ? 20 : c - 1)), 1000)
    return () => {
      clearTimeout(first)
      if (pollRef.current) clearInterval(pollRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [isPending, runPoll])

  // ── Mark as paid ───────────────────────────────────────────────────────
  async function handleMarkAsPaid() {
    setPaidPending(true)
    const res = await markDepositAsPaid(deposit.reference)
    setPaidPending(false)
    if (res.ok) {
      toast.success(res.message)
      router.refresh()
    } else {
      toast.error(res.message ?? "Failed")
    }
  }

  // ── Processing state ───────────────────────────────────────────────────
  if (deposit.status === "processing") {
    return (
      <main className="mx-auto flex max-w-md flex-col">
        <PageHeader title="Processing Payment" />
        <div className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink bg-primary/15">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <div>
            <p className="text-2xl font-black">{formatNaira(Number(deposit.amount))}</p>
            <p className="mt-1 text-sm text-muted-foreground">Verifying your payment...</p>
          </div>
          <div className="w-full rounded-2xl border-2 border-ink bg-primary/10 p-4">
            <Zap className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="text-sm font-bold">Auto-verification active</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your wallet will be credited automatically once Paystack confirms.
            </p>
          </div>
          <Link href="/deposits" className="w-full rounded-2xl border-2 border-ink bg-card py-4 text-center text-base font-bold shadow-[3px_3px_0_0_var(--ink)]">
            View All Deposits
          </Link>
        </div>
      </main>
    )
  }

  // ── Expired state ──────────────────────────────────────────────────────
  if (isExpired && isPending) {
    return (
      <main className="mx-auto flex max-w-md flex-col">
        <PageHeader title="Session Expired" />
        <div className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink bg-destructive/15">
            <Clock className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-black">{formatNaira(Number(deposit.amount))}</p>
            <p className="mt-1 text-sm text-destructive font-semibold">This payment session has expired</p>
          </div>
          <p className="text-sm text-muted-foreground">
            If you already made a transfer, contact support. Otherwise start a new deposit.
          </p>
          <Link href="/deposits" className="press w-full rounded-2xl border-2 border-ink bg-primary py-4 text-center text-base font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)]">
            Start New Deposit
          </Link>
        </div>
      </main>
    )
  }

  // ── Active pending state ───────────────────────────────────────────────
  const amt = Number(deposit.amount)
  const isTimeLow = timeLeft > 0 && timeLeft < 300 // under 5 mins

  return (
    <main className="mx-auto flex max-w-md flex-col">
      <PageHeader title="Bank Transfer" />

      <div className="flex flex-col gap-4 p-4">

        {/* Amount + expiry timer */}
        <div className="rounded-3xl border-2 border-ink bg-primary p-5 text-primary-foreground shadow-[4px_4px_0_0_var(--ink)]">
          <p className="text-xs font-bold uppercase tracking-widest opacity-70">Transfer exactly</p>
          <p className="mt-1 text-4xl font-black tabular-nums">{formatNaira(amt)}</p>
          {timeLeft > 0 && (
            <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/30 px-3 py-1 text-xs font-bold ${isTimeLow ? "bg-destructive/20 text-red-200" : "bg-primary-foreground/10"}`}>
              <Clock className="h-3 w-3" />
              Expires in {fmtTimeLeft(timeLeft)}
            </div>
          )}
        </div>

        {/* Virtual account details */}
        <div className="rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)] overflow-hidden">
          <div className="flex items-center gap-2 border-b-2 border-ink bg-secondary px-4 py-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Transfer Destination</p>
          </div>

          {/* Bank name */}
          <div className="flex items-center justify-between border-b border-ink/20 px-4 py-3.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Bank Name</span>
            <span className="font-black text-foreground">{deposit.assignedBankName ?? "Paystack-Titan"}</span>
          </div>

          {/* Account name */}
          <div className="flex items-center justify-between border-b border-ink/20 px-4 py-3.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Account Name</span>
            <span className="font-bold text-foreground">{deposit.assignedAccountName ?? "247 Incum"}</span>
          </div>

          {/* Account number — primary copy target */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Account Number</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-widest text-primary">
                {deposit.assignedAccountNumber ?? "—"}
              </span>
              <button
                onClick={() => copy(deposit.assignedAccountNumber ?? "", "Account number")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                aria-label="Copy account number"
              >
                {copiedField === "Account number" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Amount copy row */}
        <button
          onClick={() => copy(String(amt), "Amount")}
          className="flex items-center justify-between rounded-2xl border-2 border-ink bg-card px-4 py-3 shadow-[2px_2px_0_0_var(--ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Amount</span>
          <div className="flex items-center gap-2">
            <span className="font-black text-foreground">{formatNaira(amt)}</span>
            {copiedField === "Amount"
              ? <Check className="h-4 w-4 text-success" />
              : <Copy className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {/* Notice */}
        <div className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-gold/15 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold-foreground" />
          <p className="text-xs leading-relaxed text-foreground">
            This account number is for this transaction only. Search for{" "}
            <span className="font-bold">Paystack-Titan</span> or{" "}
            <span className="font-bold">Titan-Paystack</span> in your bank app.
          </p>
        </div>

        {/* Auto-detection status */}
        <div className="flex items-center justify-between rounded-2xl border-2 border-ink bg-card px-4 py-3 shadow-[2px_2px_0_0_var(--ink)]">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${pollStatus === "checking" ? "animate-pulse bg-primary" : pollStatus === "approved" ? "bg-success" : "bg-muted-foreground/30"}`} />
            <span className="text-xs font-bold text-muted-foreground">
              {pollStatus === "checking" ? "Checking..." : pollStatus === "approved" ? "Confirmed!" : `Checking in ${pollCountdown}s`}
            </span>
          </div>
          <button
            onClick={runPoll}
            disabled={pollStatus === "checking"}
            className="flex items-center gap-1 rounded-lg border-2 border-ink bg-surface px-2 py-1 text-[10px] font-bold text-muted-foreground disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${pollStatus === "checking" ? "animate-spin" : ""}`} />
            Check now
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={handleMarkAsPaid}
          disabled={paidPending}
          className="press mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-4 text-base font-black uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-50"
        >
          {paidPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          I&apos;ve Made the Transfer
        </button>

        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" />
          Secured by Paystack — credited automatically on confirmation
        </p>

        <p className="text-center font-mono text-[10px] text-muted-foreground/50">
          Ref: {deposit.reference}
        </p>
      </div>
    </main>
  )
}

function PageHeader({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-card px-4 py-4">
      <Link
        href="/deposits"
        aria-label="Back"
        className="press flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="flex-1 text-center text-lg font-bold">{title}</h1>
      <div className="w-10" />
    </div>
  )
}
