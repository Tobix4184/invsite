import { PLANS, SITE, getTotalEarning } from "@/lib/plans"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PrintButton } from "@/components/print-button"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return "₦" + n.toLocaleString("en-NG")
}

const TIER_COLORS: Record<string, { row: string; badge: string; badgeText: string }> = {
  Entry:   { row: "",              badge: "#1a3d2b", badgeText: "#ffffff" },
  Popular: { row: "bg-primary/8",  badge: "#1a3d2b", badgeText: "#ffffff" },
  Growth:  { row: "",              badge: "#166534", badgeText: "#dcfce7" },
  Premium: { row: "bg-success/8",  badge: "#166534", badgeText: "#dcfce7" },
  VIP:     { row: "bg-gold/10",    badge: "#c9a84c", badgeText: "#1a1a1a" },
}

export default async function EarningsImagePage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-6 px-4">
      {/* ── Poster card ─────────────────────────────────────────────── */}
      <div
        id="earnings-poster"
        className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-ink shadow-[6px_6px_0_0_var(--ink)]"
        style={{ background: "#1a3d2b" }}
      >

        {/* Header */}
        <div className="px-6 pt-6 pb-5" style={{ background: "#1a3d2b" }}>
          {/* Logo row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/30 bg-white/10">
                <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                  <path d="M20 2L38 12V28L20 38L2 28V12L20 2Z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" />
                  <path d="M20 2L38 12L28 12L20 5Z" fill="#c9a84c" opacity="0.95" />
                  <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="Archivo, system-ui" fill="white" letterSpacing="-0.3">247</text>
                </svg>
              </div>
              <div className="leading-none">
                <p className="text-[15px] font-black tracking-tight text-white">247 Incum</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">Invest · Earn · Grow</p>
              </div>
            </div>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/80">
              Earnings Plan
            </span>
          </div>

          {/* Headline */}
          <h1 className="mt-5 text-[22px] font-black leading-tight tracking-tight text-white">
            Your daily returns,<br />
            <span style={{ color: "#c9a84c" }}>exactly what you earn.</span>
          </h1>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/60">
            Fixed daily income for the full plan duration. Earnings drop every 24 hours.
          </p>
        </div>

        {/* ── Plans table ──────────────────────────────────────────── */}
        <div className="mx-4 overflow-hidden rounded-2xl border-2 border-white/20">
          {/* Column headers */}
          <div
            className="grid px-3 py-2"
            style={{
              gridTemplateColumns: "1fr 72px 76px 72px 40px",
              background: "#0f2518",
            }}
          >
            {["Plan", "Price", "Daily", "Total", "Days"].map((h) => (
              <span key={h} className="text-[9px] font-black uppercase tracking-wider text-white/50">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {PLANS.map((plan, i) => {
            const tc = TIER_COLORS[plan.tier] ?? TIER_COLORS.Entry
            const total = getTotalEarning(plan)
            const isVip = plan.tier === "VIP"
            const isLast = i === PLANS.length - 1
            return (
              <div
                key={plan.id}
                className={`grid items-center px-3 py-2 ${!isLast ? "border-b border-white/10" : ""}`}
                style={{
                  gridTemplateColumns: "1fr 72px 76px 72px 40px",
                  background: isVip
                    ? "rgba(201,168,76,0.08)"
                    : i % 2 === 0
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.01)",
                  borderLeft: isVip ? "2.5px solid #c9a84c" : undefined,
                }}
              >
                {/* Name + badge */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[12px] font-black leading-none text-white truncate">
                    {plan.name}
                  </span>
                  <span
                    className="inline-block rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider w-fit"
                    style={{ background: tc.badge, color: tc.badgeText }}
                  >
                    {plan.tier}
                  </span>
                </div>
                {/* Price */}
                <span className="text-[10px] font-bold tabular-nums text-white/50">
                  {fmt(plan.price)}
                </span>
                {/* Daily — bright green */}
                <span className="text-[12px] font-black tabular-nums" style={{ color: "#4ade80" }}>
                  +{fmt(plan.dailyEarning)}
                </span>
                {/* Total */}
                <span className="text-[10px] font-bold tabular-nums text-white/70">
                  {fmt(total)}
                </span>
                {/* Days */}
                <span className="text-[10px] font-bold tabular-nums text-white/40">
                  {plan.durationDays}d
                </span>
              </div>
            )
          })}
        </div>

        {/* ── Info strips ──────────────────────────────────────────── */}
        <div className="mx-4 mt-3 overflow-hidden rounded-2xl border-2 border-white/20">
          {/* Platform rules */}
          <div
            className="grid grid-cols-2 gap-px"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {[
              { label: "Min. Deposit",    value: fmt(SITE.minDeposit) },
              { label: "Min. Withdrawal", value: fmt(SITE.minWithdrawal) },
              { label: "Withdrawal Fee",  value: `${SITE.withdrawalCharge}%` },
              { label: "Earnings Drop",   value: "Every 24 hours" },
            ].map((s, i) => (
              <div
                key={s.label}
                className="flex flex-col px-3 py-2.5"
                style={{
                  background: "#0f2518",
                  borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.1)" : undefined,
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.1)" : undefined,
                }}
              >
                <span className="text-[8px] font-black uppercase tracking-wider text-white/40">{s.label}</span>
                <span className="mt-0.5 text-[13px] font-black text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Referral + Task strip ─────────────────────────────────── */}
        <div className="mx-4 mt-3 overflow-hidden rounded-2xl border-2 border-white/20">
          <div
            className="grid grid-cols-2 gap-px"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {/* Referral bonus */}
            <div className="px-3 py-3" style={{ background: "#0f2518", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-[8px] font-black uppercase tracking-wider text-white/40 mb-1.5">Referral Bonus</p>
              {[
                { label: "Level 1", value: `${SITE.referralLevel1}%` },
                { label: "Level 2", value: `${SITE.referralLevel2}%` },
                { label: "Join Pts", value: "1,000 pts" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-white/60">{r.label}</span>
                  <span className="text-[10px] font-black" style={{ color: "#c9a84c" }}>{r.value}</span>
                </div>
              ))}
            </div>
            {/* Task earnings */}
            <div className="px-3 py-3" style={{ background: "#0f2518" }}>
              <p className="text-[8px] font-black uppercase tracking-wider text-white/40 mb-1.5">Task Earnings</p>
              {[
                { label: "Cash", value: "Up to ₦1,000" },
                { label: "Points", value: "50–200 pts" },
                { label: "Weekend pts", value: "Pay every Sat" },
              ].map((t) => (
                <div key={t.label} className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-white/60">{t.label}</span>
                  <span className="text-[10px] font-black text-white/90">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="px-5 py-4 mt-2 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#c9a84c" }}>
            Earnings drop every 24 hours
          </p>
          <p className="mt-0.5 text-[10px] text-white/40">
            Withdrawal: Mornings on your tier day
          </p>
          <div className="mt-3 flex items-center justify-center gap-1">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">www.247incumb.fun</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>

      </div>

      {/* Action bar */}
      <div className="mt-5 flex w-full max-w-sm flex-col gap-2 print:hidden">
        {/* Download / save instruction */}
        <p className="text-center text-[11px] text-muted-foreground">
          On mobile: screenshot this page. On desktop: use the button below.
        </p>
        <div className="flex gap-2">
          <PrintButton />
          <Link
            href="/earnings-image/landscape"
            className="press flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-ink bg-card py-2.5 text-[12px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_var(--ink)]"
          >
            Landscape
          </Link>
        </div>
      </div>
    </div>
  )
}
