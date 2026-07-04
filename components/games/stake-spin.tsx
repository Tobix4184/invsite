"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Ticket, Loader2, Gift, Sparkles, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { playSpin } from "@/app/actions/games"
import { formatNaira } from "@/lib/plans"

type SpinResult = {
  outcome: "win" | "lose"
  winAmount: number
  spinsLeft: number
  newBalance: number
}

// Slot reel symbols — each prize has a matching symbol
const SYMBOLS = ["7", "BAR", "$", "★", "♦", "▶", "✦", "₦"]

// Map prize tiers to symbols (higher = rarer symbol)
function prizeToSymbol(amount: number): string {
  if (amount === 0)    return "▶"
  if (amount <= 100)   return "₦"
  if (amount <= 200)   return "★"
  if (amount <= 350)   return "♦"
  if (amount <= 500)   return "BAR"
  if (amount <= 1000)  return "$"
  if (amount <= 2500)  return "7"
  return "✦"
}

function prizeColor(amount: number): string {
  if (amount === 0)    return "text-muted-foreground bg-surface"
  if (amount <= 200)   return "text-foreground bg-card"
  if (amount <= 500)   return "text-success bg-success/10"
  if (amount <= 1000)  return "text-primary bg-primary/10"
  return "text-gold bg-gold/20"
}

// Build a long reel strip from all prize symbols (weighted)
function buildReelStrip(prizes: { amount: number; weight: number }[], length = 24): string[] {
  const pool: string[] = []
  for (const p of prizes) {
    for (let i = 0; i < p.weight; i++) pool.push(prizeToSymbol(p.amount))
  }
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  // Repeat to fill length
  const strip: string[] = []
  while (strip.length < length) strip.push(...pool)
  return strip.slice(0, length)
}

// Single reel component — CSS scroll animation
function Reel({
  strip,
  targetIndex,
  spinning,
  delay,
  symbolHeight = 56,
}: {
  strip: string[]
  targetIndex: number
  spinning: boolean
  delay: number
  symbolHeight?: number
}) {
  const reelRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (spinning) {
      // Start a fast scroll — goes to a random long offset
      const randomFar = (strip.length - 4) * symbolHeight - Math.floor(Math.random() * 3) * symbolHeight
      setOffset(randomFar)
    } else {
      // Land exactly on targetIndex
      setOffset(targetIndex * symbolHeight)
    }
  }, [spinning, targetIndex, strip.length, symbolHeight])

  return (
    <div
      className="relative h-[56px] w-[72px] overflow-hidden rounded-xl border-2 border-ink bg-card shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)]"
      aria-hidden="true"
    >
      {/* Top/bottom fade masks */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-card to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-card to-transparent" />

      <div
        ref={reelRef}
        className="flex flex-col"
        style={{
          transform: `translateY(-${offset}px)`,
          transition: spinning
            ? `transform ${1.4 + delay * 0.3}s cubic-bezier(0.1, 0.8, 0.3, 1.0)`
            : `transform ${0.25 + delay * 0.1}s ease-out`,
        }}
      >
        {strip.map((sym, i) => (
          <div
            key={i}
            className="flex h-[56px] w-[72px] items-center justify-center text-2xl font-black"
          >
            {sym}
          </div>
        ))}
      </div>

      {/* Active row highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full rounded-xl ring-2 ring-primary/30" />
    </div>
  )
}

// Deterministic strip for SSR (no Math.random) — all symbols in order, repeated
function buildReelStripStatic(prizes: { amount: number; weight: number }[], length = 24): string[] {
  const pool: string[] = []
  for (const p of prizes) {
    for (let i = 0; i < Math.max(1, p.weight); i++) pool.push(prizeToSymbol(p.amount))
  }
  const strip: string[] = []
  while (strip.length < length) strip.push(...pool)
  return strip.slice(0, length)
}

export function StakeSpinGame({
  balance,
  spinsAvailable,
  spinPrizes,
}: {
  balance: number
  spinsAvailable: number
  spinPrizes: { amount: number; weight: number }[]
}) {
  // Start with deterministic strips (matches SSR); shuffle them client-side after mount
  const [strips, setStrips] = useState<string[][]>(() => [
    buildReelStripStatic(spinPrizes),
    buildReelStripStatic(spinPrizes),
    buildReelStripStatic(spinPrizes),
  ])

  // After hydration, replace with shuffled strips — safe because this runs only on the client
  useEffect(() => {
    setStrips([
      buildReelStrip(spinPrizes),
      buildReelStrip(spinPrizes),
      buildReelStrip(spinPrizes),
    ])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [spinning, setSpinning] = useState(false)
  const [targetIndexes, setTargetIndexes] = useState([0, 0, 0])
  const [result, setResult] = useState<SpinResult | null>(null)
  const [localBalance, setLocalBalance] = useState(balance)
  const [spinsLeft, setSpinsLeft] = useState(spinsAvailable)
  const [pending, startTransition] = useTransition()

  const noSpins = spinsLeft <= 0

  const handleSpin = () => {
    if (noSpins) {
      toast.error("No free spins left. Invest or refer a friend to earn more.")
      return
    }
    setSpinning(true)
    setResult(null)

    startTransition(async () => {
      // Let the reel spin visually for ~1.8s before resolving
      await new Promise((r) => setTimeout(r, 400))
      const res = await playSpin()

      if (!res.ok) {
        setSpinning(false)
        toast.error(res.message)
        return
      }

      // Pick landing symbols for each reel
      const winSym = prizeToSymbol(res.winAmount ?? 0)
      const loseSym = "▶"

      const landingSymbol = res.outcome === "win" ? winSym : loseSym

      // Find indexes in each reel strip that show the landing symbol
      const newIndexes = strips.map((strip) => {
        const matches = strip
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => s === landingSymbol)
        if (matches.length === 0) return Math.floor(Math.random() * strip.length)
        return matches[Math.floor(Math.random() * matches.length)].i
      })

      // Delay landing so the spin animation can play
      await new Promise((r) => setTimeout(r, 1200))
      setTargetIndexes(newIndexes)
      setSpinning(false)

      await new Promise((r) => setTimeout(r, 400))
      setResult(res as SpinResult)
      setLocalBalance(res.newBalance!)
      setSpinsLeft(res.spinsLeft!)

      if (res.outcome === "win") {
        toast.success(`You won ${formatNaira(res.winAmount!)}!`)
      } else {
        toast("No win this time — spin again!")
      }
    })
  }

  const nonZeroPrizes = spinPrizes.filter((p) => p.amount > 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-card p-3.5 shadow-[3px_3px_0_0_var(--ink)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-gold">
            <Ticket className="h-5 w-5 text-gold-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Free Spins</p>
            <p className="text-xl font-black tabular-nums leading-none">{spinsLeft}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-card p-3.5 shadow-[3px_3px_0_0_var(--ink)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-primary">
            <Gift className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Balance</p>
            <p className="text-sm font-black tabular-nums leading-none">{formatNaira(localBalance)}</p>
          </div>
        </div>
      </div>

      {/* Slot machine cabinet */}
      <div className="flex flex-col items-center rounded-3xl border-2 border-ink bg-card px-4 py-6 shadow-[5px_5px_0_0_var(--ink)]">
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Lucky Roulette
        </p>
        <p className="mb-5 text-xs text-muted-foreground">Match symbols to win rewards</p>

        {/* 3 reels */}
        <div className="mb-4 flex items-center gap-2">
          {/* Left bracket */}
          <div className="h-16 w-2 rounded-l-lg border-y-2 border-l-2 border-ink bg-surface" />

          {strips.map((strip, i) => (
            <Reel
              key={i}
              strip={strip}
              targetIndex={targetIndexes[i]}
              spinning={spinning}
              delay={i * 0.2}
            />
          ))}

          {/* Right bracket */}
          <div className="h-16 w-2 rounded-r-lg border-y-2 border-r-2 border-ink bg-surface" />
        </div>

        {/* Win/lose result banner */}
        {result && (
          <div
            className={`mb-4 w-full rounded-2xl border-2 border-ink p-4 text-center transition-all ${
              result.outcome === "win"
                ? "bg-success/15 animate-pop-in"
                : "bg-surface"
            }`}
          >
            {result.outcome === "win" ? (
              <div className="flex flex-col items-center gap-1">
                <Sparkles className="h-6 w-6 text-success" />
                <p className="text-2xl font-black text-success">+{formatNaira(result.winAmount)}</p>
                <p className="text-xs text-muted-foreground">Credited to your wallet</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <p className="font-black text-foreground">No win</p>
                <p className="text-xs text-muted-foreground">Nothing lost — spin again</p>
              </div>
            )}
          </div>
        )}

        {/* Spin button */}
        <button
          onClick={handleSpin}
          disabled={spinning || pending || noSpins}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-4 text-base font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
        >
          {spinning || pending ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Spinning...</>
          ) : noSpins ? (
            "No Spins Left"
          ) : (
            <><Ticket className="h-5 w-5" /> Spin ({spinsLeft} left)</>
          )}
        </button>
      </div>

      {/* Prize table */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <p className="mb-3 text-xs font-black uppercase tracking-wide text-muted-foreground">Prize Table</p>
        <div className="grid grid-cols-2 gap-2">
          {nonZeroPrizes.map((p) => (
            <div
              key={p.amount}
              className={`flex items-center justify-between rounded-xl border border-ink px-3 py-2 ${prizeColor(p.amount)}`}
            >
              <span className="text-sm font-black">{prizeToSymbol(p.amount)}</span>
              <span className="font-mono text-xs font-bold">{formatNaira(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How to earn spins */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">How to earn spins</p>
        <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <li>- Get 1 free spin for every package you invest in</li>
          <li>- Get 1 free spin for every friend you refer who invests</li>
          <li>- Spinning is always free — worst outcome is no win</li>
          <li>- All winnings credited to your wallet instantly</li>
        </ul>
      </div>
    </div>
  )
}
