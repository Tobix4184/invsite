"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { SITE, formatNaira } from "@/lib/plans"
import { requestWithdrawal, getSavedBankDetails } from "@/app/actions/wallet"

export function WithdrawForm({ balance }: { balance: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [hasSavedDetails, setHasSavedDetails] = useState(false)
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  })
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Load saved bank details on mount
  useEffect(() => {
    startTransition(async () => {
      const saved = await getSavedBankDetails()
      if (saved) {
        setForm({
          amount: "",
          bankName: saved.savedBankName || "",
          accountNumber: saved.savedAccountNumber || "",
          accountName: saved.savedAccountName || "",
        })
        setHasSavedDetails(true)
      }
      setLoading(false)
    })
  }, [])

  const amount = Number(form.amount)
  const charge = amount > 0 ? Math.round((amount * SITE.withdrawalCharge) / 100) : 0
  const net = amount - charge

  function handleClearDetails() {
    setForm((f) => ({ ...f, bankName: "", accountNumber: "", accountName: "" }))
    setHasSavedDetails(false)
  }

  function handleSubmit() {
    startTransition(async () => {
      const res = await requestWithdrawal({
        amount,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
      })
      if (res.ok) {
        toast.success(res.message)
        router.push("/dashboard")
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  if (loading) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Withdraw Funds</h1>
          <p className="text-xs text-muted-foreground">Available: {formatNaira(balance)}</p>
        </div>
        {hasSavedDetails && (
          <button
            onClick={handleClearDetails}
            title="Use different bank details"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
        <Clock className="h-5 w-5 shrink-0" />
        <p>
          Withdrawals processed {SITE.withdrawalHours}. A {SITE.withdrawalCharge}% fee applies. Minimum{" "}
          {formatNaira(SITE.minWithdrawal)}.
        </p>
      </div>

      {hasSavedDetails && (
        <div className="rounded-2xl border border-success/30 bg-success/10 p-3 text-xs text-success">
          Using saved bank details. Click the refresh button to change.
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        <FormField label="Amount (₦)">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Enter amount"
            value={form.amount}
            onChange={(e) => set("amount")(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </FormField>
        <FormField label="Bank Name">
          <input
            placeholder="e.g. Access Bank"
            value={form.bankName}
            onChange={(e) => set("bankName")(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </FormField>
        <FormField label="Account Number">
          <input
            inputMode="numeric"
            placeholder="0123456789"
            value={form.accountNumber}
            onChange={(e) => set("accountNumber")(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </FormField>
        <FormField label="Account Name">
          <input
            placeholder="Account holder name"
            value={form.accountName}
            onChange={(e) => set("accountName")(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </FormField>

        {amount > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
            <Row label="Withdrawal amount" value={formatNaira(amount)} />
            <Row label={`Fee (${SITE.withdrawalCharge}%)`} value={`- ${formatNaira(charge)}`} />
            <div className="my-2 border-t border-border" />
            <Row label="You receive" value={formatNaira(net > 0 ? net : 0)} bold />
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-5 w-5 animate-spin" />}
          Request Withdrawal
        </button>
      </form>
    </main>
  )
}

      <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
        <Clock className="h-5 w-5 shrink-0" />
        <p>
          Withdrawals processed {SITE.withdrawalHours}. A {SITE.withdrawalCharge}% fee applies. Minimum{" "}
          {formatNaira(SITE.minWithdrawal)}.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        <FormField label="Amount (₦)">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Enter amount"
            value={form.amount}
            onChange={(e) => set("amount")(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </FormField>
        <FormField label="Bank Name">
          <input
            placeholder="e.g. Access Bank"
            value={form.bankName}
            onChange={(e) => set("bankName")(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </FormField>
        <FormField label="Account Number">
          <input
            inputMode="numeric"
            placeholder="0123456789"
            value={form.accountNumber}
            onChange={(e) => set("accountNumber")(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </FormField>
        <FormField label="Account Name">
          <input
            placeholder="Account holder name"
            value={form.accountName}
            onChange={(e) => set("accountName")(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </FormField>

        {amount > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
            <Row label="Withdrawal amount" value={formatNaira(amount)} />
            <Row label={`Fee (${SITE.withdrawalCharge}%)`} value={`- ${formatNaira(charge)}`} />
            <div className="my-2 border-t border-border" />
            <Row label="You receive" value={formatNaira(net > 0 ? net : 0)} bold />
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-5 w-5 animate-spin" />}
          Request Withdrawal
        </button>
      </form>
    </main>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="rounded-2xl border border-border bg-secondary/50 px-4 focus-within:border-primary">{children}</div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold text-success tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  )
}
