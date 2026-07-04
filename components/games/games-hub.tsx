"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Dices, ScrewdriverIcon as ScratchIcon, ArrowLeft, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { StakeSpinGame } from "./stake-spin"
import { ScratchCardGame } from "./scratch-card"

type Tab = "spin" | "scratch"

type Props = {
  balance: number
  activeInvestments: number
  hasDeposited: boolean
  hasInvestment?: boolean
  today: string
  round: null
  todaySlotsCount: number
  freeSlotsRemaining: number
  hasActiveInvestment: boolean
  referralSlotsAvailable: number
  recentWinners: { name: string; amount: number; drawDate: string; place: number }[]
  spinsAvailable: number
  slotCost: number
  spinPrizes: { amount: number; weight: number }[]
}

const TABS: {
  id: Tab
  label: string
  icon: typeof Dices
  activeColor: string
  inactiveColor: string
  delay: string
}[] = [
  { id: "spin",    label: "Lucky Roulette", icon: Dices,       activeColor: "text-gold",    inactiveColor: "text-gold/60",    delay: "0ms" },
  { id: "scratch", label: "Scratch Card",   icon: ScratchIcon, activeColor: "text-success", inactiveColor: "text-success/60", delay: "120ms" },
]

export function GamesHub(props: Props) {
  const { balance, hasDeposited } = props
  const canPlay = props.hasInvestment ?? hasDeposited
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("game") as Tab | null) ?? "spin"
  const [tab, setTab] = useState<Tab>(initialTab)

  // Sync if navigated to a different game via URL
  useEffect(() => {
    const g = searchParams.get("game") as Tab | null
    if (g === "spin" || g === "scratch") setTab(g)
  }, [searchParams])

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-card">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link
            href="/dashboard"
            className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black uppercase tracking-tight">Games</h1>
            <p className="font-mono text-xs font-bold text-muted-foreground">Balance: ₦{balance.toLocaleString()}</p>
          </div>
          <div className="flex h-7 items-center gap-1.5 rounded-full border-2 border-ink bg-primary px-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            </span>
            <span className="text-[10px] font-black text-primary-foreground">LIVE</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-5 animate-fade-up">
        {/* Investment gate */}
        {!canPlay && (
          <div className="card-glass mb-5 flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-surface">
              <ShieldAlert className="h-7 w-7 text-foreground" />
            </div>
            <div>
              <p className="text-lg font-black uppercase">Investment Required</p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                You need an active investment plan to access the Game Center. Invest now to unlock Lucky Roulette and Lucky Draw.
              </p>
            </div>
            <Link
              href="/products"
              className="press flex h-11 items-center gap-2 rounded-2xl border-2 border-ink bg-primary px-6 text-sm font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
            >
              View Plans
            </Link>
          </div>
        )}

        {/* Tab switcher + game content — only shown when user has an active investment */}
        {canPlay && (
          <>
            <div className="mb-5 flex gap-2 rounded-2xl border-2 border-ink bg-card p-1.5 shadow-[3px_3px_0_0_var(--ink)]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black uppercase tracking-wide transition-all ${
                    tab === t.id ? "border-2 border-ink bg-primary text-primary-foreground" : "border-2 border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="animate-shake" style={{ animationDelay: t.delay, display: "inline-flex" }}>
                    <t.icon className={`h-3.5 w-3.5 ${tab === t.id ? "text-primary-foreground" : t.inactiveColor}`} />
                  </span>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "spin" && <StakeSpinGame balance={balance} spinsAvailable={props.spinsAvailable} spinPrizes={props.spinPrizes} />}
            {tab === "scratch" && (
              <ScratchCardGame
                spinsAvailable={props.spinsAvailable}
                spinPrizes={props.spinPrizes}
                balance={balance}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
