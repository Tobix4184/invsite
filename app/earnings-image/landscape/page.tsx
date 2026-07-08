import { PLANS, SITE, getTotalEarning } from "@/lib/plans"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PrintButton } from "@/components/print-button"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return "₦" + n.toLocaleString("en-NG")
}

const TIER_DOT: Record<string, string> = {
  Entry:   "#4ade80",
  Popular: "#4ade80",
  Growth:  "#34d399",
  Premium: "#34d399",
  VIP:     "#c9a84c",
}

export default async function LandscapeEarningsPoster() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-6 px-4 gap-5">

      {/* ── Landscape Poster ───────────────────────────────────────────────── */}
      {/*
        Target: 1200 × 630px (standard OG / social card ratio).
        We render it at max-w-4xl (896px) and let the browser scale.
        For pixel-perfect export: zoom in browser to match 1200px wide then print.
      */}
      <div
        id="landscape-poster"
        className="w-full max-w-4xl overflow-hidden rounded-3xl border-2 border-white/20 shadow-[8px_8px_0_0_rgba(0,0,0,0.4)]"
        style={{ background: "#1a3d2b" }}
      >

        {/* ── TOP HEADER ROW ─────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-8 py-5"
          style={{ background: "#0f2518", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/10">
              <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <path d="M20 2L38 12V28L20 38L2 28V12L20 2Z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" />
                <path d="M20 2L38 12L28 12L20 5Z" fill="#c9a84c" opacity="0.95" />
                <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="Archivo, system-ui" fill="white" letterSpacing="-0.3">247</text>
              </svg>
            </div>
            <div className="leading-none">
              <p className="text-[20px] font-black tracking-tight text-white">247 Incum</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Invest · Earn · Grow</p>
            </div>
          </div>

          {/* Centre headline */}
          <div className="text-center">
            <p className="text-[13px] font-black uppercase tracking-[0.2em] text-white/40">Investment Plans</p>
            <p className="text-[22px] font-black leading-tight text-white">
              Earn <span style={{ color: "#4ade80" }}>daily returns</span> on every plan
            </p>
          </div>

          {/* URL + CTA */}
          <div className="flex flex-col items-end gap-1.5">
            <span
              className="rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-widest"
              style={{ background: "#c9a84c", color: "#1a1a1a" }}
            >
              Join Now
            </span>
            <p className="text-[11px] font-black text-white/50">www.247incumb.fun</p>
          </div>
        </div>

        {/* ── MAIN BODY: table left + info right ─────────────────────────── */}
        <div className="flex gap-0">

          {/* Plans table — left 70% */}
          <div className="flex-1 min-w-0">
            {/* Table header */}
            <div
              className="grid px-6 py-2.5"
              style={{
                gridTemplateColumns: "1.4fr 0.9fr 1fr 1fr 0.6fr 0.7fr",
                background: "#0d1f15",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {["Plan", "Invest", "Daily Earn", "Total Return", "Days", "Daily Pts"].map((h) => (
                <span key={h} className="text-[9px] font-black uppercase tracking-wider text-white/40">
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {PLANS.map((plan, i) => {
              const total = getTotalEarning(plan)
              const isVip = plan.tier === "VIP"
              const isLast = i === PLANS.length - 1
              const dot = TIER_DOT[plan.tier] ?? "#4ade80"
              return (
                <div
                  key={plan.id}
                  className={`grid items-center px-6 py-2 ${!isLast ? "border-b border-white/[0.06]" : ""}`}
                  style={{
                    gridTemplateColumns: "1.4fr 0.9fr 1fr 1fr 0.6fr 0.7fr",
                    background: isVip
                      ? "rgba(201,168,76,0.07)"
                      : i % 2 === 0
                      ? "rgba(255,255,255,0.03)"
                      : "transparent",
                    borderLeft: isVip ? "3px solid #c9a84c" : "3px solid transparent",
                  }}
                >
                  {/* Plan name + tier dot */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-black leading-none text-white truncate">{plan.name}</p>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-white/40">{plan.tier}</p>
                    </div>
                  </div>
                  {/* Invest */}
                  <span className="text-[11px] font-bold tabular-nums text-white/50">{fmt(plan.price)}</span>
                  {/* Daily earn — bright */}
                  <span className="text-[13px] font-black tabular-nums" style={{ color: "#4ade80" }}>
                    +{fmt(plan.dailyEarning)}
                  </span>
                  {/* Total */}
                  <span className="text-[12px] font-black tabular-nums text-white/80">{fmt(total)}</span>
                  {/* Days */}
                  <span className="text-[11px] font-bold tabular-nums text-white/40">{plan.durationDays}d</span>
                  {/* Daily pts */}
                  <span
                    className="text-[11px] font-black tabular-nums"
                    style={{ color: "#c9a84c" }}
                  >
                    {plan.dailyPoints.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Right info panel — 30% */}
          <div
            className="w-64 shrink-0 flex flex-col gap-0"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", background: "#0f2518" }}
          >

            {/* Platform rules */}
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Platform Rules</p>
              {[
                { label: "Min. Deposit",    val: fmt(SITE.minDeposit) },
                { label: "Min. Withdrawal", val: fmt(SITE.minWithdrawal) },
                { label: "Withdrawal Fee",  val: `${SITE.withdrawalCharge}%` },
                { label: "Earnings Drop",   val: "Every 24 hours" },
                { label: "Withdraw Day",    val: "Wed / Thu / Fri" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1">
                  <span className="text-[10px] text-white/50">{r.label}</span>
                  <span className="text-[11px] font-black text-white">{r.val}</span>
                </div>
              ))}
            </div>

            {/* Referral bonus */}
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Referral Bonus</p>
              {[
                { label: "Level 1 Commission", val: `${SITE.referralLevel1}%` },
                { label: "Level 2 Commission", val: `${SITE.referralLevel2}%` },
                { label: "Join Bonus (each)",  val: "1,000 pts" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1">
                  <span className="text-[10px] text-white/50">{r.label}</span>
                  <span className="text-[11px] font-black" style={{ color: "#c9a84c" }}>{r.val}</span>
                </div>
              ))}
            </div>

            {/* Task & weekend salary */}
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Extra Earnings</p>
              {[
                { label: "Task Cash",         val: "Up to ₦1,000" },
                { label: "Task Points",       val: "50 – 200 pts" },
                { label: "Weekend Salary",    val: "Points → ₦ on Sat" },
                { label: "Game Spins",        val: "1 per plan bought" },
                { label: "Scratch Cards",     val: "1 per plan + 2/ref" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1">
                  <span className="text-[10px] text-white/50">{r.label}</span>
                  <span className="text-[11px] font-black text-white/90">{r.val}</span>
                </div>
              ))}
            </div>

            {/* Weekend salary points table */}
            <div className="px-5 py-4">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Daily Salary Points</p>
              <p className="mb-2 text-[8px] text-white/30 leading-relaxed">
                Points convert to ₦ every Saturday. Requires active plan to withdraw.
              </p>
              <div className="text-[9px] text-white/40 flex justify-between mb-1">
                <span>Plan</span><span>Pts/day</span>
              </div>
              {PLANS.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-0.5">
                  <span className="text-[9px] text-white/60">{p.name}</span>
                  <span className="text-[9px] font-black" style={{ color: "#c9a84c" }}>
                    {p.dailyPoints.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-8 py-3"
          style={{ background: "#0d1f15", borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            Earnings drop every 24 hours · Withdrawal mornings on your tier day
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black" style={{ color: "#c9a84c" }}>
              10 pts = ₦5 weekend salary
            </span>
            <span
              className="rounded-full px-3 py-1 text-[10px] font-black"
              style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}
            >
              www.247incumb.fun
            </span>
          </div>
        </div>

      </div>

      {/* Action bar */}
      <div className="flex w-full max-w-4xl flex-col gap-2 print:hidden">
        <p className="text-center text-[11px] text-muted-foreground">
          On desktop: &quot;Save / Print&quot; → Save as PDF. On mobile: screenshot. Best shared as a photo on WhatsApp, Facebook, or Telegram.
        </p>
        <div className="flex gap-2">
          <PrintButton />
          <Link
            href="/earnings-image"
            className="press flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-ink bg-card py-2.5 text-[12px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_var(--ink)]"
          >
            Portrait View
          </Link>
        </div>
      </div>

    </div>
  )
}
