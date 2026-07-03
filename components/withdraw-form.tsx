"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Clock,
  CreditCard,
  Loader2,
  Search,
  User,
  Wallet,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { SITE, formatNaira } from "@/lib/plans"
import { requestWithdrawal, getSavedBankDetails } from "@/app/actions/wallet"

// Full list of Nigerian banks
const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Globus Bank",
  "Guaranty Trust Bank (GTBank)",
  "Heritage Bank",
  "Jaiz Bank",
  "Keystone Bank",
  "Lotus Bank",
  "Optimus Bank",
  "Parallex Bank",
  "Polaris Bank",
  "Premium Trust Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
  // Fintechs / Microfinance
  "Carbon (One Finance)",
  "EKONDO Microfinance Bank",
  "Fairmoney Microfinance Bank",
  "Kuda Bank",
  "Moniepoint Microfinance Bank",
  "OPay (PayCom)",
  "PalmPay",
  "Sparkle Microfinance Bank",
  "VFD Microfinance Bank",
  "9PSB (9 Payment Service Bank)",
].sort()

function BankPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query
    ? NIGERIAN_BANKS.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
    : NIGERIAN_BANKS

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border-2 border-ink bg-surface px-4 py-3.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary"
      >
        <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>
          {value || "Select bank"}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
          {/* Search */}
          <div className="flex items-center gap-2 border-b-2 border-ink px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              placeholder="Search bank..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* List */}
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">No banks found</li>
            ) : (
              filtered.map((bank) => (
                <li key={bank}>
                  <button
                    type="button"
                    onClick={() => { onChange(bank); setOpen(false); setQuery("") }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface ${
                      bank === value ? "bg-primary/15 font-black text-primary" : ""
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {bank}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export function WithdrawForm({ balance }: { balance: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<"amount" | "bank" | "confirm">("amount")
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  })
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    startTransition(async () => {
      const saved = await getSavedBankDetails()
      if (saved?.savedBankName) {
        setForm({
          amount: "",
          bankName: saved.savedBankName,
          accountNumber: saved.savedAccountNumber || "",
          accountName: saved.savedAccountName || "",
        })
      }
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const amount = Number(form.amount)
  const charge = amount > 0 ? Math.round((amount * SITE.withdrawalCharge) / 100) : 0
  const net = amount - charge

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
      <main className="mx-auto max-w-md px-4 py-5">
        <div className="h-64 animate-pulse rounded-3xl border-2 border-ink bg-surface" />
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">

      {/* Balance hero */}
      <div className="card-glass rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-ink bg-primary">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-black tracking-tight tabular-nums">{formatNaira(balance)}</p>
          </div>
        </div>

        {/* Info bar */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border-2 border-ink bg-gold/20 px-3 py-2.5">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-foreground" />
          <p className="text-[11px] font-semibold leading-relaxed text-foreground">
            Processed {SITE.withdrawalHours}. {SITE.withdrawalCharge}% fee applies. Min{" "}
            {formatNaira(SITE.minWithdrawal)}.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 px-1">
        {(["amount", "bank", "confirm"] as const).map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[11px] font-black transition-colors ${
              step === s ? "bg-primary text-primary-foreground" :
              (["amount", "bank", "confirm"].indexOf(step) > i) ? "bg-success text-success-foreground" : "bg-surface text-muted-foreground"
            }`}>
              {i + 1}
            </div>
            <span className={`text-[11px] font-black uppercase tracking-wide ${step === s ? "text-foreground" : "text-muted-foreground"}`}>
              {s}
            </span>
            {i < 2 && <div className="h-0.5 flex-1 bg-ink/20" />}
          </div>
        ))}
      </div>

      {/* Step: Amount */}
      {step === "amount" && (
        <div className="card-glass rounded-3xl p-5">
          <p className="mb-4 text-sm font-black">How much to withdraw?</p>

          {/* Quick amounts */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[1000, 2000, 5000, 10000, 20000, 50000]
              .filter((q) => q >= SITE.minWithdrawal && q <= balance)
              .map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => set("amount")(String(q))}
                  className={`rounded-xl border-2 border-ink py-2.5 text-xs font-black transition-all active:scale-95 ${
                    amount === q
                      ? "bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]"
                      : "bg-surface text-muted-foreground"
                  }`}
                >
                  {formatNaira(q)}
                </button>
              ))}
          </div>

          <div className="mb-3 rounded-2xl border-2 border-ink bg-surface px-4 transition-all focus-within:ring-2 focus-within:ring-primary">
            <input
              type="number"
              inputMode="numeric"
              placeholder={`Enter amount (min ${formatNaira(SITE.minWithdrawal)})`}
              value={form.amount}
              onChange={(e) => set("amount")(e.target.value)}
              className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {amount > 0 && (
            <div className="mb-4 rounded-2xl border-2 border-ink bg-surface p-3 text-xs">
              <div className="flex justify-between py-0.5 text-muted-foreground">
                <span>Amount</span><span className="tabular-nums font-semibold text-foreground">{formatNaira(amount)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-muted-foreground">
                <span>Fee ({SITE.withdrawalCharge}%)</span><span className="tabular-nums text-destructive">- {formatNaira(charge)}</span>
              </div>
              <div className="mt-1.5 flex justify-between border-t-2 border-ink pt-1.5">
                <span className="font-bold">You receive</span>
                <span className="tabular-nums font-black text-success">{formatNaira(net > 0 ? net : 0)}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep("bank")}
            disabled={amount < SITE.minWithdrawal || amount > balance}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-4 text-sm font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-50"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step: Bank details */}
      {step === "bank" && (
        <div className="card-glass rounded-3xl p-5">
          <p className="mb-4 text-sm font-black">Bank details</p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Building2 className="mr-1 inline h-3 w-3" />Bank
              </label>
              <BankPicker value={form.bankName} onChange={set("bankName")} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <CreditCard className="mr-1 inline h-3 w-3" />Account Number
              </label>
              <input
                inputMode="numeric"
                maxLength={10}
                placeholder="0123456789"
                value={form.accountNumber}
                onChange={(e) => set("accountNumber")(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full rounded-2xl border-2 border-ink bg-surface px-4 py-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <User className="mr-1 inline h-3 w-3" />Account Name
              </label>
              <input
                placeholder="Account holder name"
                value={form.accountName}
                onChange={(e) => set("accountName")(e.target.value)}
                className="w-full rounded-2xl border-2 border-ink bg-surface px-4 py-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setStep("amount")}
              className="press flex-1 rounded-2xl border-2 border-ink bg-card py-3.5 text-sm font-black text-foreground shadow-[3px_3px_0_0_var(--ink)]"
            >
              Back
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={!form.bankName || form.accountNumber.length < 10 || !form.accountName}
              className="press flex-[2] rounded-2xl border-2 border-ink bg-primary py-3.5 text-sm font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-50"
            >
              Review <ArrowRight className="ml-1 inline h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <form onSubmit={handleSubmit} className="card-glass rounded-3xl p-5">
          <p className="mb-4 text-sm font-black">Confirm withdrawal</p>

          <div className="mb-4 flex flex-col gap-2 rounded-2xl border-2 border-ink bg-surface p-4 text-sm">
            <Row label="Amount" value={formatNaira(amount)} />
            <Row label={`Fee (${SITE.withdrawalCharge}%)`} value={`- ${formatNaira(charge)}`} accent="destructive" />
            <div className="border-t-2 border-ink pt-2">
              <Row label="You receive" value={formatNaira(net > 0 ? net : 0)} accent="success" bold />
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-2 rounded-2xl border-2 border-ink bg-surface p-4 text-sm">
            <Row label="Bank" value={form.bankName} />
            <Row label="Account" value={form.accountNumber} />
            <Row label="Name" value={form.accountName} />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("bank")}
              className="press flex-1 rounded-2xl border-2 border-ink bg-card py-3.5 text-sm font-black text-foreground shadow-[3px_3px_0_0_var(--ink)]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={pending}
              className="press flex flex-[2] items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3.5 text-sm font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      )}
    </main>
  )
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string
  value: string
  bold?: boolean
  accent?: "success" | "destructive"
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums ${bold ? "font-black text-lg" : "font-semibold"} ${
          accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  )
}
