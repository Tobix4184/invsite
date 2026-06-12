"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Wallet } from "lucide-react"
import { toast } from "sonner"
import { SITE, formatNaira } from "@/lib/plans"
import { startDeposit } from "@/app/actions/deposit"

export function NewDepositClient({ balance }: { balance: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [amount, setAmount] = useState("")
  const [open, setOpen] = useState(false)

  const amountNum = Number(amount)
  const isValid = amountNum >= SITE.minDeposit

  const QUICK = [1000, 2000, 5000, 10000, 20000, 50000]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    startTransition(async () => {
      const res = await startDeposit(amountNum)
      if (res.ok && res.reference) {
        toast.success("Deposit created — transfer to the account below")
        router.push(`/deposits/${res.reference}`)
        router.refresh()
      } else if (res.unavailable) {
        toast.error("Deposits are temporarily unavailable. Please try again later.")
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Balance card */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-lg font-black">{formatNaira(balance)}</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Deposit
        </button>
      </div>

      {/* Deposit form */}
      {open && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-bold">New Deposit</p>

          {/* Quick amounts */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className={`rounded-xl border py-2 text-xs font-bold transition-colors ${
                  amountNum === q
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
                }`}
              >
                {formatNaira(q)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-secondary/50 px-4 focus-within:border-primary">
              <input
                type="number"
                inputMode="numeric"
                placeholder={`Amount (min ${formatNaira(SITE.minDeposit)})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            {amountNum > 0 && amountNum < SITE.minDeposit && (
              <p className="text-xs text-destructive">
                Minimum deposit is {formatNaira(SITE.minDeposit)}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || !isValid}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Creating deposit..." : `Deposit ${isValid ? formatNaira(amountNum) : ""}`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
