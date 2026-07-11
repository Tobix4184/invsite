'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, HeartHandshake, Send } from 'lucide-react'
import { SITE } from '@/lib/plans'

const STORAGE_KEY = (version: string) => `apology_popup_dismissed_v${version}`

export function ApologyPopup({ version }: { version: string }) {
  const [show, setShow] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY(version))
    if (!dismissed) {
      const t = setTimeout(() => setShow(true), 600)
      return () => clearTimeout(t)
    }
  }, [version])

  function close() {
    setExiting(true)
    localStorage.setItem(STORAGE_KEY(version), Date.now().toString())
    setTimeout(() => setShow(false), 280)
  }

  if (!show) return null

  return (
    <div
      className={`fixed inset-0 z-[997] flex items-center justify-center overflow-hidden transition-opacity duration-280 ${exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Backdrop */}
      <button
        onClick={close}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close"
      />

      {/* Panel */}
      <div className="relative z-10 mx-4 w-full max-w-sm animate-pop-in">
        {/* Close */}
        <button
          onClick={close}
          className="press absolute -right-3 -top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-card text-foreground shadow-[3px_3px_0_0_var(--ink)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header bar */}
        <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-gold px-4 py-2 shadow-[3px_3px_0_0_var(--ink)]">
          <AlertTriangle className="h-4 w-4 text-gold-foreground" />
          <p className="text-sm font-black uppercase text-gold-foreground">Important Notice</p>
        </div>

        {/* Main card */}
        <div className="rounded-3xl border-2 border-ink bg-card shadow-[6px_6px_0_0_var(--ink)]">
          {/* Icon area */}
          <div className="flex flex-col items-center justify-center gap-4 rounded-t-3xl bg-primary px-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
              <HeartHandshake className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary-foreground opacity-70">
                From the Team
              </p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-primary-foreground">
                We Sincerely Apologize
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <p className="text-center text-sm font-semibold leading-relaxed text-muted-foreground">
              We deeply apologize for the recent delays in processing withdrawals. This was caused by{' '}
              <span className="font-black text-foreground">temporary gateway instability</span> on our payment
              partner&apos;s end — completely outside our control.
            </p>

            <div className="mt-4 rounded-2xl border-2 border-ink bg-surface p-4">
              <p className="text-center text-xs font-bold leading-relaxed text-foreground">
                Your funds are safe. All pending withdrawals have been or are being processed. We have resolved the
                issue and normal operations have resumed.
              </p>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              We value your trust and are committed to providing a seamless experience. Thank you for your patience
              and continued support.
            </p>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={close}
                className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3.5 font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)]"
              >
                I Understand
              </button>
              <a
                href={SITE.telegramSupport}
                target="_blank"
                rel="noreferrer"
                className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-card py-3 text-xs font-black uppercase text-foreground shadow-[3px_3px_0_0_var(--ink)]"
              >
                <Send className="h-3.5 w-3.5 text-primary" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
