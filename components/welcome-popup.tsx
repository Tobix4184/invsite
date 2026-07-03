'use client'

import { useState, useEffect } from 'react'
import { X, Gift, Send, MessageCircle } from 'lucide-react'
import { SITE, formatNaira } from '@/lib/plans'

export function WelcomePopup({ isNewUser = false }: { isNewUser?: boolean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Show if the server says this is a brand-new account, OR if localStorage
    // hasn't been set yet (covers edge cases like social auth).
    const hasSeenWelcome = localStorage.getItem('welcome_popup_seen')
    if (isNewUser || !hasSeenWelcome) {
      setShow(true)
    }
    localStorage.setItem('welcome_popup_seen', 'true')
  }, [isNewUser])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden">
      <button
        onClick={() => setShow(false)}
        className="absolute inset-0 z-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
      />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-3xl border-2 border-ink bg-card p-6 text-center shadow-[6px_6px_0_0_var(--ink)]">
        <button
          onClick={() => setShow(false)}
          className="press absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-card text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink bg-primary shadow-[3px_3px_0_0_var(--ink)]">
            <Gift className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-black uppercase tracking-tight">Welcome to {SITE.name}!</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          You&apos;ve received a {formatNaira(SITE.welcomeBonus)} welcome bonus. Start investing today to earn daily income!
        </p>

        <div className="mb-5 rounded-2xl border-2 border-ink bg-surface p-4">
          <p className="text-xs font-black uppercase tracking-wide text-foreground">How it works:</p>
          <ul className="mt-2 space-y-1 text-left text-xs font-semibold text-muted-foreground">
            <li>1. Choose a plan and invest</li>
            <li>2. Earn up to 5% daily returns</li>
            <li>3. Earn daily for 30 days</li>
            <li>4. Withdraw & invite friends</li>
          </ul>
        </div>

        <div className="mb-4 flex flex-col gap-2">
          <a
            href={SITE.telegramChannel}
            target="_blank"
            rel="noreferrer"
            className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3 text-sm font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
          >
            <Send className="h-4 w-4" /> Join Our Telegram Channel
          </a>
          <a
            href={`https://t.me/${SITE.telegramSupport}`}
            target="_blank"
            rel="noreferrer"
            className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-card py-3 text-sm font-black uppercase text-foreground shadow-[3px_3px_0_0_var(--ink)]"
          >
            <MessageCircle className="h-4 w-4" /> Contact Support
          </a>
        </div>

        <button
          onClick={() => setShow(false)}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-gold py-3.5 font-black uppercase text-gold-foreground shadow-[4px_4px_0_0_var(--ink)]"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}
