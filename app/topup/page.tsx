'use client'

import { Suspense, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck, Wallet, Loader2, Copy, Check, User, Clock, AlertTriangle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { PLANS, SITE, formatNaira } from '@/lib/plans'
import { startDeposit, updateDepositSenderName, markDepositAsPaid } from '@/app/actions/deposit'
import { cn } from '@/lib/utils'

const QUICK_AMOUNTS = [3000, 5000, 10000, 15000, 20000, 30000, 50000, 100000, 200000]

type BankAccountInfo = {
  bankName: string
  accountNumber: string
  accountName: string
}

function TopupContent() {
  const params = useSearchParams()
  const router = useRouter()
  const planId = Number(params.get('plan'))
  const presetPlan = PLANS.find((p) => p.id === planId)

  const [selected, setSelected] = useState<number | null>(presetPlan?.price ?? null)
  const [custom, setCustom] = useState('')
  const [step, setStep] = useState<'amount' | 'confirm' | 'unavailable'>('amount')
  const [depositRef, setDepositRef] = useState<string | null>(null)
  const [bankAccount, setBankAccount] = useState<BankAccountInfo | null>(null)
  const [expiryTime, setExpiryTime] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [savingSenderName, setSavingSenderName] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)

  const customValue = Number(custom)
  const amount = custom ? customValue : selected ?? 0
  const valid = amount >= SITE.minDeposit
  const [pending, startTransition] = useTransition()

  function handleProceed() {
    if (!valid) return
    startTransition(async () => {
      const res = await startDeposit(amount)
      if (res.ok && res.reference && res.bankAccount) {
        setDepositRef(res.reference)
        setBankAccount(res.bankAccount)
        setExpiryTime(res.expiresAt ? new Date(res.expiresAt) : null)
        setStep('confirm')
      } else if ('unavailable' in res && res.unavailable) {
        setStep('unavailable')
      } else {
        toast.error(res.message ?? "Could not submit deposit request")
      }
    })
  }

  function handleRetry() {
    startTransition(async () => {
      const res = await startDeposit(amount)
      if (res.ok && res.reference && res.bankAccount) {
        setDepositRef(res.reference)
        setBankAccount(res.bankAccount)
        setExpiryTime(res.expiresAt ? new Date(res.expiresAt) : null)
        setStep('confirm')
      } else {
        // Still unavailable — keep the user on the unavailable screen
        setStep('unavailable')
      }
    })
  }

  function handleCopyAccount() {
    if (!bankAccount) return
    navigator.clipboard.writeText(bankAccount.accountNumber)
    setCopied(true)
    toast.success('Account number copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleBack() {
    setStep('amount')
    setDepositRef(null)
    setBankAccount(null)
    setExpiryTime(null)
    setSenderName('')
  }

  async function handleSaveSenderName() {
    if (!depositRef || !senderName.trim()) return
    setSavingSenderName(true)
    const res = await updateDepositSenderName(depositRef, senderName)
    setSavingSenderName(false)
    if (res.ok) {
      toast.success('Sender name saved')
    } else {
      toast.error(res.message ?? 'Failed to save sender name')
    }
  }

  async function handleMarkAsPaid() {
    if (!depositRef) return
    setMarkingPaid(true)
    
    // Save sender name first if provided
    if (senderName.trim()) {
      await updateDepositSenderName(depositRef, senderName)
    }
    
    const res = await markDepositAsPaid(depositRef)
    if (res.ok) {
      toast.success('Payment marked as complete')
      // Redirect to deposit detail page to show processing status
      router.push(`/deposits/${depositRef}`)
    } else {
      toast.error(res.message ?? 'Failed to mark as paid')
      setMarkingPaid(false)
    }
  }

  function formatExpiry(date: Date) {
    return date.toLocaleString('en-NG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Unavailable state (e.g. generating account details failed)
  if (step === 'unavailable') {
    return (
      <main className="mx-auto flex max-w-md flex-col">
        <div className="flex items-center gap-3 bg-card px-4 py-4">
          <button
            onClick={() => setStep('amount')}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-lg font-bold">Payment Details</h1>
          <div className="w-10" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Service Unavailable</h2>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t generate your payment account right now. Please try again in a moment.
            </p>
          </div>
          <button
            onClick={handleRetry}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
            Try Again
          </button>
        </div>
      </main>
    )
  }

  // Step 2: Payment Confirmation
  if (step === 'confirm' && bankAccount) {
    return (
      <main className="mx-auto flex max-w-md flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 bg-card px-4 py-4">
          <button
            onClick={handleBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-lg font-bold">Payment Confirmation</h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 bg-background p-4">
          {/* Instructions */}
          <p className="text-center text-sm text-foreground">
            Kindly send <span className="font-bold text-primary">{formatNaira(amount)}</span> to the account details below.
          </p>

          {/* Warning Box */}
          <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4">
            <p className="text-center text-sm text-destructive">
              <span className="font-bold">Important:</span> Send exactly {formatNaira(amount)}. Sending a different amount may result in loss of funds.
            </p>
          </div>

          {/* Bank Details */}
          <div className="flex flex-col gap-3">
            {/* Deposit Amount */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <span className="text-sm text-muted-foreground">Deposit Amount</span>
              <span className="text-lg font-bold text-primary">{formatNaira(amount)}</span>
            </div>

            {/* Bank Name */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <span className="text-sm text-muted-foreground">Bank Name</span>
              <span className="font-bold text-foreground">{bankAccount.bankName}</span>
            </div>

            {/* Account Name */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <span className="text-sm text-muted-foreground">Account Name</span>
              <span className="text-right font-bold text-foreground">{bankAccount.accountName}</span>
            </div>

            {/* Account Number with Copy */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <span className="text-sm text-muted-foreground">Account Number</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">{bankAccount.accountNumber}</span>
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

          {/* Sender Name Input (Optional) */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4 text-muted-foreground" />
              Sender Name <span className="text-xs text-muted-foreground">(Recommended)</span>
            </label>
            <p className="mb-3 text-xs text-muted-foreground">
              Enter the name on your bank account to speed up verification
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                onClick={handleSaveSenderName}
                disabled={!senderName.trim() || savingSenderName}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {savingSenderName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>

          {/* Expiry Notice */}
          {expiryTime && (
            <p className="text-center text-sm text-muted-foreground">
              Please note that payment expires on{' '}
              <span className="font-medium text-foreground">{formatExpiry(expiryTime)}</span>
            </p>
          )}

          {/* Reference */}
          {depositRef && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-center text-xs text-muted-foreground">
                Reference: <span className="font-mono font-medium text-foreground">{depositRef}</span>
              </p>
            </div>
          )}

          {/* Done Button */}
          <button
            onClick={handleMarkAsPaid}
            disabled={markingPaid}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {markingPaid && <Loader2 className="h-5 w-5 animate-spin" />}
            I&apos;ve Made the Transfer
          </button>

          <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            Payment will be processed within 0-15 minutes
          </p>

          {/* View deposit history link */}
          <Link
            href="/deposits"
            className="flex items-center justify-center gap-1.5 text-center text-xs text-primary underline"
          >
            <Clock className="h-3.5 w-3.5" />
            View deposit history
          </Link>
        </div>
      </main>
    )
  }

  // Step 1: Select Amount
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
        onClick={handleProceed}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" />}
        Proceed to Payment
      </button>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-success" />
        Manual bank transfer - Funds reflect after admin confirmation
      </p>
    </main>
  )
}

export default function TopupPage() {
  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Topup" />
      <Suspense fallback={<div className="mx-auto max-w-md px-4 py-8 text-muted-foreground">Loading...</div>}>
        <TopupContent />
      </Suspense>
      <BottomNav />
    </div>
  )
}
