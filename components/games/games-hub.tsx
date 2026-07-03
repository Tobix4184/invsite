"use client"

import { useState } from "react"
import { Dices, Ticket, ArrowLeft, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { StakeSpinGame } from "./stake-spin"
import { LuckyDrawGame } from "./lucky-draw"

type Tab = "spin" | "draw"

type Round = {
  drawDate: string
  prizePool: string | number
  status: string
} | null

type Props = {
  balance: number
  activeInvestments: number
  hasDeposited: boolean
  today: string
  round: Round
  todaySlotsCount: number
  freeSlotAvailable: boolean
  hasActiveInvestment: boolean
  referralSlotsAvailable: number
  recentWinners: { name: string; amount: number; drawDate: string; place: number }[]
  stakeMin: number
  stakeMax: number
  slotCost: number
}

const TABS: {
  id: Tab
  label: string
  icon: typeof Dices
  activeColor: string
  inactiveColor: string
  delay: string
}[] = [
  { id: "spin", label: "Stake & Spin", icon: Dices, activeColor: "text-gold", inactiveColor: "text-gold/60", delay: "0ms" },
  { id: "draw", label: "Lucky Draw", icon: Ticket, activeColor: "text-success", inactiveColor: "text-success/60", delay: "120ms" },
]

export function GamesHub(props: Props) {
  const { balance, hasDeposited } = props
  const [tab, setTab] = useState<Tab>("spin")

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black tracking-tight">Games</h1>
            <p className="font-mono text-xs text-muted-foreground">Balance: ₦{balance.toLocaleString()}</p>
          </div>
          <div className="flex h-7 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-bold text-primary">LIVE</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-5 animate-fade-up">
        {/* Deposit gate */}
        {!hasDeposited && (
          <div className="card-glass mb-5 flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
              <ShieldAlert className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-black">Deposit Required</p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                Make your first deposit to unlock all game features — Stake &amp; Spin and Lucky Draw.
              </p>
            </div>
            <Link
              href="/deposits"
              className="flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-black text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            >
              Make a Deposit
            </Link>
          </div>
        )}

        {/* Tab switcher + game content — only shown when user has deposited */}
        {hasDeposited && (
          <>
            <div className="card-glass mb-5 flex gap-2 rounded-2xl p-1.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                    tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="animate-shake" style={{ animationDelay: t.delay, display: "inline-flex" }}>
                    <t.icon className={`h-3.5 w-3.5 ${tab === t.id ? t.activeColor : t.inactiveColor}`} />
                  </span>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "spin" && <StakeSpinGame balance={balance} stakeMin={props.stakeMin} stakeMax={props.stakeMax} />}
            {tab === "draw" && (
              <LuckyDrawGame
                balance={balance}
                today={props.today}
                round={props.round}
                todaySlotsCount={props.todaySlotsCount}
                freeSlotAvailable={props.freeSlotAvailable}
                hasActiveInvestment={props.hasActiveInvestment}
                referralSlotsAvailable={props.referralSlotsAvailable}
                recentWinners={props.recentWinners}
                slotCost={props.slotCost}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
