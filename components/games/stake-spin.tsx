"use client"

import { useState, useTransition, useRef } from "react"
import { Dices, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { playSpin } from "@/app/actions/games"

type SpinResult = {
  outcome: "win" | "lose"
  multiplier: number
  winAmount: number
  netChange: number
  newBalance: number
}

const STAKE_PRESETS = [500, 1000, 2000, 5000, 10000]

const SPIN_SEGMENTS = [
  { label: "1.5x", color: "bg-success/20 text-success border-success/40" },
  { label: "LOSE", color: "bg-destructive/20 text-destructive border-destructive/40" },
  { label: "2.0x", color: "bg-primary/20 text-primary border-primary/40" },
  { label: "LOSE", color: "bg-destructive/20 text-destructive border-destructive/40" },
  { label: "2.5x", color: "bg-gold/20 text-gold border-gold/40" },
  { label: "LOSE", color: "bg-destructive/20 text-destructive border-destructive/40" },
  { label: "1.8x", color: "bg-success/20 text-success border-success/40" },
  { label: "3.0x", color: "bg-primary/20 text-primary border-primary/40" },
]

export function StakeSpinGame({
  balance,
  stakeMin,
  stakeMax,
}: {
  balance: number
  stakeMin: number
  stakeMax: number
}) {
  const [stake, setStake] = useState(stakeMin)
  const [customStake, setCustomStake] = useState("")
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [localBalance, setLocalBalance] = useState(balance)
  const [pending, startTransition] = useTransition()
  const spinRef = useRef<HTMLDivElement>(null)

  const effectiveStake = customStake ? Number(customStake) : stake

  const handleSpin = () => {
    if (effectiveStake < stakeMin || effectiveStake > stakeMax) {
      toast.error(`Stake must be between ₦${stakeMin.toLocaleString()} and ₦${stakeMax.toLocaleString()}`)
      return
    }
    if (effectiveStake > localBalance) {
      toast.error("Insufficient balance")
      return
    }

    setSpinning(true)
    setResult(null)

    // Animate wheel: 5 full spins + random offset
    const extraDeg = Math.floor(Math.random() * 360)
    const newRotation = rotation + 1800 + extraDeg
    setRotation(newRotation)

    startTransition(async () => {
      // Start spinning animation, resolve after 2s
      await new Promise((r) => setTimeout(r, 2000))
      const res = await playSpin(effectiveStake)

      setSpinning(false)

      if (!res.ok) {
        toast.error(res.message)
        return
      }

      setResult(res as SpinResult)
      setLocalBalance(res.newBalance!)

      if (res.outcome === "win") {
        toast.success(`You won ₦${res.winAmount!.toLocaleString()}! (${res.multiplier}x)`)
      } else {
        toast.error(`You lost ₦${effectiveStake.toLocaleString()}. Try again!`)
      }
    })
  }

  const segmentAngle = 360 / SPIN_SEGMENTS.length

  return (
    <div className="flex flex-col gap-4">
      {/* Wheel */}
      <div className="card-glass relative flex flex-col items-center rounded-3xl px-4 py-6">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Spin the Wheel
        </p>

        {/* Wheel visual */}
        <div className="relative mb-4 h-56 w-56">
          {/* Pointer */}
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
            <div className="h-6 w-0 border-l-[10px] border-r-[10px] border-t-[22px] border-l-transparent border-r-transparent border-t-primary" />
          </div>

          {/* Wheel container */}
          <div
            ref={spinRef}
            className="h-full w-full rounded-full border-4 border-border"
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
                  className={`mt-2 rounded-full border px-2 py-0.5 text-[10px] font-bold ${seg.color}`}
                  style={{ transform: `rotate(${segmentAngle / 2}deg)` }}
                >
                  {seg.label}
                </div>
              </div>
            ))}
            {/* Segment lines */}
            {SPIN_SEGMENTS.map((_, i) => (
              <div
                key={`line-${i}`}
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${i * segmentAngle}deg)` }}
              >
                <div className="h-full w-px bg-border" />
              </div>
            ))}
            {/* Center circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border-2 border-border bg-background flex items-center justify-center">
                <Dices className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div
            className={`mb-4 w-full rounded-2xl border p-4 text-center ${
              result.outcome === "win"
                ? "border-success/40 bg-success/10"
                : "border-destructive/40 bg-destructive/10"
            }`}
          >
            {result.outcome === "win" ? (
              <div className="flex flex-col items-center gap-1">
                <TrendingUp className="h-6 w-6 text-success" />
                <p className="text-xl font-bold text-success">
                  +₦{result.winAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.multiplier}x multiplier on ₦{effectiveStake.toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <TrendingDown className="h-6 w-6 text-destructive" />
                <p className="text-xl font-bold text-destructive">
                  -₦{effectiveStake.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Better luck next time</p>
              </div>
            )}
          </div>
        )}

        {/* Balance chip */}
        <div className="mb-3 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted-foreground">
          Balance: <span className="font-bold tabular-nums text-foreground">₦{localBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Stake selector */}
      <div className="card-glass rounded-2xl p-4">
        <p className="mb-3 text-sm font-black">Choose Stake Amount</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {STAKE_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setStake(p); setCustomStake("") }}
              disabled={p > localBalance}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-40 ${
                stake === p && !customStake
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground"
              }`}
            >
              ₦{p.toLocaleString()}
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder={`Custom (₦${stakeMin.toLocaleString()} – ₦${stakeMax.toLocaleString()})`}
          value={customStake}
          onChange={(e) => setCustomStake(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Spin button */}
      <button
        onClick={handleSpin}
        disabled={spinning || pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-black text-primary-foreground glow-primary transition-all active:scale-[0.98] disabled:opacity-60"
      >
        {spinning || pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Spinning...
          </>
        ) : (
          <>
            <Dices className="h-5 w-5" /> Spin for ₦{effectiveStake.toLocaleString()}
          </>
        )}
      </button>

      {/* House info */}
      <div className="card-glass rounded-2xl p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">How it works</p>
        <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <li>• Stake any amount and spin the wheel</li>
          <li>• Win: multiply your stake by 1.5x, 1.8x, 2x, 2.5x or 3x</li>
          <li>• Lose: your stake is deducted from your balance</li>
          <li>• Results are instant and irreversible</li>
        </ul>
      </div>
    </div>
  )
}
