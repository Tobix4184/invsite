"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, RotateCcw, Star, Trophy, Lock } from "lucide-react"
import { toast } from "sonner"
import { formatNaira } from "@/lib/plans"
import { playScratchCard } from "@/app/actions/games"

// Each scratch card has 3 visible slots that reveal when scratched.
// Scratch cards are earned separately from spins: 2 cards per valid referral.

type Prize = { amount: number; weight: number }

type Props = {
  cardsAvailable: number
  scratchPrizes: Prize[]
  scratchCardsPerReferral: number
  balance: number
}

function pickPrize(prizes: Prize[]): number {
  const total = prizes.reduce((s, p) => s + p.weight, 0)
  let r = Math.random() * total
  for (const p of prizes) {
    r -= p.weight
    if (r <= 0) return p.amount
  }
  return 0
}

function prizeLabel(amount: number) {
  if (amount === -1) return "BONUS"
  if (amount === 0) return "MISS"
  return formatNaira(amount)
}

function prizeColor(amount: number) {
  if (amount === -1) return "bg-primary text-primary-foreground"
  if (amount === 0) return "bg-surface text-muted-foreground"
  if (amount >= 500) return "bg-gold text-gold-foreground"
  if (amount >= 200) return "bg-success text-success-foreground"
  return "bg-card text-foreground"
}

// Canvas-based scratch overlay
function ScratchOverlay({
  onRevealed,
  disabled,
}: {
  onRevealed: () => void
  disabled: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scratched = useRef(false)
  const painting = useRef(false)
  const revealedRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Fill canvas with a foil-style silver gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    grad.addColorStop(0, "#c8c8c8")
    grad.addColorStop(0.4, "#e8e8e8")
    grad.addColorStop(0.7, "#b0b0b0")
    grad.addColorStop(1, "#d4d4d4")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // "SCRATCH HERE" text
    ctx.fillStyle = "#888"
    ctx.font = "bold 13px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("SCRATCH HERE", canvas.width / 2, canvas.height / 2)

    scratched.current = false
    revealedRef.current = false
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ("touches" in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }

  function scratch(x: number, y: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.globalCompositeOperation = "destination-out"
    ctx.beginPath()
    ctx.arc(x, y, 22, 0, Math.PI * 2)
    ctx.fill()
    scratched.current = true

    // Check reveal threshold (~50% of pixels cleared)
    if (!revealedRef.current) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let cleared = 0
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0) cleared++
      }
      const pct = cleared / (canvas.width * canvas.height)
      if (pct > 0.5) {
        revealedRef.current = true
        // Clear remaining
        ctx.globalCompositeOperation = "destination-out"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        onRevealed()
      }
    }
  }

  if (disabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={100}
      className="absolute inset-0 h-full w-full cursor-crosshair touch-none rounded-2xl"
      onMouseDown={() => (painting.current = true)}
      onMouseUp={() => (painting.current = false)}
      onMouseLeave={() => (painting.current = false)}
      onMouseMove={(e) => { if (painting.current) scratch(...Object.values(getPos(e, e.currentTarget)) as [number, number]) }}
      onTouchStart={(e) => { painting.current = true; const p = getPos(e, e.currentTarget); scratch(p.x, p.y) }}
      onTouchEnd={() => (painting.current = false)}
      onTouchMove={(e) => { if (painting.current) { const p = getPos(e, e.currentTarget); scratch(p.x, p.y) } }}
    />
  )
}

function CardSlot({ value, revealed }: { value: number; revealed: boolean }) {
  return (
    <div className={`relative flex h-16 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-ink transition-all ${revealed ? prizeColor(value) : "bg-surface"}`}>
      {revealed ? (
        <span className="text-sm font-black tabular-nums">{prizeLabel(value)}</span>
      ) : (
        <span className="text-xs font-bold text-muted-foreground">?</span>
      )}
    </div>
  )
}

type CardState = "idle" | "scratching" | "revealed" | "claiming" | "done"

function ScratchCardUnit({
  prizes,
  onClaim,
  disabled,
}: {
  prizes: Prize[]
  onClaim: () => void
  disabled: boolean
}) {
  const [state, setState] = useState<CardState>("idle")
  // Generate 3 slots — one is the "win" slot, the other two are decoratives
  const [slots] = useState<number[]>(() => {
    // Pick the actual prize for slot 0
    const win = pickPrize(prizes)
    // Decorative slots: random amounts from the pool for visual effect
    const decoy1 = pickPrize(prizes)
    const decoy2 = pickPrize(prizes)
    return [win, decoy1, decoy2]
  })
  const [revealedIdx, setRevealedIdx] = useState<boolean[]>([false, false, false])

  function handleScratchDone() {
    setRevealedIdx([true, true, true])
    setState("revealed")
  }

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
      {/* Card header */}
      <div className="flex items-center justify-between border-b-2 border-ink bg-primary px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary-foreground" />
          <span className="text-xs font-black uppercase tracking-wider text-primary-foreground">Scratch &amp; Win</span>
        </div>
        {state === "revealed" && (
          <span className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-[10px] font-black ${slots[0] > 0 ? "bg-gold text-gold-foreground" : "bg-surface text-muted-foreground"}`}>
            {slots[0] > 0 ? "WIN!" : "Try again"}
          </span>
        )}
      </div>

      {/* Scratch zone */}
      <div className="p-4">
        <div className="relative">
          {/* Reveal layer — the 3 slots */}
          <div className="grid grid-cols-3 gap-2">
            {slots.map((v, i) => (
              <CardSlot key={i} value={v} revealed={revealedIdx[i]} />
            ))}
          </div>
          {/* Scratch overlay sits on top */}
          {state === "idle" && !disabled && (
            <div className="absolute inset-0">
              <ScratchOverlay onRevealed={handleScratchDone} disabled={false} />
            </div>
          )}
          {state === "idle" && disabled && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface/90">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {state === "idle" && !disabled && (
          <p className="mt-3 text-center text-[11px] font-bold text-muted-foreground">
            Scratch the card above to reveal your prize
          </p>
        )}

        {state === "revealed" && (
          <div className="mt-3 flex flex-col items-center gap-3">
            <div className={`flex items-center gap-2 rounded-2xl border-2 border-ink px-4 py-2 ${slots[0] > 0 ? "bg-gold/20" : "bg-surface"}`}>
              {slots[0] > 0 ? (
                <>
                  <Sparkles className="h-4 w-4 text-gold-foreground" />
                  <span className="font-black text-foreground">
                    {slots[0] === -1 ? "You won a bonus spin!" : `You won ${formatNaira(slots[0])}!`}
                  </span>
                </>
              ) : (
                <span className="text-sm font-bold text-muted-foreground">No win this time</span>
              )}
            </div>
            <button
              onClick={() => { setState("done"); onClaim() }}
              className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3 text-sm font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
            >
              Claim &amp; Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ScratchCardGame({ cardsAvailable, scratchPrizes, scratchCardsPerReferral, balance }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [playsLeft, setPlaysLeft] = useState(cardsAvailable)
  const [cardKey, setCardKey] = useState(0)
  const [lastWin, setLastWin] = useState<number | null>(null)
  const [history, setHistory] = useState<{ amount: number; label: string }[]>([])

  function handleClaim() {
    startTransition(async () => {
      const res = await playScratchCard()
      if (res.ok) {
        if (res.winAmount && res.winAmount > 0) toast.success(`You won ${formatNaira(res.winAmount)}!`)
        else toast.info("Better luck next time!")
        const won = res.winAmount ?? 0
        setLastWin(won)
        setHistory((h) => [{ amount: won, label: prizeLabel(won) }, ...h].slice(0, 5))
        setPlaysLeft(res.cardsLeft ?? Math.max(0, playsLeft - 1))
        setCardKey((k) => k + 1)
        router.refresh()
      } else {
        toast.error(res.message ?? "Could not process card. Try again.")
      }
    })
  }

  const totalWon = history.filter((h) => h.amount > 0 && h.amount !== -1).reduce((s, h) => s + h.amount, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-glass flex flex-col items-center gap-1 rounded-2xl p-3 text-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink bg-primary">
            <Star className="h-4 w-4 text-primary-foreground" />
          </span>
          <p className="text-lg font-black tabular-nums">{playsLeft}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cards Left</p>
        </div>
        <div className="card-glass flex flex-col items-center gap-1 rounded-2xl p-3 text-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink bg-success">
            <Sparkles className="h-4 w-4 text-success-foreground" />
          </span>
          <p className="text-lg font-black tabular-nums">{formatNaira(totalWon)}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Won</p>
        </div>
        <div className="card-glass flex flex-col items-center gap-1 rounded-2xl p-3 text-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink bg-gold">
            <Trophy className="h-4 w-4 text-gold-foreground" />
          </span>
          <p className="text-lg font-black tabular-nums">{history.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Played</p>
        </div>
      </div>

      {/* How it works */}
      <div className="flex items-start gap-2.5 rounded-2xl border-2 border-ink bg-gold/15 px-3 py-2.5">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-foreground" />
        <p className="text-[11px] font-semibold leading-relaxed text-foreground">
          Every investment plan you buy and every friend you refer who invests earns you 1 scratch card and 1 Lucky Roulette spin — each game has its own separate pool.
        </p>
      </div>

      {/* Card or no-plays state */}
      {playsLeft > 0 ? (
        <ScratchCardUnit
          key={cardKey}
          prizes={scratchPrizes}
          onClaim={handleClaim}
          disabled={pending}
        />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-ink bg-card px-6 py-10 text-center shadow-[4px_4px_0_0_var(--ink)]">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-surface">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </span>
          <div>
            <p className="font-black uppercase">No cards left</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Buy a new plan or refer a friend who invests to earn more cards.
            </p>
          </div>
          <button
            onClick={() => router.push("/products")}
            className="press flex h-11 items-center gap-2 rounded-2xl border-2 border-ink bg-primary px-6 text-sm font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
          >
            View Plans
          </button>
        </div>
      )}

      {/* Recent history */}
      {history.length > 0 && (
        <div className="card-glass overflow-hidden rounded-3xl">
          <div className="border-b-2 border-ink/15 px-4 py-3">
            <p className="text-sm font-black">Recent Scratches</p>
          </div>
          <ul className="divide-y-2 divide-ink/10">
            {history.map((h, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 border-ink text-[10px] font-black ${h.amount > 0 ? "bg-gold text-gold-foreground" : "bg-surface text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-bold">Card #{history.length - i}</span>
                </div>
                <span className={`text-sm font-black tabular-nums ${h.amount > 0 ? "text-success" : "text-muted-foreground"}`}>
                  {h.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
