"use client"

import { useState, useTransition, useEffect } from "react"
import { Ticket, Plus, Minus, Gift, Loader2, Trophy, Zap, Users, Clock, Star } from "lucide-react"
import { toast } from "sonner"
import { claimFreeDrawSlot, buyDrawSlots, claimReferralDrawSlot } from "@/app/actions/games"

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
  freeSlotAvailable: boolean
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
  balance,
  today,
  round,
  todaySlotsCount,
  freeSlotAvailable,
  hasActiveInvestment,
  referralSlotsAvailable,
  slotCost,
  recentWinners,
}: Props) {
  const [slots, setSlots] = useState(todaySlotsCount)
  const [localBalance, setLocalBalance] = useState(balance)
  const [prizePool, setPrizePool] = useState(Number(round?.prizePool ?? 0))
  const [buyCount, setBuyCount] = useState(1)
  const [freeUsed, setFreeUsed] = useState(!freeSlotAvailable)
  const [referralLeft, setReferralLeft] = useState(referralSlotsAvailable)
  const [pending, startTransition] = useTransition()
  const countdown = useCountdownToMidnight()

  const drawClosed = round?.status === "drawn"
  const totalCost = buyCount * slotCost

  const handleEnterFree = () => {
    startTransition(async () => {
      const res = await claimFreeDrawSlot()
      if (!res.ok) { toast.error(res.message); return }
      toast.success("Free slot entered!")
      setSlots((s) => s + 1)
      setFreeUsed(true)
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

  const handleBuy = () => {
    if (totalCost > localBalance) { toast.error("Insufficient balance"); return }
    startTransition(async () => {
      const res = await buyDrawSlots(buyCount)
      if (!res.ok) { toast.error(res.message); return }
      toast.success(res.message)
      setSlots((s) => s + buyCount)
      setLocalBalance((b) => b - totalCost)
      setPrizePool((p) => p + totalCost)
    })
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Recent winners feed — FOMO driver */}
      {recentWinners.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Winners</p>
          </div>
          <div className="flex flex-col gap-2">
            {recentWinners.map((w, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                    w.place === 1 ? "bg-yellow-400/20 text-yellow-500" :
                    w.place === 2 ? "bg-zinc-400/20 text-zinc-400" :
                    "bg-amber-700/20 text-amber-700"
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
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-primary/10 p-5 text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Prize Pool</p>
        </div>
        <p className="mb-1 font-mono text-4xl font-black text-foreground">
          ₦{prizePool.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">1st 35% · 2nd 20% · 3rd 15%</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-background/60 px-3 py-2 text-center">
            <p className="font-mono text-lg font-bold text-foreground">{slots}</p>
            <p className="text-[10px] text-muted-foreground">Your Slots</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 px-3 py-2 text-center">
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
          <div className="rounded-xl border border-border bg-background/60 px-3 py-2 text-center">
            <p className="text-xs font-bold text-foreground">{today}</p>
            <p className="text-[10px] text-muted-foreground">Date</p>
          </div>
        </div>
      </div>

      {/* Action buttons — only when draw is open */}
      {!drawClosed && (
        <>
          {/* Free slot (investment benefit — one time) */}
          {hasActiveInvestment && !freeUsed && (
            <button
              onClick={handleEnterFree}
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-4 text-sm font-bold text-success-foreground disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              Enter Free Slot
            </button>
          )}

          {/* Referral bonus slot */}
          {referralLeft > 0 && (
            <button
              onClick={handleReferralSlot}
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary bg-primary/10 py-3.5 text-sm font-bold text-primary disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              Referral Bonus Slot ({referralLeft} left)
            </button>
          )}

          {/* Buy slots */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Enter Slot</p>
              </div>
              <p className="font-mono text-sm font-bold text-primary">₦{slotCost.toLocaleString()} each</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setBuyCount((c) => Math.max(1, c - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <p className="font-mono text-xl font-bold">{buyCount}</p>
                <p className="text-xs text-muted-foreground">₦{(buyCount * slotCost).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setBuyCount((c) => Math.min(50, c + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[1, 3, 5, 10, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setBuyCount(n)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                    buyCount === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-muted-foreground"
                  }`}
                >
                  {n}×
                </button>
              ))}
            </div>

            <button
              onClick={handleBuy}
              disabled={pending || totalCost > localBalance}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              Enter Slot{buyCount > 1 ? `s (${buyCount})` : ""}
            </button>
          </div>
        </>
      )}

      {drawClosed && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
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
          <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 text-center">
            <Icon className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
