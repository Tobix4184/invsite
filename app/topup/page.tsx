'use client'

import { Suspense, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ShieldCheck, Wallet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { PLANS, SITE, formatNaira } from '@/lib/plans'
import { startDeposit } from '@/app/actions/deposit'
import { cn } from '@/lib/utils'

const QUICK_AMOUNTS = [3000, 5000, 10000, 15000, 20000, 30000, 50000, 100000, 200000]

function TopupContent() {
  const params = useSearchParams()
  const planId = Number(params.get('plan'))
  const presetPlan = PLANS.find((p) => p.id === planId)

  const [selected, setSelected] = useState<number | null>(presetPlan?.price ?? null)
  const [custom, setCustom] = useState('')

  const customValue = Number(custom)
  const amount = custom ? customValue : selected ?? 0
  const valid = amount >= SITE.minDeposit
  const [pending, startTransition] = useTransition()

  function handleDeposit() {
    startTransition(async () => {
      const res = await startDeposit(amount)
      if (res.ok) {
        toast.success(res.message ?? "Deposit request submitted!")
        setSelected(null)
        setCustom('')
      } else {
        toast.error(res.message ?? "Could not submit deposit request")
      }
    })
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
        <div>
          <h1 className="text-xl font-bold tracking-tight">Topup / Recharge</h1>
          <p className="text-xs text-muted-foreground">
            Minimum deposit {formatNaira(SITE.minDeposit)}
          </p>
        </div>
      </div>

      {presetPlan && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
          <Wallet className="h-5 w-5 text-primary" />
          <p className="text-sm">
            Activating <span className="font-bold">{presetPlan.name}</span> — earns{' '}
            <span className="font-semibold text-success">{formatNaira(presetPlan.daily)}</span>/day
          </p>
        </div>
      )}

      <section>
        <p className="mb-2 text-sm font-semibold">Select amount</p>
        <div className="grid grid-cols-3 gap-2.5">
          {QUICK_AMOUNTS.map((amt) => {
            const active = !custom && selected === amt
            return (
              <button
                key={amt}
                onClick={() => {
                  setSelected(amt)
                  setCustom('')
                }}
                className={cn(
                  'rounded-xl border py-3 text-sm font-bold tabular-nums transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-secondary',
                )}
              >
                {formatNaira(amt)}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <label htmlFor="custom" className="mb-2 block text-sm font-semibold">
          Custom Amount
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-1 focus-within:border-primary">
          <span className="text-lg font-bold text-muted-foreground">₦</span>
          <input
            id="custom"
            type="number"
            inputMode="numeric"
            placeholder="Enter amount"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value)
              setSelected(null)
            }}
            className="w-full bg-transparent py-3 text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </div>
      </section>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount to deposit</span>
          <span className="text-xl font-bold tabular-nums">{formatNaira(amount)}</span>
        </div>
        {!valid && amount > 0 && (
          <p className="mt-2 text-xs text-destructive">
            Amount must be at least {formatNaira(SITE.minDeposit)}.
          </p>
        )}
      </div>

      <button
        disabled={!valid || pending}
        onClick={handleDeposit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" />}
        Deposit Now
      </button>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-success" />
        Your request will be reviewed by our team • Funds reflect after approval
      </p>
    </main>
  )
}

export default function TopupPage() {
  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Topup" />
      <Suspense fallback={<div className="mx-auto max-w-md px-4 py-8 text-muted-foreground">Loading…</div>}>
        <TopupContent />
      </Suspense>
      <BottomNav />
    </div>
  )
}
