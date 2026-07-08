"use client"

import { useState } from "react"
import {
  TrendingUp,
  Zap,
  Users,
  ClipboardList,
  Star,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarClock,
  ArrowRight,
} from "lucide-react"
import { PLANS, SITE, formatNaira, getTotalEarning } from "@/lib/plans"

// ── Tier labels for the table ────────────────────────────────────────────────
const TIER_META: Record<string, { label: string; rowClass: string; badge: string }> = {
  Entry:   { label: "Entry",   rowClass: "bg-card",                    badge: "bg-primary/10 text-primary" },
  Popular: { label: "Popular", rowClass: "bg-primary/5",               badge: "bg-primary text-primary-foreground" },
  Growth:  { label: "Growth",  rowClass: "bg-card",                    badge: "bg-success/15 text-success" },
  Premium: { label: "Premium", rowClass: "bg-success/5",               badge: "bg-success/15 text-success" },
  VIP:     { label: "VIP",     rowClass: "bg-gold/8",                  badge: "bg-gold text-gold-foreground" },
}

function fmt(n: number) {
  return n.toLocaleString("en-NG")
}

// ── Task earning examples ─────────────────────────────────────────────────────
const TASK_EXAMPLES = [
  { name: "Rate a Service",          cash: "₦500",  pts: 50,   recurrence: "Per approval" },
  { name: "Share Referral Link",     cash: "₦0",    pts: 200,  recurrence: "Per approval" },
  { name: "Submit Business Review",  cash: "₦1,000",pts: 100,  recurrence: "Per approval" },
  { name: "Daily Check-in Bonus",    cash: "₦100",  pts: 10,   recurrence: "Daily" },
  { name: "Complete Survey",         cash: "₦750",  pts: 75,   recurrence: "Per approval" },
]

export function EarningsSheet() {
  const [expanded, setExpanded] = useState(false)
  const PREVIEW_COUNT = 5

  const visiblePlans = expanded ? PLANS : PLANS.slice(0, PREVIEW_COUNT)

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border-2 border-ink bg-primary shadow-[4px_4px_0_0_var(--ink)]">
        {/* top strip */}
        <div className="flex items-center justify-between border-b-2 border-white/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path d="M20 2L38 12V28L20 38L2 28V12L20 2Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" />
              <path d="M20 2L38 12L28 12L20 5Z" fill="#c9a84c" opacity="0.9" />
              <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="Archivo, system-ui" fill="white" letterSpacing="-0.5">247</text>
            </svg>
            <div className="leading-none">
              <span className="block text-[14px] font-black tracking-tight text-primary-foreground">247 Incum</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60">Invest · Earn · Grow</span>
            </div>
          </div>
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
            Earnings Guide
          </span>
        </div>
        {/* headline */}
        <div className="px-5 py-5">
          <h2 className="text-2xl font-black leading-tight text-primary-foreground text-balance">
            Everything You Earn,<br />In One Place.
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-primary-foreground/70">
            Fixed daily returns, weekly salary points, referral commissions, task rewards — all stacked.
          </p>
          {/* quick stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Min. Deposit",  value: formatNaira(SITE.minDeposit) },
              { label: "Min. Withdraw", value: formatNaira(SITE.minWithdrawal) },
              { label: "Withdraw Fee",  value: `${SITE.withdrawalCharge}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 text-center">
                <p className="text-base font-black tabular-nums text-primary-foreground">{s.value}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Investment Plans Table ───────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-black uppercase tracking-tight">
            <TrendingUp className="h-4 w-4 text-primary" />
            Investment Returns
          </h3>
          <span className="rounded-full border-2 border-ink bg-primary px-2.5 py-0.5 text-[10px] font-black text-primary-foreground">
            {PLANS.length} plans
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-ink shadow-[3px_3px_0_0_var(--ink)]">
          {/* column headers */}
          <div className="grid grid-cols-[1fr_72px_80px_80px_52px] border-b-2 border-ink bg-foreground px-3 py-2.5">
            {["Plan", "Price", "Daily", "Total", "Days"].map((h) => (
              <span key={h} className="text-[10px] font-black uppercase tracking-wider text-background/80">
                {h}
              </span>
            ))}
          </div>

          {/* rows */}
          {visiblePlans.map((plan, i) => {
            const meta = TIER_META[plan.tier] ?? TIER_META.Entry
            const total = getTotalEarning(plan)
            const isVip = plan.tier === "VIP"
            return (
              <div
                key={plan.id}
                className={`grid grid-cols-[1fr_72px_80px_80px_52px] items-center border-b border-ink/10 px-3 py-2.5 ${meta.rowClass} ${isVip ? "border-l-2 border-l-gold" : ""} ${i === visiblePlans.length - 1 ? "border-b-0" : ""}`}
              >
                {/* Plan name + tier badge */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    {plan.popular && <Star className="h-3 w-3 fill-gold text-gold" />}
                    <span className="text-[13px] font-black leading-none">{plan.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground">
                      {plan.dailyPoints.toLocaleString()} pts/day
                    </span>
                  </div>
                </div>
                {/* Price */}
                <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                  {fmt(plan.price)}
                </span>
                {/* Daily */}
                <span className="text-[12px] font-black tabular-nums text-success">
                  +{fmt(plan.dailyEarning)}
                </span>
                {/* Total */}
                <span className="text-[11px] font-bold tabular-nums">
                  {fmt(total)}
                </span>
                {/* Days */}
                <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                  {plan.durationDays}d
                </span>
              </div>
            )
          })}
        </div>

        {/* expand/collapse toggle */}
        {PLANS.length > PREVIEW_COUNT && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-card py-2.5 text-[12px] font-black shadow-[2px_2px_0_0_var(--ink)]"
          >
            {expanded ? (
              <><ChevronUp className="h-4 w-4" /> Show less</>
            ) : (
              <><ChevronDown className="h-4 w-4" /> Show all {PLANS.length} plans</>
            )}
          </button>
        )}
      </section>

      {/* ── Weekend Salary Points callout ───────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-[3px_3px_0_0_var(--ink)]">
        <div className="border-b-2 border-ink bg-gold px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wider text-gold-foreground">
            <Star className="h-3.5 w-3.5" />
            Weekend Salary Points
          </h3>
        </div>
        <div className="divide-y divide-ink/8">
          <div className="flex items-start justify-between px-4 py-3">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground">Earn rate</p>
              <p className="text-sm font-black">10 pts = ₦5</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-muted-foreground">Pays out</p>
              <p className="text-sm font-black flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                Every Saturday
              </p>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="mb-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Points per plan / day</p>
            <div className="grid grid-cols-3 gap-1.5">
              {PLANS.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink/15 bg-surface px-2 py-1.5">
                  <span className="text-[10px] font-black">{p.name}</span>
                  <span className="text-[10px] font-black text-primary">{p.dailyPoints.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 bg-primary/5 px-4 py-3">
            <Zap className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-foreground">
              Points accumulate daily with your returns. Withdraw to wallet every Saturday from the <strong>Weekend Salary</strong> page.
            </p>
          </div>
        </div>
      </section>

      {/* ── Task Earnings ────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-base font-black uppercase tracking-tight">Task Earnings</h3>
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-ink shadow-[3px_3px_0_0_var(--ink)]">
          {/* header */}
          <div className="grid grid-cols-[1fr_64px_56px_80px] border-b-2 border-ink bg-foreground px-3 py-2.5">
            {["Task", "Cash", "Pts", "Frequency"].map((h) => (
              <span key={h} className="text-[10px] font-black uppercase tracking-wider text-background/80">{h}</span>
            ))}
          </div>
          {TASK_EXAMPLES.map((t, i) => (
            <div
              key={t.name}
              className={`grid grid-cols-[1fr_64px_56px_80px] items-center border-b border-ink/10 px-3 py-2.5 ${i % 2 === 0 ? "bg-card" : "bg-surface/50"} ${i === TASK_EXAMPLES.length - 1 ? "border-b-0" : ""}`}
            >
              <span className="text-[12px] font-bold leading-tight pr-1">{t.name}</span>
              <span className="text-[12px] font-black tabular-nums text-success">{t.cash}</span>
              <span className="text-[11px] font-black tabular-nums text-primary">+{t.pts}</span>
              <span className="text-[10px] font-bold text-muted-foreground">{t.recurrence}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 border-t-2 border-ink bg-primary/5 px-3 py-2.5">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="text-[11px] text-foreground">
              Tasks are admin-created. Rewards vary — check the <strong>Tasks</strong> section for live opportunities.
            </p>
          </div>
        </div>
      </section>

      {/* ── Referral Commissions ─────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-base font-black uppercase tracking-tight">Referral Commissions</h3>
        </div>
        <div className="overflow-hidden rounded-2xl border-2 border-ink shadow-[3px_3px_0_0_var(--ink)]">
          {[
            { level: "Level 1", pct: SITE.referralLevel1, desc: "Direct referral — paid on every investment they make" },
            { level: "Level 2", pct: SITE.referralLevel2, desc: "Their referral — 2nd generation commission" },
            { level: "Join Bonus", pct: null, pts: "1,000 pts", desc: "Both you and your referral get 1,000 pts instantly" },
          ].map((r, i, arr) => (
            <div
              key={r.level}
              className={`flex items-center gap-4 border-b border-ink/10 px-4 py-3 ${i % 2 === 0 ? "bg-card" : "bg-surface/40"} ${i === arr.length - 1 ? "border-b-0" : ""}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-primary text-base font-black text-primary-foreground">
                {r.pct !== null ? `${r.pct}%` : <Star className="h-4 w-4 fill-gold text-gold" />}
              </div>
              <div>
                <p className="text-[13px] font-black">{r.level}</p>
                <p className="text-[11px] text-muted-foreground">{r.desc}</p>
              </div>
              {r.pts && (
                <span className="ml-auto text-[11px] font-black text-primary">{r.pts}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform Rules footer ────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border-2 border-ink bg-foreground shadow-[3px_3px_0_0_var(--ink)]">
        <div className="px-4 pt-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-background/60">Platform Rules</h3>
        </div>
        <div className="grid grid-cols-2 gap-px bg-ink/20 mt-3">
          {[
            { label: "Earnings Drop",    value: "Every 24 hours" },
            { label: "Withdrawal Hours", value: SITE.withdrawalHours },
            { label: "Tier 3 Withdraw",  value: "Every Wednesday" },
            { label: "Tier 2 Withdraw",  value: "Every Thursday" },
            { label: "Tier 1 (VIP)",     value: "Every Friday" },
            { label: "Weekend Salary",   value: "Every Saturday" },
          ].map((r) => (
            <div key={r.label} className="flex flex-col bg-foreground px-4 py-3">
              <span className="text-[9px] font-black uppercase tracking-wider text-background/50">{r.label}</span>
              <span className="mt-0.5 text-[12px] font-black text-background">{r.value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 bg-white/5 px-4 py-3">
          <Clock className="h-3.5 w-3.5 shrink-0 text-gold" />
          <p className="text-[11px] font-bold text-background/70">
            Earnings are automated. Returns are credited daily without any action needed from you.
          </p>
        </div>
      </section>

    </div>
  )
}
