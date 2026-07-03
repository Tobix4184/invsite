"use client"

import { useState, useTransition, useRef } from "react"
import { Dices, Loader2, Gift, Sparkles, Ticket } from "lucide-react"
import { toast } from "sonner"
import { playSpin } from "@/app/actions/games"

type SpinResult = {
  outcome: "win" | "lose"
  winAmount: number
  spinsLeft: number
  newBalance: number
}

const SPIN_SEGMENTS = [
  { label: "₦100", color: "bg-primary text-primary-foreground" },
  { label: "₦0", color: "bg-surface text-muted-foreground" },
  { label: "₦500", color: "bg-gold text-gold-foreground" },
  { label: "₦200", color: "bg-success text-success-foreground" },
  { label: "₦0", color: "bg-surface text-muted-foreground" },
  { label: "₦1000", color: "bg-primary text-primary-foreground" },
  { label: "₦350", color: "bg-success text-success-foreground" },
  { label: "₦2500", color: "bg-gold text-gold-foreground" },
]

export function StakeSpinGame({
  balance,
  spinsAvailable,
}: {
  balance: number
  spinsAvailable: number
}) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [localBalance, setLocalBalance] = useState(balance)
  const [spinsLeft, setSpinsLeft] = useState(spinsAvailable)
  const [pending, startTransition] = useTransition()
  const spinRef = useRef<HTMLDivElement>(null)

  const handleSpin = () => {
    if (spinsLeft <= 0) {
      toast.error("No free spins left. Invest or refer a friend to earn more.")
      return
    }

    setSpinning(true)
    setResult(null)

    const extraDeg = Math.floor(Math.random() * 360)
    const newRotation = rotation + 1800 + extraDeg
    setRotation(newRotation)

    startTransition(async () => {
      await new Promise((r) => setTimeout(r, 2000))
      const res = await playSpin()

      setSpinning(false)

      if (!res.ok) {
        toast.error(res.message)
        return
      }

      setResult(res as SpinResult)
      setLocalBalance(res.newBalance!)
      setSpinsLeft(res.spinsLeft!)

      if (res.outcome === "win") {
        toast.success(`Reward drop! You won ₦${res.winAmount!.toLocaleString()}`)
      } else {
        toast("No reward this time — spin again!", { icon: "🎲" })
      }
    })
  }

  const segmentAngle = 360 / SPIN_SEGMENTS.length
  const noSpins = spinsLeft <= 0

  return (
    <div className="flex flex-col gap-4">
      {/* Spins available chip */}
      <div className="card-glass flex items-center justify-between rounded-2xl p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-gold">
            <Ticket className="h-5 w-5 text-gold-foreground" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Free Spins</p>
            <p className="text-lg font-black tabular-nums leading-none">{spinsLeft}</p>
          </div>
        </div>
        <div className="rounded-full border-2 border-ink bg-surface px-3 py-1.5 text-xs font-bold text-muted-foreground">
          Balance <span className="tabular-nums text-foreground">₦{localBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Wheel */}
      <div className="card-glass relative flex flex-col items-center rounded-3xl px-4 py-6">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Spin for a Reward Drop
        </p>

        <div className="relative mb-4 h-56 w-56">
          {/* Pointer */}
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
            <div className="h-6 w-0 border-l-[10px] border-r-[10px] border-t-[22px] border-l-transparent border-r-transparent border-t-primary" />
          </div>

          <div
            ref={spinRef}
            className="h-full w-full rounded-full border-4 border-ink"
            style={{
              transition: spinning ? "transform 2s cubic-bezier(0.17, 0.67, 0.21, 0.99)" : "none",
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {SPIN_SEGMENTS.map((seg, i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-start justify-center"
                style={{ transform: `rotate(${i * segmentAngle}deg)` }}
              >
                <div
                  className={`mt-2 rounded-full border border-ink px-2 py-0.5 text-[10px] font-bold ${seg.color}`}
                  style={{ transform: `rotate(${segmentAngle / 2}deg)` }}
                >
                  {seg.label}
                </div>
              </div>
            ))}
            {SPIN_SEGMENTS.map((_, i) => (
              <div
                key={`line-${i}`}
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${i * segmentAngle}deg)` }}
              >
                <div className="h-full w-px bg-border" />
              </div>
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border-2 border-ink bg-background flex items-center justify-center">
                <Dices className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div
            className={`mb-4 w-full rounded-2xl border-2 border-ink p-4 text-center ${
              result.outcome === "win" ? "bg-success/15" : "bg-surface"
            }`}
          >
            {result.outcome === "win" ? (
              <div className="flex flex-col items-center gap-1">
                <Sparkles className="h-6 w-6 text-success" />
                <p className="text-xl font-black text-success">+₦{result.winAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Reward credited to your wallet</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Dices className="h-6 w-6 text-muted-foreground" />
                <p className="text-xl font-black text-foreground">No reward</p>
                <p className="text-xs text-muted-foreground">Nothing lost — try another spin</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spin button */}
      <button
        onClick={handleSpin}
        disabled={spinning || pending || noSpins}
        className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-4 text-base font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
      >
        {spinning || pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Spinning...
          </>
        ) : noSpins ? (
          <>No Spins Left</>
        ) : (
          <>
            <Dices className="h-5 w-5" /> Spin Now ({spinsLeft} left)
          </>
        )}
      </button>

      {/* How it works */}
      <div className="card-glass rounded-2xl p-4">
        <div className="mb-2 flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">How to earn spins</p>
        </div>
        <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <li>• Get 1 free spin for every package you invest in</li>
          <li>• Get 1 free spin for every friend you refer who invests</li>
          <li>• Spinning never costs money — the worst outcome is ₦0</li>
          <li>• Rewards are credited to your wallet instantly</li>
        </ul>
      </div>
    </div>
  )
}
