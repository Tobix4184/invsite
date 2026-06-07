"use client"

import { useState, useTransition } from "react"
import { Ticket, Plus, Minus, Gift, Clock, Loader2, Trophy, Zap, Users } from "lucide-react"
import { toast } from "sonner"
import { claimFreeDrawSlot, buyDrawSlots } from "@/app/actions/games"

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

type Props = {
  balance: number
  today: string
  round: Round
  todaySlotsCount: number
  freeSlotAvailable: boolean
  hasActiveInvestment: boolean
  slotCost: number
}

export function LuckyDrawGame({
  balance,
  today,
  round,
  todaySlotsCount,
  freeSlotAvailable,
  hasActiveInvestment,
  slotCost,
}: Props) {
  const [slots, setSlots] = useState(todaySlotsCount)
  const [localBalance, setLocalBalance] = useState(balance)
  const [prizePool, setPrizePool] = useState(Number(round?.prizePool ?? 0))
  const [buyCount, setBuyCount] = useState(1)
  const [freeUsed, setFreeUsed] = useState(!freeSlotAvailable)
  const [pending, startTransition] = useTransition()

  const drawClosed = round?.status === "drawn"
  const totalCost = buyCount * slotCost

  const handleEnterFree = () => {
    startTransition(async () => {
      const res = await claimFreeDrawSlot()
      if (!res.ok) { toast.error(res.message); return }
      toast.success("Slot entered!")
      setSlots((s) => s + 1)
      setFreeUsed(true)
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

      {/* Prize pool */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-primary/10 p-5 text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Prize Pool</p>
        </div>
        <p className="mb-1 font-mono text-4xl font-black text-foreground">
          ₦{prizePool.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          1st 50% &nbsp;·&nbsp; 2nd 30% &nbsp;·&nbsp; 3rd 20%
        </p>

        <div className="mt-4 flex justify-center gap-3">
          <div className="rounded-xl border border-border bg-background/60 px-4 py-2 text-center">
            <p className="font-mono text-lg font-bold text-foreground">{slots}</p>
            <p className="text-[10px] text-muted-foreground">Your Slots</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 px-4 py-2 text-center">
            <p className="text-xs font-bold text-foreground">{today}</p>
            <p className="text-[10px] text-muted-foreground">Draw Date</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 px-4 py-2 text-center">
            <p className={`text-xs font-bold ${drawClosed ? "text-destructive" : "text-success"}`}>
              {drawClosed ? "Drawn" : "Open"}
            </p>
            <p className="text-[10px] text-muted-foreground">Status</p>
          </div>
        </div>
      </div>

      {/* Free slot OR enter slot button — only when draw is open */}
      {!drawClosed && (
        <>
          {/* Has active investment and free slot not yet used */}
          {hasActiveInvestment && !freeUsed && (
            <button
              onClick={handleEnterFree}
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-4 text-sm font-bold text-success-foreground disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              Enter Slot
            </button>
          )}

          {/* Free slot used or no active investment — plain Enter Slot that debits */}
          {(!hasActiveInvestment || freeUsed) && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold">Enter Slot</p>
                </div>
                <p className="font-mono text-sm font-bold text-primary">₦{slotCost.toLocaleString()}</p>
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
          )}
        </>
      )}

      {/* Draw closed */}
      {drawClosed && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold">Draw Complete</p>
            <p className="text-xs text-muted-foreground">Check back tomorrow for a new round.</p>
          </div>
        </div>
      )}

      {/* Social proof — why enter more slots */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Users, label: "More slots", sub: "= more chances" },
          { icon: Trophy, label: "Top 3 win", sub: "cash prizes" },
          { icon: Zap,   label: "Instant", sub: "wallet credit" },
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
