"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Check, Users, UserPlus, Share2, Coins, Trophy, Gift, Loader2, Star } from "lucide-react"
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
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate font-mono text-sm">{value}</span>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  )
}

export function TeamView({ data, milestonesData }: { data: TeamData; milestonesData: MilestonesData }) {
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const inviteLink = origin ? `${origin}/r/${data.inviteCode}` : `/r/${data.inviteCode}`
  const level1Rate = data.isPromoter ? SITE.promoterLevel1 : SITE.referralLevel1

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5 animate-fade-up">
      <section className="card-glass relative overflow-hidden rounded-3xl p-5 glow-primary">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary">
            <Share2 className="h-5 w-5" />
            <p className="text-sm font-bold">Invite &amp; Earn</p>
            {data.isPromoter && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                <Star className="h-3 w-3" /> Promoter
              </span>
            )}
          </div>
          <h2 className="mt-2 text-xl font-black text-balance">
            Earn {level1Rate}% on Level 1 and {SITE.referralLevel2}% on Level 2 deposits
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            <CopyField label="Invitation Code" value={data.inviteCode} />
            <CopyField label="Invitation Link" value={inviteLink} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card-glass rounded-2xl p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/12">
            <Coins className="h-4 w-4 text-success" />
          </span>
          <p className="mt-2.5 text-2xl font-black tabular-nums">{formatNaira(data.totalCommission)}</p>
          <p className="text-xs text-muted-foreground">Total commission</p>
        </div>
        <div className="card-glass rounded-2xl p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12">
            <Users className="h-4 w-4 text-primary" />
          </span>
          <p className="mt-2.5 text-2xl font-black tabular-nums">{data.totalMembers}</p>
          <p className="text-xs text-muted-foreground">Total members</p>
        </div>
      </section>

      {milestonesData.milestones.length > 0 && <MilestonesSection data={milestonesData} />}

      <LevelBlock
        title="Level 1 Members"
        rate={level1Rate}
        tint={data.isPromoter ? "text-gold" : "text-primary"}
        bg={data.isPromoter ? "bg-gold/15" : "bg-primary/15"}
        members={data.level1}
        isPromoter={data.isPromoter}
      />
      <LevelBlock title="Level 2 Members" rate={SITE.referralLevel2} tint="text-primary" bg="bg-primary/15" members={data.level2} />
    </main>
  )
}

function MilestonesSection({ data }: { data: MilestonesData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [claimingId, setClaimingId] = useState<number | null>(null)

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
    <section className="card-glass overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-border/60 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15">
            <Trophy className="h-4 w-4 text-gold" />
          </span>
          <div>
            <p className="font-black leading-tight">Referral Milestones</p>
            <p className="text-xs text-muted-foreground">You have {data.referralCount} referrals</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {data.milestones.map((m) => {
          const progress = Math.min((data.referralCount / m.referralCount) * 100, 100)
          return (
            <div key={m.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${m.claimed ? "bg-success/15" : "bg-gold/15"}`}>
                  {m.claimed ? <Check className="h-5 w-5 text-success" /> : <Gift className="h-5 w-5 text-gold" />}
                </div>
                <div>
                  <p className="text-sm font-bold">{m.referralCount} Referrals</p>
                  <p className="text-xs font-semibold text-success">{formatNaira(Number(m.rewardAmount))}</p>
                  {!m.claimed && (
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
              {m.claimed ? (
                <span className="rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold text-success">Claimed</span>
              ) : m.canClaim ? (
                <button
                  onClick={() => handleClaim(m.id)}
                  disabled={pending}
                  className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-gold-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                >
                  {claimingId === m.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Claim
                </button>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {data.referralCount}/{m.referralCount}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function LevelBlock({
  title,
  rate,
  tint,
  bg,
  members,
  isPromoter = false,
}: {
  title: string
  rate: number
  tint: string
  bg: string
  members: Member[]
  isPromoter?: boolean
}) {
  return (
    <section className="card-glass overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-border/60 p-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
            <Users className={`h-4 w-4 ${tint}`} />
          </span>
          <div>
            <p className="font-black leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">
              {rate}% commission{isPromoter && " (Promoter)"}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-sm font-bold tabular-nums">{members.length}</span>
      </div>
      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface">
            <UserPlus className="h-6 w-6 text-muted-foreground/50" />
          </span>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">No members yet</p>
          <p className="text-xs text-muted-foreground/70">Share your invitation code to start building your team.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {members.map((m, i) => (
            <li key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-sm font-bold">
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-bold leading-tight">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
              </div>
              <span className="text-sm font-black text-success tabular-nums">{formatNaira(m.commission)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
