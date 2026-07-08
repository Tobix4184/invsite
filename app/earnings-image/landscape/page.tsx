import { PLANS, SITE, getTotalEarning } from "@/lib/plans"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PrintButton } from "@/components/print-button"

export const dynamic = "force-dynamic"

function N(n: number) {
  return "₦" + n.toLocaleString("en-NG")
}

const LOGO_SVG = (
  <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
    <path d="M20 2L38 12V28L20 38L2 28V12L20 2Z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.5"/>
    <path d="M20 2L38 12L28 12L20 5Z" fill="#c9a84c"/>
    <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
      fontSize="10" fontWeight="900" fill="white" letterSpacing="-0.5">247</text>
  </svg>
)

export default async function LandscapeEarningsPoster() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-6 px-4 gap-5"
      style={{ background: "#f0f0f0" }}
    >
      <p className="text-sm font-bold text-gray-500 print:hidden">
        Landscape poster — best saved on desktop (Save / Print → Save as PDF) or screenshot on a wide screen.
      </p>

      {/* ────────────────────────────────────────────────────────── */}
      {/* LANDSCAPE POSTER — 900px wide × auto height               */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        id="landscape-poster"
        style={{
          width: 900,
          background: "#1a3d2b",
          borderRadius: 20,
          overflow: "hidden",
          fontFamily: "Archivo, system-ui, sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}
      >

        {/* ── TOP HEADER ── */}
        <div style={{
          background: "#0f2518",
          padding: "18px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              border: "2px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {LOGO_SVG}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>247 Incum</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                Invest · Earn · Grow
              </div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
              Investment Plans
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
              Earn <span style={{ color: "#4ade80" }}>daily returns</span> on every plan
            </div>
          </div>

          {/* URL + CTA */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{
              background: "#c9a84c", borderRadius: 20, padding: "6px 16px",
              fontSize: 11, fontWeight: 900, color: "#1a1a1a",
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              Join Now
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.45)" }}>
              www.247incumb.fun
            </div>
          </div>
        </div>

        {/* ── BODY: left table + right info ── */}
        <div style={{ display: "flex" }}>

          {/* LEFT: Plans table */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Col headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.85fr 0.85fr 0.95fr 0.5fr 0.7fr",
              padding: "8px 20px",
              background: "#0a1a10",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
              {["Plan", "Invest", "Daily Earn", "Total Return", "Days", "Salary Pts"].map((h) => (
                <div key={h} style={{
                  fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {PLANS.map((plan, i) => {
              const total = getTotalEarning(plan)
              const isVip = plan.tier === "VIP"
              const rowBg = isVip
                ? "rgba(201,168,76,0.08)"
                : i % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)"
              return (
                <div
                  key={plan.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.85fr 0.85fr 0.95fr 0.5fr 0.7fr",
                    padding: "9px 20px",
                    background: rowBg,
                    borderLeft: isVip ? "3px solid #c9a84c" : "3px solid transparent",
                    borderBottom: i < PLANS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    alignItems: "center",
                  }}
                >
                  {/* Name */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{plan.name}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: isVip ? "#c9a84c" : "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>
                      {plan.tier}
                    </div>
                  </div>
                  {/* Invest */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{N(plan.price)}</div>
                  {/* Daily */}
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#4ade80" }}>{N(plan.dailyEarning)}</div>
                  {/* Total */}
                  <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.85)" }}>{N(total)}</div>
                  {/* Days */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)" }}>{plan.durationDays}d</div>
                  {/* Daily pts */}
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#c9a84c" }}>{plan.dailyPoints.toLocaleString()} pts</div>
                </div>
              )
            })}
          </div>

          {/* RIGHT: Info panel */}
          <div style={{
            width: 240, flexShrink: 0,
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            background: "#0f2518",
            display: "flex", flexDirection: "column",
          }}>

            {/* Platform rules */}
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 8 }}>
                Platform Rules
              </div>
              {[
                ["Min. Deposit",    N(SITE.minDeposit)],
                ["Min. Withdrawal", N(SITE.minWithdrawal)],
                ["Withdrawal Fee",  `${SITE.withdrawalCharge}%`],
                ["Earnings Drop",   "Every 24 hours"],
                ["Withdraw Day",    "Wed / Thu / Fri"],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#fff" }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Referral */}
            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 8 }}>
                Referral Bonus
              </div>
              {[
                ["Level 1 Commission", `${SITE.referralLevel1}%`],
                ["Level 2 Commission", `${SITE.referralLevel2}%`],
                ["Join Bonus (each)",  "1,000 pts"],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#c9a84c" }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Extra earnings */}
            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 8 }}>
                Extra Earnings
              </div>
              {[
                ["Task Cash",      "Up to ₦1,000"],
                ["Task Points",    "50 – 200 pts"],
                ["Weekend Salary", "Points → ₦ on Sat"],
                ["Game Spins",     "1 per plan bought"],
                ["Scratch Cards",  "1 per plan + 2/ref"],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{label}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Daily salary pts per plan */}
            <div style={{ padding: "14px 16px", flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 6 }}>
                Daily Salary Points
              </div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", lineHeight: 1.4, marginBottom: 8 }}>
                Points convert to ₦ every Saturday. Active plan required to withdraw.
              </div>
              {PLANS.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>{p.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 900, color: "#c9a84c" }}>{p.dailyPoints.toLocaleString()} pts/day</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          background: "#0a1a10",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "10px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#4ade80" }}>
            Earnings drop every 24 hours
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
            Withdrawal mornings on your tier day
          </div>
          <div style={{
            fontSize: 11, fontWeight: 900,
            color: "#c9a84c",
            border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: 20, padding: "4px 14px",
          }}>
            www.247incumb.fun
          </div>
        </div>

      </div>{/* end poster */}

      {/* ── Action bar ── */}
      <div className="flex w-full flex-col items-center gap-3 print:hidden" style={{ maxWidth: 900 }}>
        <div className="flex w-full gap-2 max-w-sm mx-auto">
          <PrintButton />
          <Link
            href="/earnings-image"
            className="press flex flex-1 items-center justify-center rounded-xl border-2 border-ink bg-card py-2.5 text-[12px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_var(--ink)]"
          >
            Portrait
          </Link>
        </div>
      </div>
    </div>
  )
}
