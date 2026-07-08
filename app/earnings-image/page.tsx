import { PLANS, SITE, getTotalEarning } from "@/lib/plans"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PrintButton } from "@/components/print-button"

export const dynamic = "force-dynamic"

function N(n: number) {
  return "₦" + n.toLocaleString("en-NG")
}

export default async function EarningsImagePage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-6 px-4 gap-5"
      style={{ background: "#f0f0f0" }}
    >
      {/* ────────────────────────────────────────────────────────── */}
      {/* POSTER — fixed 390px wide, like a phone screenshot         */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        id="poster"
        style={{
          width: 390,
          background: "#1a3d2b",
          borderRadius: 20,
          overflow: "hidden",
          fontFamily: "Archivo, system-ui, sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}
      >

        {/* ── Header ── */}
        <div style={{ background: "#0f2518", padding: "22px 20px 18px" }}>
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                border: "2px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                  <path d="M20 2L38 12V28L20 38L2 28V12L20 2Z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.5"/>
                  <path d="M20 2L38 12L28 12L20 5Z" fill="#c9a84c"/>
                  <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
                    fontSize="10" fontWeight="900" fill="white" letterSpacing="-0.5">247</text>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>247 Incum</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Invest · Earn · Grow
                </div>
              </div>
            </div>
            <div style={{
              background: "#c9a84c", borderRadius: 20,
              padding: "5px 12px", fontSize: 10, fontWeight: 900,
              color: "#1a1a1a", letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              Join Now
            </div>
          </div>

          {/* Title */}
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>
            Investment Plans
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
            Earn <span style={{ color: "#4ade80" }}>daily returns</span>{"\n"}on every plan
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
            www.247incumb.fun
          </div>
        </div>

        {/* ── Table header ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr 0.9fr 1fr 0.55fr",
          padding: "8px 16px",
          background: "#0a1a10",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          {["Plan", "Price", "Daily", "Total", "Days"].map((h) => (
            <div key={h} style={{
              fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* ── Plan rows ── */}
        {PLANS.map((plan, i) => {
          const total = getTotalEarning(plan)
          const isVip = plan.tier === "VIP"
          const rowBg = isVip
            ? "rgba(201,168,76,0.09)"
            : i % 2 === 0
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.02)"
          return (
            <div
              key={plan.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr 0.9fr 1fr 0.55fr",
                padding: "9px 16px",
                background: rowBg,
                borderLeft: isVip ? "3px solid #c9a84c" : "3px solid transparent",
                borderBottom: i < PLANS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                alignItems: "center",
              }}
            >
              {/* Plan name */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{plan.name}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: isVip ? "#c9a84c" : "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
                  {plan.tier}
                </div>
              </div>
              {/* Price */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", tabularNums: true } as React.CSSProperties}>
                {N(plan.price)}
              </div>
              {/* Daily */}
              <div style={{ fontSize: 13, fontWeight: 900, color: "#4ade80" }}>
                {N(plan.dailyEarning)}
              </div>
              {/* Total */}
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.8)" }}>
                {N(total)}
              </div>
              {/* Days */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)" }}>
                {plan.durationDays}d
              </div>
            </div>
          )
        })}

        {/* ── Bottom info boxes ── */}
        <div style={{ padding: "14px 14px 4px", display: "flex", gap: 10 }}>
          {/* Platform rules */}
          <div style={{
            flex: 1, background: "#0f2518", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)", padding: "12px 12px",
          }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
              Platform Rules
            </div>
            {[
              [`Min. Deposit`, N(SITE.minDeposit)],
              [`Min. Withdraw`, N(SITE.minWithdrawal)],
              [`Withdrawal Fee`, `${SITE.withdrawalCharge}%`],
              [`Earnings Drop`, `Every 24 hours`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: "#fff" }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Referral bonus */}
          <div style={{
            flex: 1, background: "#0f2518", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)", padding: "12px 12px",
          }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
              Referral Bonus
            </div>
            {[
              [`Level 1`, `${SITE.referralLevel1}%`],
              [`Level 2`, `${SITE.referralLevel2}%`],
              [`Join Bonus`, `1,000 pts`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: "#c9a84c" }}>{val}</span>
              </div>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "8px 0" }} />
            {[
              [`Task Cash`, `Up to ₦1,000`],
              [`Task Pts`, `50–200 pts`],
              [`Weekend Salary`, `Pts → ₦ Sat`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{label}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "12px 16px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#4ade80", letterSpacing: "0.05em" }}>
            Earnings drop every 24 hours
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
            Withdrawal: Mornings on your tier day
          </div>
          <div style={{
            marginTop: 10,
            display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
          }}>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              www.247incumb.fun
            </span>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>
        </div>

      </div>{/* end poster */}

      {/* ── Action bar ── */}
      <div className="flex w-full flex-col items-center gap-3 print:hidden" style={{ maxWidth: 390 }}>
        <p className="text-center text-[11px] text-muted-foreground">
          Mobile: screenshot this page. Desktop: Save / Print below.
        </p>
        <div className="flex w-full gap-2">
          <PrintButton />
          <Link
            href="/earnings-image/landscape"
            className="press flex flex-1 items-center justify-center rounded-xl border-2 border-ink bg-card py-2.5 text-[12px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_var(--ink)]"
          >
            Landscape
          </Link>
        </div>
      </div>
    </div>
  )
}
