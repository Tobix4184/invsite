"use client"

import { useState, useTransition } from "react"
import { Ticket, Plus, Minus, Gift, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { claimFreeDrawSlots, buyDrawSlots } from "@/app/actions/games"

type Round = {
  drawDate: string
  prizePool: string | number
  status: string
} | null

type Props = {
  balance: number
  today: string
  round: Round
  todaySlotsCount: number
  freeSlotsTotal: number
  activeInvestments: number
  slotCost: number
}

export function LuckyDrawGame({
  balance,
  today,
  round,
  todaySlotsCount,
  freeSlotsTotal,
  activeInvestments,
  slotCost,
}: Props) {
  const [slots, setSlots] = useState(todaySlotsCount)
  const [localBalance, setLocalBalance] = useState(balance)
  const [prizePool, setPrizePool] = useState(Number(round?.prizePool ?? 0))
  const [buyCount, setBuyCount] = useState(1)
  const [pending, startTransition] = useTransition()

  const freeUnclaimed = Math.max(0, freeSlotsTotal - slots)
  const drawClosed = round?.status === "drawn"
  const totalCost = buyCount * slotCost

  const handleClaimFree = () => {
    startTransition(async () => {
      const res = await claimFreeDrawSlots()
      if (!res.ok) { toast.error(res.message); return }
      toast.success(res.message)
      setSlots((s) => s + freeUnclaimed)
    })
  }

  const handleBuy = () => {
    if (totalCost > localBalance) {
      toast.error("Insufficient balance")
      return
    }
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
      {/* Prize pool card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-primary/10 p-5 text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Today&apos;s Prize Pool
          </p>
        </div>
        <p className="mb-1 font-mono text-4xl font-black text-foreground">
          ₦{prizePool.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          Top 3 winners take 35% / 20% / 15% of the pool
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

      {/* Free slots */}
      {activeInvestments > 0 && (
        <div className="rounded-2xl border border-success/30 bg-success/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-success">Free Slots Available</p>
              <p className="text-xs text-muted-foreground">
                {activeInvestments} active investment{activeInvestments > 1 ? "s" : ""} = {freeSlotsTotal} free slot{freeSlotsTotal > 1 ? "s" : ""} per day
              </p>
            </div>
            <span className="font-mono text-2xl font-black text-success">{freeUnclaimed}</span>
          </div>
          {freeUnclaimed > 0 && !drawClosed && (
            <button
              onClick={handleClaimFree}
              disabled={pending}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-success py-2.5 text-sm font-bold text-success-foreground disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              Claim {freeUnclaimed} Free Slot{freeUnclaimed > 1 ? "s" : ""}
            </button>
          )}
          {freeUnclaimed === 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              All free slots claimed for today
            </p>
          )}
        </div>
      )}

      {activeInvestments === 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Ticket className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">No Active Investment</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Invest in any plan to earn free daily draw slots
          </p>
        </div>
      )}

      {/* Buy slots */}
      {!drawClosed && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-bold">Buy Extra Slots</p>
          <p className="mb-3 text-xs text-muted-foreground">
            ₦{slotCost.toLocaleString()} per slot — goes directly into today&apos;s prize pool
          </p>

          {/* Count selector */}
          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={() => setBuyCount((c) => Math.max(1, c - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex-1 text-center">
              <p className="font-mono text-xl font-bold">{buyCount}</p>
              <p className="text-xs text-muted-foreground">
                Cost: ₦{(buyCount * slotCost).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setBuyCount((c) => Math.min(50, c + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
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
                {n} slot{n > 1 ? "s" : ""}
              </button>
            ))}
          </div>

          <button
            onClick={handleBuy}
            disabled={pending || totalCost > localBalance}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ticket className="h-4 w-4" />
            )}
            Buy {buyCount} Slot{buyCount > 1 ? "s" : ""} — ₦{totalCost.toLocaleString()}
          </button>
        </div>
      )}

      {drawClosed && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold">Draw Complete</p>
            <p className="text-xs text-muted-foreground">
              Today&apos;s draw has been executed. Check back tomorrow for a new round.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">How it works</p>
        <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <li>• Each active investment earns you 1 free slot per day</li>
          <li>• Buy extra slots for ₦{slotCost.toLocaleString()} each — they grow the prize pool</li>
          <li>• Admin executes the draw daily — 3 random winners selected</li>
          <li>• Winners receive 35%, 20%, and 15% of the prize pool (platform retains 30%)</li>
          <li>• More slots = higher chance of winning</li>
        </ul>
      </div>
    </div>
  )
}
