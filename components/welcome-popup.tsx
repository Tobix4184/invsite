'use client'

import { useState, useEffect } from 'react'
import { X, TrendingUp, Users, Coins, Send, MessageCircle, ArrowRight } from 'lucide-react'
import { SITE, formatNaira } from '@/lib/plans'

const steps = [
  {
    icon: Coins,
    bg: 'bg-primary',
    fg: 'text-primary-foreground',
    label: 'Step 1',
    title: 'Fund Your Account',
    desc: 'Deposit from ₦3,000 to get started. Your funds are allocated to a real-world investment package.',
  },
  {
    icon: TrendingUp,
    bg: 'bg-success',
    fg: 'text-success-foreground',
    label: 'Step 2',
    title: 'Earn Daily Returns',
    desc: 'Every day your earnings drop straight into your wallet — no delay, no waiting.',
  },
  {
    icon: Users,
    bg: 'bg-gold',
    fg: 'text-gold-foreground',
    label: 'Step 3',
    title: 'Invite & Multiply',
    desc: `Refer friends and earn ${SITE.referralLevel1}% on their investments automatically. No cap.`,
  },
]

export function WelcomePopup({ isNewUser = false }: { isNewUser?: boolean }) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('welcome_popup_seen')
    if (isNewUser || !hasSeenWelcome) {
      setTimeout(() => setShow(true), 400)
    }
    localStorage.setItem('welcome_popup_seen', 'true')
  }, [isNewUser])

  function close() {
    setExiting(true)
    setTimeout(() => setShow(false), 280)
  }

  function next() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1)
    } else {
      close()
    }
  }

  if (!show) return null

  const current = steps[step]
  const Icon = current.icon
  const isLast = step === steps.length - 1

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center overflow-hidden transition-opacity duration-280 ${exiting ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Backdrop */}
      <button
        onClick={close}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close"
      />

      {/* Panel */}
      <div className="relative z-10 mx-4 w-full max-w-sm animate-pop-in">
        {/* Close button */}
        <button
          onClick={close}
          className="press absolute -right-3 -top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-card text-foreground shadow-[3px_3px_0_0_var(--ink)]"
          aria-label="Close welcome"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Bonus badge strip */}
        <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-gold px-4 py-2 shadow-[3px_3px_0_0_var(--ink)]">
          <Coins className="h-4 w-4 text-gold-foreground" />
          <p className="text-sm font-black uppercase text-gold-foreground">
            {formatNaira(SITE.welcomeBonus)} welcome bonus credited!
          </p>
        </div>

        {/* Main card */}
        <div className="rounded-3xl border-2 border-ink bg-card shadow-[6px_6px_0_0_var(--ink)]">
          {/* Step icon area */}
          <div className={`flex flex-col items-center justify-center gap-4 rounded-t-3xl ${current.bg} px-6 py-8 transition-all duration-300`}>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
              <Icon className="h-10 w-10 text-foreground" />
            </div>
            <div className="text-center">
              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${current.fg} opacity-70`}>
                {current.label}
              </p>
              <h2 className={`mt-1 text-2xl font-black leading-tight ${current.fg}`}>{current.title}</h2>
            </div>
          </div>

          {/* Description */}
          <div className="px-6 py-5">
            <p className="text-center text-sm font-semibold leading-relaxed text-muted-foreground">
              {current.desc}
            </p>

            {/* Step dots */}
            <div className="mt-5 flex items-center justify-center gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-2.5 rounded-full border-2 border-ink transition-all duration-300 ${i === step ? 'w-7 bg-primary' : 'w-2.5 bg-surface'}`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={next}
                className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3.5 font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)]"
              >
                {isLast ? 'Start Earning' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </button>

              {isLast && (
                <div className="flex gap-2">
                  <a
                    href={SITE.telegramChannel}
                    target="_blank"
                    rel="noreferrer"
                    className="press flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-ink bg-card py-3 text-xs font-black uppercase text-foreground shadow-[3px_3px_0_0_var(--ink)]"
                  >
                    <Send className="h-3.5 w-3.5 text-primary" /> Channel
                  </a>
                  <a
                    href={SITE.telegramSupport}
                    target="_blank"
                    rel="noreferrer"
                    className="press flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-ink bg-card py-3 text-xs font-black uppercase text-foreground shadow-[3px_3px_0_0_var(--ink)]"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-primary" /> Support
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
