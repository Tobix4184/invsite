"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Wallet, Zap, Building2 } from "lucide-react"
import { toast } from "sonner"
import { formatNaira } from "@/lib/plans"
import { startPaystackDeposit, startIncumPayDeposit } from "@/app/actions/deposit"

export function NewDepositClient({ balance, minDeposit }: { balance: number; minDeposit: number }) {
  const router = useRouter()
  const [paystackPending, startPaystackTransition] = useTransition()
  const [incumPending, startIncumTransition] = useTransition()
  const [amount, setAmount] = useState("")

  const amountNum = Number(amount)
  const isValid = amountNum >= minDeposit
  const pending = paystackPending || incumPending

  const QUICK = [500, 1000, 2000, 3000, 5000, 10000, 20000, 50000].filter((q) => q >= minDeposit)

  function handlePaystack() {
    if (!isValid) return
    startPaystackTransition(async () => {
      const res = await startPaystackDeposit(amountNum)
      if (res.ok && "authorizationUrl" in res && res.authorizationUrl) {
        // Redirect to Paystack checkout
        window.location.href = res.authorizationUrl
      } else if (!res.ok && "unavailable" in res && res.unavailable) {
        toast.error("Deposits are temporarily unavailable. Please try again later.")
      } else if (!res.ok) {
        toast.error(res.message)
      }
    })
  }

  function handleIncumPay() {
    if (!isValid) return
    startIncumTransition(async () => {
      const res = await startIncumPayDeposit(amountNum)
      if (res.ok && "reference" in res && res.reference) {
        router.push(`/deposits/${res.reference}`)
      } else if (!res.ok && "unavailable" in res && res.unavailable) {
        toast.error("Deposits are temporarily unavailable. Please try again later.")
      } else if (!res.ok) {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      {/* Balance card */}
      <div className="card-glass flex items-center gap-3 rounded-2xl p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-ink bg-primary">
          <Wallet className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Wallet Balance</p>
          <p className="text-xl font-black tabular-nums">{formatNaira(balance)}</p>
        </div>
      </div>

      {/* Deposit form */}
      <div className="card-glass rounded-3xl p-5">
        <p className="mb-4 text-sm font-black">How much do you want to deposit?</p>

        {/* Quick amounts */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className={`rounded-xl border-2 border-ink py-2.5 text-xs font-black transition-all active:scale-95 ${
                amountNum === q
                  ? "bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]"
                  : "bg-surface text-muted-foreground"
              }`}
            >
              {formatNaira(q)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border-2 border-ink bg-surface px-4 transition-all focus-within:ring-2 focus-within:ring-primary">
            <input
              type="number"
              inputMode="numeric"
              placeholder={`Or enter amount (min ${formatNaira(minDeposit)})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent py-3.5 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
            />
          </div>

          {amountNum > 0 && amountNum < minDeposit && (
            <p className="text-xs font-bold text-destructive">
              Minimum deposit is {formatNaira(minDeposit)}
            </p>
          )}

          {/* Payment method buttons */}
          <p className="mt-1 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Choose payment method
          </p>

          {/* Paystack */}
          <button
            type="button"
            onClick={handlePaystack}
            disabled={pending || !isValid}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-4 text-base font-black uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
          >
            {paystackPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Zap className="h-5 w-5" />
            )}
            {paystackPending ? "Redirecting..." : `Pay with Paystack${isValid ? ` — ${formatNaira(amountNum)}` : ""}`}
          </button>

          {/* IncumPay */}
          <button
            type="button"
            onClick={handleIncumPay}
            disabled={pending || !isValid}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-card py-4 text-base font-black uppercase tracking-wide text-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
          >
            {incumPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
            {incumPending ? "Getting account..." : `Pay with IncumPay${isValid ? ` — ${formatNaira(amountNum)}` : ""}`}
          </button>

          <div className="flex items-start gap-3 rounded-xl border border-ink/20 bg-surface px-3 py-2.5">
            <div className="mt-0.5 flex flex-col gap-1 text-[10px] text-muted-foreground leading-relaxed">
              <span><span className="font-bold text-foreground">Paystack</span> — card, transfer & USSD. Auto-credited instantly.</span>
              <span><span className="font-bold text-foreground">IncumPay</span> — direct bank transfer. Credited after admin confirms.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
