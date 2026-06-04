'use client'

import { useState, useEffect } from 'react'
import { X, Gift } from 'lucide-react'
import { SITE, formatNaira } from '@/lib/plans'

export function WelcomePopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('welcome_popup_seen')
    if (!hasSeenWelcome) {
      setShow(true)
      localStorage.setItem('welcome_popup_seen', 'true')
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden">
      <button
        onClick={() => setShow(false)}
        className="absolute inset-0 z-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
      />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
        <button
          onClick={() => setShow(false)}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
            <Gift className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-bold tracking-tight">Welcome to incomehh!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You&apos;ve received a {formatNaira(SITE.welcomeBonus)} welcome bonus. Start investing today to earn daily income!
        </p>

        <div className="mb-6 rounded-2xl bg-primary/10 p-4">
          <p className="text-xs font-semibold text-primary">How it works:</p>
          <ul className="mt-2 space-y-1 text-left text-xs text-muted-foreground">
            <li>✓ Choose a plan and invest</li>
            <li>✓ Get {SITE.investmentBonusPercent}% instant bonus</li>
            <li>✓ Earn daily for 30 days</li>
            <li>✓ Withdraw & invite friends</li>
          </ul>
        </div>

        <button
          onClick={() => setShow(false)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}
