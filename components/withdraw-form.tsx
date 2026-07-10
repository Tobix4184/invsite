"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { SITE, formatNaira } from "@/lib/plans"
import { requestWithdrawal, getSavedBankDetails, lookupBankAccountName } from "@/app/actions/wallet"

type Bank = { name: string; code: string }

function BankPicker({
  value,
  banks,
  onChange,
}: {
  value: string
  banks: Bank[]
  onChange: (name: string, code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const filtered = query
    ? banks.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
    : banks

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
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface px-4 py-3.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary"
      >
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={`flex-1 text-left ${value ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
          {value || (banks.length === 0 ? "Loading banks..." : "Select your bank")}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
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
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">No banks found</li>
            ) : (
              filtered.map((bank) => (
                <li key={bank.code}>
                  <button
                    type="button"
                    onClick={() => { onChange(bank.name, bank.code); setOpen(false); setQuery("") }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface ${
                      bank.name === value ? "bg-primary/10 font-black text-primary" : ""
                    }`}
                  >
                    {bank.name === value
                      ? <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                      : <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    {bank.name}
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

export function WithdrawForm({
  balance,
  minWithdrawal,
  withdrawalCharge,
}: {
  balance: number
  minWithdrawal: number
  withdrawalCharge: number
}) {
  // Withdrawal window: 9:00 AM – 6:30 PM Nigeria time (UTC+1)
  function isWithinWithdrawalWindow() {
    const now = new Date()
    const nigeriaMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 60) % (24 * 60)
    return nigeriaMinutes >= 9 * 60 && nigeriaMinutes < 18 * 60 + 30
  }

  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [windowOpen, setWindowOpen] = useState(isWithinWithdrawalWindow())

  // Re-check every minute so the button auto-enables/disables
  useEffect(() => {
    const t = setInterval(() => setWindowOpen(isWithinWithdrawalWindow()), 60_000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [banks, setBanks] = useState<Bank[]>([])
  const [step, setStep] = useState<"amount" | "bank" | "confirm">("amount")
  const [form, setForm] = useState({ amount: "", bankName: "", bankCode: "", accountNumber: "", accountName: "" })
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "error">("idle")
  const [lookupMsg, setLookupMsg] = useState("")
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Load live bank list + saved details on mount
  useEffect(() => {
    async function init() {
      const [bankRes, saved] = await Promise.all([
        fetch("/api/banks").then((r) => r.json()).catch(() => ({ ok: false, banks: [] })),
        getSavedBankDetails(),
      ])
      if (bankRes.ok && bankRes.banks?.length) setBanks(bankRes.banks)
      if (saved?.savedBankName) {
        const match = (bankRes.banks as Bank[]).find((b: Bank) => b.name === saved.savedBankName)
        setForm({
          amount: "",
          bankName: saved.savedBankName,
          bankCode: saved.savedBankCode ?? match?.code ?? "",
          accountNumber: saved.savedAccountNumber || "",
          accountName: saved.savedAccountName || "",
        })
      }
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-fetch account name when 10 digits + bank code available
  useEffect(() => {
    if (form.accountNumber.length === 10 && form.bankCode) {
      setLookupState("loading")
      setLookupMsg("")
      startTransition(async () => {
        const res = await lookupBankAccountName(form.accountNumber, form.bankCode)
        if (res.ok && res.accountName) {
          setForm((f) => ({ ...f, accountName: res.accountName! }))
          setLookupState("found")
          setLookupMsg(res.accountName)
        } else {
          setLookupState("error")
          setLookupMsg(res.message ?? "Could not verify. Enter name manually.")
        }
      })
    } else if (form.accountNumber.length < 10) {
      setLookupState("idle")
      setLookupMsg("")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.accountNumber, form.bankCode])

  const amount = Number(form.amount)
  const charge = amount > 0 ? Math.round((amount * withdrawalCharge) / 100) : 0
  const net = amount - charge

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await requestWithdrawal({
        amount,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        bankCode: form.bankCode || undefined,
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

      {/* Withdrawal window notice */}
      {!windowOpen && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-destructive/10 p-4">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-black text-destructive">Withdrawals are currently closed</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Withdrawal window is <span className="font-bold text-foreground">9:00 AM – 6:30 PM</span> (Nigerian time). Please come back during that time.
            </p>
          </div>
        </div>
      )}

      {windowOpen && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-ink bg-success/10 px-4 py-2.5">
          <Clock className="h-4 w-4 shrink-0 text-success" />
          <p className="text-xs font-bold text-success">Withdrawals open now · closes 6:30 PM</p>
        </div>
      )}

      {/* Balance hero card */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-primary p-5 shadow-[4px_4px_0_0_var(--ink)]">
        {/* Decorative circle */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-4 border-white/10" />
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full border-4 border-white/10" />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-widest text-primary-foreground/60">Available Balance</p>
          <p className="mt-1 text-3xl font-black tracking-tight tabular-nums text-primary-foreground">
            {formatNaira(balance)}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
            <p className="text-[11px] font-semibold text-primary-foreground/70">
              {withdrawalCharge}% fee · Min {formatNaira(minWithdrawal)} · {SITE.withdrawalHours}
            </p>
          </div>
        </div>
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-1.5 px-1">
        {(["amount", "bank", "confirm"] as const).map((s, i) => {
          const done = ["amount", "bank", "confirm"].indexOf(step) > i
          const active = step === s
          return (
            <div key={s} className="flex flex-1 items-center gap-1.5">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[10px] font-black transition-all ${
                active ? "bg-primary text-primary-foreground scale-110" :
                done ? "bg-success text-success-foreground" : "bg-surface text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-[11px] font-black uppercase tracking-wide ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < 2 && <div className="h-px flex-1 bg-ink/20" />}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Amount ── */}
      {step === "amount" && (
        <div className="rounded-3xl border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_var(--ink)]">
          <p className="mb-4 text-sm font-black">How much do you want?</p>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {[1000, 2000, 5000, 10000, 20000, 50000]
              .filter((q) => q >= minWithdrawal && q <= balance)
              .slice(0, 6)
              .map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => set("amount")(String(q))}
                  className={`rounded-xl border-2 border-ink py-2.5 text-xs font-black transition-all active:scale-95 ${
                    amount === q
                      ? "bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]"
                      : "bg-surface text-foreground hover:bg-primary/10"
                  }`}
                >
                  {formatNaira(q)}
                </button>
              ))}
          </div>

          <div className={`mb-3 flex items-center gap-3 rounded-2xl border-2 border-ink bg-surface px-4 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30`}>
            <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="number"
              inputMode="numeric"
              placeholder={`Min ${formatNaira(minWithdrawal)}`}
              value={form.amount}
              onChange={(e) => set("amount")(e.target.value)}
              className="flex-1 bg-transparent py-3.5 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
            />
            {amount > 0 && (
              <button type="button" onClick={() => set("amount")("")}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {amount >= minWithdrawal && (
            <div className="mb-4 overflow-hidden rounded-2xl border-2 border-ink">
              <div className="flex items-center justify-between bg-surface px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">Withdrawal</span>
                <span className="font-bold tabular-nums">{formatNaira(amount)}</span>
              </div>
              <div className="flex items-center justify-between border-t-2 border-ink bg-surface px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">Fee ({withdrawalCharge}%)</span>
                <span className="font-bold tabular-nums text-destructive">- {formatNaira(charge)}</span>
              </div>
              <div className="flex items-center justify-between border-t-2 border-ink bg-primary/10 px-4 py-3">
                <span className="text-sm font-black">You receive</span>
                <span className="text-lg font-black tabular-nums text-primary">{formatNaira(net > 0 ? net : 0)}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep("bank")}
            disabled={!windowOpen || amount < minWithdrawal || amount > balance}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-4 text-sm font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-40"
          >
            {!windowOpen ? <Clock className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            {!windowOpen ? "Opens 9:00 AM" : "Continue"}
          </button>
        </div>
      )}

      {/* ── Step 2: Bank details ── */}
      {step === "bank" && (
        <div className="rounded-3xl border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_var(--ink)]">
          <p className="mb-1 text-sm font-black">Bank details</p>
          <p className="mb-4 text-[11px] text-muted-foreground">Account name fetches automatically once you enter your 10-digit number.</p>

          <div className="flex flex-col gap-3">
            {/* Bank picker */}
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-muted-foreground">Bank</label>
              <BankPicker
                value={form.bankName}
                banks={banks}
                onChange={(name, code) => {
                  setForm((f) => ({ ...f, bankName: name, bankCode: code, accountName: "" }))
                  setLookupState("idle")
                }}
              />
            </div>

            {/* Account number */}
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-muted-foreground">Account Number</label>
              <div className={`flex items-center gap-3 rounded-2xl border-2 bg-surface px-4 transition-all focus-within:ring-2 focus-within:ring-primary/30 ${
                lookupState === "found" ? "border-success" : lookupState === "error" ? "border-destructive" : "border-ink focus-within:border-primary"
              }`}>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="0123456789"
                  value={form.accountNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 10)
                    set("accountNumber")(v)
                    if (v.length < 10) set("accountName")("")
                  }}
                  className="flex-1 bg-transparent py-3.5 text-sm font-mono font-semibold tracking-wider outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground"
                />
                {lookupState === "loading" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
                {lookupState === "found" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
              </div>
            </div>

            {/* Account name — auto-filled or manual */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Account Name
                {lookupState === "found" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-black text-success">
                    <BadgeCheck className="h-2.5 w-2.5" /> Auto-verified
                  </span>
                )}
              </label>
              {lookupState === "error" && (
                <p className="mb-1.5 text-[11px] text-destructive">{lookupMsg}</p>
              )}
              <input
                placeholder={lookupState === "loading" ? "Fetching name..." : "Account holder name"}
                value={form.accountName}
                readOnly={lookupState === "found"}
                onChange={(e) => set("accountName")(e.target.value)}
                className={`w-full rounded-2xl border-2 border-ink bg-surface px-4 py-3.5 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-primary/30 ${
                  lookupState === "found" ? "border-success bg-success/5 text-success" : ""
                } ${lookupState === "loading" ? "animate-pulse text-muted-foreground" : ""}`}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setStep("amount")}
              className="press flex-1 rounded-2xl border-2 border-ink bg-surface py-3.5 text-sm font-black">
              Back
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={!form.bankName || form.accountNumber.length < 10 || !form.accountName || lookupState === "loading"}
              className="press flex flex-[2] items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3.5 text-sm font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-40"
            >
              Review <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirm ── */}
      {step === "confirm" && (
        <form onSubmit={handleSubmit} className="rounded-3xl border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_var(--ink)]">
          <p className="mb-4 text-sm font-black">Confirm your request</p>

          {/* Amount breakdown */}
          <div className="mb-3 overflow-hidden rounded-2xl border-2 border-ink">
            <div className="flex items-center justify-between bg-surface px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">Amount requested</span>
              <span className="font-bold tabular-nums">{formatNaira(amount)}</span>
            </div>
            <div className="flex items-center justify-between border-t-2 border-ink bg-surface px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">Fee ({withdrawalCharge}%)</span>
              <span className="font-bold tabular-nums text-destructive">- {formatNaira(charge)}</span>
            </div>
            <div className="flex items-center justify-between border-t-2 border-ink bg-primary/10 px-4 py-3">
              <span className="font-black">You receive</span>
              <span className="text-xl font-black tabular-nums text-primary">{formatNaira(net > 0 ? net : 0)}</span>
            </div>
          </div>

          {/* Bank details */}
          <div className="mb-5 overflow-hidden rounded-2xl border-2 border-ink">
            <div className="border-b-2 border-ink bg-primary px-4 py-2.5">
              <p className="text-[11px] font-black uppercase tracking-widest text-primary-foreground/70">Sending to</p>
            </div>
            <div className="flex flex-col gap-0 divide-y-2 divide-ink bg-surface">
              <ConfirmRow label="Bank" value={form.bankName} />
              <ConfirmRow label="Account No." value={form.accountNumber} mono />
              <ConfirmRow label="Name" value={form.accountName} highlight />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("bank")}
              className="press flex-1 rounded-2xl border-2 border-ink bg-surface py-3.5 text-sm font-black">
              Back
            </button>
            <button type="submit" disabled={pending}
              className="press flex flex-[2] items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3.5 text-sm font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Submitting..." : "Confirm & Submit"}
            </button>
          </div>
        </form>
      )}
    </main>
  )
}

function ConfirmRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${mono ? "font-mono tracking-wider" : ""} ${highlight ? "text-success" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}
