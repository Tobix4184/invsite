'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Tag, Zap, Gift, Clock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { formatNaira } from '@/lib/plans'

type Promo = {
  id: number
  name: string
  description: string | null
  bonusType: string
  bonusValue: string
  conditionValue: string
  firstPurchaseOnly: boolean
  endsAt: Date | string | null
  maxRedemptions: number | null
  redemptions: number
}

function PromoCard({ promo, index }: { promo: Promo; index: number }) {
  const bonus =
    promo.bonusType === 'percent'
      ? `${Number(promo.bonusValue)}% Cashback`
      : `${formatNaira(Number(promo.bonusValue))} Bonus`

  const minPkg = Number(promo.conditionValue)

  // Cycle through vivid color schemes per card
  const schemes = [
    { bg: 'bg-primary', fg: 'text-primary-foreground', badge: 'bg-card text-primary', icon: Zap },
    { bg: 'bg-gold', fg: 'text-gold-foreground', badge: 'bg-card text-gold-foreground', icon: Gift },
    { bg: 'bg-success', fg: 'text-success-foreground', badge: 'bg-card text-success-foreground', icon: Sparkles },
    { bg: 'bg-destructive', fg: 'text-destructive-foreground', badge: 'bg-card text-destructive', icon: Tag },
  ]
  const s = schemes[index % schemes.length]
  const Icon = s.icon

  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!promo.endsAt) return
    const end = new Date(promo.endsAt).getTime()
    function tick() {
      const diff = end - Date.now()
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const sec = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h}h ${m}m ${sec}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [promo.endsAt])

  return (
    <div className={`relative flex h-full w-full flex-col justify-between rounded-2xl border-2 border-ink p-5 shadow-[5px_5px_0_0_var(--ink)] ${s.bg}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-card`}>
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        {promo.firstPurchaseOnly && (
          <span className="rounded-full border-2 border-ink bg-card px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">
            New Users
          </span>
        )}
      </div>

      {/* Bonus headline */}
      <div className="my-3">
        <p className={`text-3xl font-black leading-none tracking-tight ${s.fg}`}>{bonus}</p>
        <p className={`mt-1 text-sm font-bold ${s.fg} opacity-80`}>{promo.name}</p>
      </div>

      {/* Description / condition */}
      <div className="space-y-1.5">
        {promo.description && (
          <p className={`text-xs font-semibold ${s.fg} opacity-80 leading-snug`}>{promo.description}</p>
        )}
        {minPkg > 0 && (
          <p className={`text-xs font-black uppercase ${s.fg} opacity-90`}>
            Min. package: {formatNaira(minPkg)}
          </p>
        )}
        {timeLeft && (
          <div className={`flex items-center gap-1 text-xs font-black ${s.fg}`}>
            <Clock className="h-3 w-3" />
            <span>Ends in {timeLeft}</span>
          </div>
        )}
        {promo.maxRedemptions != null && (
          <p className={`text-[10px] font-bold ${s.fg} opacity-70`}>
            {promo.maxRedemptions - promo.redemptions} slots left
          </p>
        )}
      </div>

      {/* Animated shine bar at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-xl overflow-hidden">
        <div className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>
    </div>
  )
}

export function PromoPopup({ promos }: { promos: Promo[] }) {
  const [show, setShow] = useState(false)
  const [idx, setIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (promos.length === 0) return
    // Check if the user has dismissed this promo set today
    const key = `promo_popup_dismissed_${promos.map(p => p.id).join('_')}`
    const dismissedAt = sessionStorage.getItem(key)
    if (dismissedAt) return
    const timer = setTimeout(() => setShow(true), 800)
    return () => clearTimeout(timer)
  }, [promos])

  // Auto-cycle slides
  useEffect(() => {
    if (!show || promos.length <= 1) return
    intervalRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % promos.length)
    }, 4000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [show, promos.length])

  function handleDismiss() {
    const key = `promo_popup_dismissed_${promos.map(p => p.id).join('_')}`
    sessionStorage.setItem(key, Date.now().toString())
    setDismissed(true)
    // Animate out
    setTimeout(() => setShow(false), 300)
  }

  function go(dir: number) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIdx((i) => (i + dir + promos.length) % promos.length)
  }

  if (!show || promos.length === 0) return null

  return (
    <div
      className={`fixed inset-0 z-[998] flex items-center justify-center overflow-hidden transition-opacity duration-300 ${dismissed ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Backdrop */}
      <button
        onClick={handleDismiss}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close"
      />

      {/* Card container */}
      <div className="relative z-10 mx-4 w-full max-w-sm animate-pop-in">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="press absolute -right-3 -top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-card text-foreground shadow-[3px_3px_0_0_var(--ink)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Promo tag header */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-foreground">
              Active Promotions
            </span>
          </div>
          {promos.length > 1 && (
            <span className="text-xs font-bold text-muted-foreground">
              {idx + 1} / {promos.length}
            </span>
          )}
        </div>

        {/* Card */}
        <div className="relative min-h-[200px]">
          <PromoCard promo={promos[idx]} index={idx} />
        </div>

        {/* Dots + nav */}
        {promos.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={() => go(-1)}
              className="press flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5">
              {promos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); setIdx(i) }}
                  className={`h-2 rounded-full border-2 border-ink transition-all duration-300 ${i === idx ? 'w-6 bg-primary' : 'w-2 bg-card'}`}
                  aria-label={`Go to promo ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => go(1)}
              className="press flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleDismiss}
          className="press mt-4 w-full rounded-2xl border-2 border-ink bg-primary py-3.5 font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)]"
        >
          Invest Now
        </button>
      </div>
    </div>
  )
}
