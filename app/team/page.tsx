'use client'

import { useState } from 'react'
import { Copy, Check, Users, UserPlus, Share2, Coins } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { SITE, formatNaira } from '@/lib/plans'

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 p-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate font-mono text-sm">{value}</span>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function TeamPage() {
  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="My Team" />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/30 via-card to-card p-5">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-success/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-success">
              <Share2 className="h-5 w-5" />
              <p className="text-sm font-semibold">Invite & Earn</p>
            </div>
            <h2 className="mt-1 text-xl font-bold text-balance">
              Earn {SITE.referralLevel1}% on Level 1 and {SITE.referralLevel2}% on Level 2 deposits
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <CopyField label="Invitation Code" value={SITE.inviteCode} />
              <CopyField label="Invitation Link" value={SITE.inviteLink} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <Coins className="h-5 w-5 text-success" />
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatNaira(0)}</p>
            <p className="text-xs text-muted-foreground">Total commission</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <Users className="h-5 w-5 text-primary" />
            <p className="mt-2 text-2xl font-bold tabular-nums">0</p>
            <p className="text-xs text-muted-foreground">Total members</p>
          </div>
        </section>

        <LevelBlock
          title="Level 1 Members"
          rate={SITE.referralLevel1}
          tint="text-primary"
          bg="bg-primary/15"
        />
        <LevelBlock
          title="Level 2 Members"
          rate={SITE.referralLevel2}
          tint="text-sky-400"
          bg="bg-sky-400/15"
        />
      </main>

      <BottomNav />
    </div>
  )
}

function LevelBlock({
  title,
  rate,
  tint,
  bg,
}: {
  title: string
  rate: number
  tint: string
  bg: string
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
            <Users className={`h-4 w-4 ${tint}`} />
          </span>
          <div>
            <p className="font-semibold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">{rate}% commission</p>
          </div>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold tabular-nums">0</span>
      </div>
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <UserPlus className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No members yet</p>
        <p className="text-xs text-muted-foreground/70">
          Share your invitation code to start building your team.
        </p>
      </div>
    </section>
  )
}
