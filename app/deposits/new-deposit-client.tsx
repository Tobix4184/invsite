"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Wallet } from "lucide-react"
import { toast } from "sonner"
import { formatNaira } from "@/lib/plans"
import { startDeposit } from "@/app/actions/deposit"

export function NewDepositClient({ balance, minDeposit }: { balance: number; minDeposit: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [amount, setAmount] = useState("")

  const amountNum = Number(amount)
  const isValid = amountNum >= minDeposit

  const QUICK = [500, 1000, 2000, 5000, 10000, 20000, 50000].filter((q) => q >= minDeposit)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    startTransition(async () => {
      const res = await startDeposit(amountNum)
      if (res.ok && res.reference) {
        router.push(`/deposits/${res.reference}`)
      } else if (res.unavailable) {
        toast.error("Deposits are temporarily unavailable. Please try again later.")
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      {/* Balance card */}
      <div className="card-glass flex items-center gap-3 rounded-2xl p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Wallet Balance</p>
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
              className={`rounded-xl border py-2.5 text-xs font-bold transition-all active:scale-95 ${
                amountNum === q
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {formatNaira(q)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-surface px-4 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <input
              type="number"
              inputMode="numeric"
              placeholder={`Or enter amount (min ${formatNaira(minDeposit)})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          {amountNum > 0 && amountNum < minDeposit && (
            <p className="text-xs text-destructive">
              Minimum deposit is {formatNaira(minDeposit)}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !isValid}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-black text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 glow-primary"
          >
            {pending && <Loader2 className="h-5 w-5 animate-spin" />}
            {pending ? "Getting account details..." : `Continue${isValid ? ` — ${formatNaira(amountNum)}` : ""}`}
          </button>
        </form>
      </div>
    </div>
  )
}
