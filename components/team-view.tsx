"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Copy, Check, Users, UserPlus, Share2, Coins, Trophy, Gift,
  Loader2, Star, TrendingUp, ChevronDown, ChevronUp, ArrowUpRight,
} from "lucide-react"
import { toast } from "sonner"
import { SITE, formatNaira } from "@/lib/plans"
import { claimMilestone } from "@/app/actions/referral"

type Member = { name: string; email: string; commission: number; joined: Date | string | null }
type TeamData = {
  inviteCode: string
  isPromoter: boolean
  level1: Member[]
  level2: Member[]
  totalCommission: number
  totalMembers: number
}

type MilestoneItem = {
  id: number
  referralCount: number
  rewardAmount: string
  canClaim: boolean
  claimed: boolean
}

type MilestonesData = {
  referralCount: number
  milestones: MilestoneItem[]
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }
  return { copied, copy }
}

export function TeamView({ data, milestonesData }: { data: TeamData; milestonesData: MilestonesData }) {
  const [origin, setOrigin] = useState("")
  useEffect(() => { setOrigin(window.location.origin) }, [])

  const inviteLink = origin ? `${origin}/r/${data.inviteCode}` : `/r/${data.inviteCode}`
  const level1Rate = data.isPromoter ? SITE.promoterLevel1 : SITE.referralLevel1
  const codeRef = useCopy(data.inviteCode)
  const linkRef = useCopy(inviteLink)

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5 animate-fade-up">

      {/* ── Hero banner ─────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-ink shadow-[5px_5px_0_0_var(--ink)]">
        {/* Dark primary background */}
        <div className="bg-primary px-5 pb-5 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary-foreground/80" />
              <span className="text-xs font-black uppercase tracking-widest text-primary-foreground/80">My Network</span>
            </div>
            {data.isPromoter && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-gold px-2.5 py-0.5 text-[10px] font-black text-gold-foreground">
                <Star className="h-3 w-3" /> Promoter
              </span>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight text-primary-foreground text-balance">
            Earn {level1Rate}% on L1 &middot; {SITE.referralLevel2}% on L2
          </h2>
          <p className="mt-1 text-xs font-semibold text-primary-foreground/70">
            Every deposit your referral makes earns you commission automatically.
          </p>

          {/* Stat chips */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <StatChip
              icon={Coins}
              label="Total Commission"
              value={formatNaira(data.totalCommission)}
              bg="bg-primary-foreground/15"
              fg="text-primary-foreground"
            />
            <StatChip
              icon={Users}
              label="Total Members"
              value={String(data.totalMembers)}
              bg="bg-primary-foreground/15"
              fg="text-primary-foreground"
            />
          </div>
        </div>

        {/* Invite zone */}
        <div className="border-t-2 border-ink bg-card px-5 py-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Share your invite
          </p>
          <div className="flex flex-col gap-2.5">
            {/* Code pill */}
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-xl border-2 border-ink bg-surface px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code</p>
                <p className="font-mono text-base font-black tracking-widest">{data.inviteCode}</p>
              </div>
              <button
                onClick={codeRef.copy}
                className={`press flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-ink shadow-[2px_2px_0_0_var(--ink)] transition-colors ${codeRef.copied ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}`}
              >
                {codeRef.copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="text-[8px] font-black uppercase">{codeRef.copied ? "Done" : "Copy"}</span>
              </button>
            </div>

            {/* Link row */}
            <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-surface pl-3 pr-1.5 py-1.5">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{inviteLink}</span>
              <button
                onClick={linkRef.copy}
                className={`press flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-ink px-3 py-2 text-xs font-black shadow-[2px_2px_0_0_var(--ink)] transition-colors ${linkRef.copied ? "bg-success text-success-foreground" : "bg-card text-foreground"}`}
              >
                {linkRef.copied ? <Check className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                {linkRef.copied ? "Copied" : "Share"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Milestones ───────────────────────────────────────── */}
      {milestonesData.milestones.length > 0 && (
        <MilestonesSection data={milestonesData} />
      )}

      {/* ── Level blocks ─────────────────────────────────────── */}
      <LevelBlock
        title="Level 1"
        subtitle={`${level1Rate}% commission${data.isPromoter ? " (Promoter)" : ""}`}
        members={data.level1}
        accent="bg-primary"
        accentFg="text-primary-foreground"
        badge={data.isPromoter ? "Promoter" : undefined}
      />
      <LevelBlock
        title="Level 2"
        subtitle={`${SITE.referralLevel2}% commission`}
        members={data.level2}
        accent="bg-success"
        accentFg="text-success-foreground"
      />
    </main>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
  bg,
  fg,
}: {
  icon: typeof Coins
  label: string
  value: string
  bg: string
  fg: string
}) {
  return (
    <div className={`flex items-center gap-2.5 rounded-2xl border-2 border-white/20 ${bg} px-3 py-2.5`}>
      <Icon className={`h-4 w-4 shrink-0 ${fg}`} />
      <div className="min-w-0">
        <p className={`text-xs font-black tabular-nums ${fg}`}>{value}</p>
        <p className={`truncate text-[10px] font-bold opacity-70 ${fg}`}>{label}</p>
      </div>
    </div>
  )
}

function MilestonesSection({ data }: { data: MilestonesData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [claimingId, setClaimingId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)

  const visible = expanded ? data.milestones : data.milestones.slice(0, 3)

  function handleClaim(id: number) {
    setClaimingId(id)
    startTransition(async () => {
      const res = await claimMilestone(id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      setClaimingId(null)
      router.refresh()
    })
  }

  return (
    <section className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b-2 border-ink bg-gold/15 px-4 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-gold">
          <Trophy className="h-4 w-4 text-gold-foreground" />
        </span>
        <div className="flex-1">
          <p className="font-black leading-tight">Referral Milestones</p>
          <p className="text-xs text-muted-foreground">{data.referralCount} referrals so far</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-gold px-2.5 py-1">
          <TrendingUp className="h-3 w-3 text-gold-foreground" />
          <span className="text-[10px] font-black text-gold-foreground tabular-nums">{data.referralCount}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-1">
        {(() => {
          const next = data.milestones.find((m) => !m.claimed)
          if (!next) return null
          const pct = Math.min((data.referralCount / next.referralCount) * 100, 100)
          return (
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span>Progress to next milestone</span>
                <span className="tabular-nums">{data.referralCount}/{next.referralCount}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-ink bg-surface">
                <div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })()}
      </div>

      {/* Milestone rows */}
      <ul className="divide-y-2 divide-ink/10 px-0">
        {visible.map((m) => {
          const progress = Math.min((data.referralCount / m.referralCount) * 100, 100)
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink ${m.claimed ? "bg-success" : m.canClaim ? "bg-gold" : "bg-surface"}`}>
                {m.claimed
                  ? <Check className="h-5 w-5 text-success-foreground" />
                  : <Gift className={`h-5 w-5 ${m.canClaim ? "text-gold-foreground" : "text-muted-foreground"}`} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black">{m.referralCount} Referrals</p>
                <p className="text-xs font-bold text-success">{formatNaira(Number(m.rewardAmount))}</p>
                {!m.claimed && !m.canClaim && (
                  <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full border border-ink/20 bg-surface">
                    <div className="h-full bg-gold/70 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              {m.claimed ? (
                <span className="shrink-0 rounded-full border-2 border-ink bg-success px-3 py-1 text-xs font-black text-success-foreground">Claimed</span>
              ) : m.canClaim ? (
                <button
                  onClick={() => handleClaim(m.id)}
                  disabled={pending}
                  className="press shrink-0 flex items-center gap-1.5 rounded-xl border-2 border-ink bg-gold px-4 py-2 text-sm font-black text-gold-foreground shadow-[2px_2px_0_0_var(--ink)] disabled:opacity-60"
                >
                  {claimingId === m.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Claim
                </button>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{data.referralCount}/{m.referralCount}</span>
              )}
            </li>
          )
        })}
      </ul>

      {data.milestones.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t-2 border-ink/10 py-3 text-xs font-black text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all {data.milestones.length} milestones</>}
        </button>
      )}
    </section>
  )
}

function LevelBlock({
  title,
  subtitle,
  members,
  accent,
  accentFg,
  badge,
}: {
  title: string
  subtitle: string
  members: Member[]
  accent: string
  accentFg: string
  badge?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? members : members.slice(0, 5)

  return (
    <section className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink ${accent}`}>
            <Users className={`h-4 w-4 ${accentFg}`} />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-black leading-tight">{title}</p>
              {badge && (
                <span className="rounded-full border border-ink/30 bg-gold/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-gold-foreground">{badge}</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <span className="rounded-full border-2 border-ink bg-surface px-3 py-1 text-sm font-black tabular-nums">{members.length}</span>
      </div>

      {/* Empty state */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-surface">
            <UserPlus className="h-6 w-6 text-muted-foreground/40" />
          </span>
          <div>
            <p className="font-black">No members yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Share your invite code to start building your network.</p>
          </div>
        </div>
      ) : (
        <>
          <ul className="divide-y-2 divide-ink/10">
            {visible.map((m, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${accent} text-sm font-black ${accentFg}`}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{m.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-success tabular-nums">{formatNaira(m.commission)}</p>
                  <p className="text-[10px] text-muted-foreground">earned</p>
                </div>
              </li>
            ))}
          </ul>
          {members.length > 5 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 border-t-2 border-ink/10 py-3 text-xs font-black text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded
                ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                : <><ChevronDown className="h-3.5 w-3.5" /> {members.length - 5} more members</>
              }
            </button>
          )}
        </>
      )}
    </section>
  )
}
