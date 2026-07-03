"use client"

import { useState, useTransition, useEffect } from "react"
import { Ticket, Gift, Loader2, Trophy, Zap, Users, Clock, Star } from "lucide-react"
import { toast } from "sonner"
import { claimFreeDrawSlot, claimReferralDrawSlot } from "@/app/actions/games"

type Round = {
  drawDate: string
  prizePool: string | number
  status: string
  winner1Id?: string | null
  winner1Amount?: string | null
  winner2Id?: string | null
  winner2Amount?: string | null
  winner3Id?: string | null
  winner3Amount?: string | null
} | null

type RecentWinner = { name: string; amount: number; drawDate: string; place: number }

type Props = {
  balance: number
  today: string
  round: Round
  todaySlotsCount: number
  freeSlotsRemaining: number
  hasActiveInvestment: boolean
  referralSlotsAvailable: number
  slotCost: number
  recentWinners: RecentWinner[]
}

function useCountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState("")
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return timeLeft
}

export function LuckyDrawGame({
  today,
  round,
  todaySlotsCount,
  freeSlotsRemaining,
  hasActiveInvestment,
  referralSlotsAvailable,
  recentWinners,
}: Props) {
  const [slots, setSlots] = useState(todaySlotsCount)
  const [prizePool, setPrizePool] = useState(Number(round?.prizePool ?? 0))
  const [freeLeft, setFreeLeft] = useState(freeSlotsRemaining)
  const [referralLeft, setReferralLeft] = useState(referralSlotsAvailable)
  const [pending, startTransition] = useTransition()
  const countdown = useCountdownToMidnight()

  const drawClosed = round?.status === "drawn"

  const handleEnterFree = () => {
    startTransition(async () => {
      const res = await claimFreeDrawSlot()
      if (!res.ok) { toast.error(res.message); return }
      toast.success("Free slot entered!")
      setSlots((s) => s + 1)
      setFreeLeft((f) => f - 1)
    })
  }

  const handleReferralSlot = () => {
    startTransition(async () => {
      const res = await claimReferralDrawSlot()
      if (!res.ok) { toast.error(res.message); return }
      toast.success(res.message)
      setSlots((s) => s + 1)
      setReferralLeft((r) => r - 1)
    })
  }

  const noSlotsToClaim = freeLeft <= 0 && referralLeft <= 0

  return (
    <div className="flex flex-col gap-4">

      {/* Recent winners feed — FOMO driver */}
      {recentWinners.length > 0 && (
        <div className="card-glass rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Winners</p>
          </div>
          <div className="flex flex-col gap-2">
            {recentWinners.map((w, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                    w.place === 1 ? "border-2 border-ink bg-gold text-gold-foreground" :
                    w.place === 2 ? "border-2 border-ink bg-surface text-foreground" :
                    "border-2 border-ink bg-gold/60 text-gold-foreground"
                  }`}>
                    {w.place}
                  </span>
                  <p className="text-xs font-semibold text-foreground">{w.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold text-success">+₦{w.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{w.drawDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prize pool + stats */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-primary p-5 text-center text-primary-foreground shadow-[5px_5px_0_0_var(--ink)]">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Gift className="h-5 w-5 text-primary-foreground" />
          <p className="text-xs font-black uppercase tracking-widest text-primary-foreground">Prize Pool</p>
        </div>
        <p className="mb-1 font-mono text-4xl font-black text-primary-foreground">
          ₦{prizePool.toLocaleString()}
        </p>
        <p className="text-xs font-semibold text-primary-foreground/80">1st 50% · 2nd 30% · 3rd 20%</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border-2 border-ink bg-surface px-3 py-2 text-center">
            <p className="font-mono text-lg font-bold text-foreground">{slots}</p>
            <p className="text-[10px] text-muted-foreground">Your Slots</p>
          </div>
          <div className="rounded-xl border-2 border-ink bg-surface px-3 py-2 text-center">
            {drawClosed ? (
              <>
                <p className="text-xs font-bold text-destructive">Drawn</p>
                <p className="text-[10px] text-muted-foreground">Status</p>
              </>
            ) : (
              <>
                <p className="font-mono text-sm font-bold text-foreground">{countdown}</p>
                <p className="text-[10px] text-muted-foreground">Draw In</p>
              </>
            )}
          </div>
          <div className="rounded-xl border-2 border-ink bg-surface px-3 py-2 text-center">
            <p className="text-xs font-bold text-foreground">{today}</p>
            <p className="text-[10px] text-muted-foreground">Date</p>
          </div>
        </div>
      </div>

      {/* Action buttons — only when draw is open */}
      {!drawClosed && (
        <>
          {/* Free slots earned from investments */}
          {hasActiveInvestment && freeLeft > 0 && (
            <button
              onClick={handleEnterFree}
              disabled={pending}
              className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-success py-4 text-sm font-black uppercase text-success-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              Enter Free Slot ({freeLeft} left)
            </button>
          )}

          {/* Referral bonus slots */}
          {referralLeft > 0 && (
            <button
              onClick={handleReferralSlot}
              disabled={pending}
              className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-card py-3.5 text-sm font-black uppercase text-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              Referral Bonus Slot ({referralLeft} left)
            </button>
          )}

          {noSlotsToClaim && (
            <div className="flex items-start gap-3 card-glass rounded-2xl p-4">
              <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-bold">No slots to enter yet</p>
                <p className="text-xs text-muted-foreground">
                  Invest in a package or refer a friend who invests to earn free draw slots.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {drawClosed && (
        <div className="flex items-center gap-3 card-glass rounded-2xl p-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold">Draw Complete</p>
            <p className="text-xs text-muted-foreground">Check back tomorrow for a new round.</p>
          </div>
        </div>
      )}

      {/* Social proof */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Users, label: "More slots", sub: "= more chances" },
          { icon: Trophy, label: "Top 3 win", sub: "cash prizes" },
          { icon: Zap, label: "Instant", sub: "wallet credit" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex flex-col items-center gap-1 card-glass rounded-2xl p-3 text-center">
            <Icon className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
