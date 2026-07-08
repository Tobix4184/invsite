"use client"

import { useState, useTransition, useEffect } from "react"
import {
  Star,
  RefreshCw,
  Loader2,
  Users,
  TrendingUp,
  Banknote,
  Settings2,
  CalendarCheck,
  History,
} from "lucide-react"
import { toast } from "sonner"
import { formatNaira } from "@/lib/plans"
import {
  getPointsOverview,
  savePointsConfig,
  processWeekendPayout,
  type PointsOverview,
  type PointsConfig,
} from "@/app/actions/points"

const fieldCls =
  "w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

export function PointsTab() {
  const [overview, setOverview] = useState<PointsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [configPending, startConfigTransition] = useTransition()
  const [payoutPending, startPayoutTransition] = useTransition()

  // Config form state
  const [pointsPerNaira, setPointsPerNaira] = useState("0.5")
  const [referralJoinPoints, setReferralJoinPoints] = useState("1000")
  const [gameWinPointsRate, setGameWinPointsRate] = useState("1")
  const [investmentDefaultPoints, setInvestmentDefaultPoints] = useState("500")

  async function load() {
    setLoading(true)
    const data = await getPointsOverview()
    setOverview(data)
    setPointsPerNaira(String(data.pointsPerNaira))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function handleSaveConfig() {
    startConfigTransition(async () => {
      const cfg: PointsConfig = {
        pointsPerNaira: parseFloat(pointsPerNaira) || 0.5,
        referralJoinPoints: parseInt(referralJoinPoints, 10) || 1000,
        gameWinPointsRate: parseFloat(gameWinPointsRate) || 1,
        investmentDefaultPoints: parseInt(investmentDefaultPoints, 10) || 500,
        investmentPointsMap: overview ? {} : {},
      }
      await savePointsConfig(cfg)
      toast.success("Points config saved")
      load()
    })
  }

  function handlePayout() {
    startPayoutTransition(async () => {
      const res = await processWeekendPayout()
      if (res.ok) {
        toast.success(
          res.userCount === 0
            ? "No points to pay out."
            : `Paid out ${res.userCount} users — ${res.totalPoints.toLocaleString()} pts → ${formatNaira(res.totalNaira)}`
        )
        load()
      } else {
        toast.error("Payout failed")
      }
    })
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const ov = overview!
  const pointsRate = parseFloat(pointsPerNaira) || 0.5

  return (
    <div className="flex flex-col gap-6">

      {/* ── Overview cards ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <OverviewCard
          icon={Users}
          label="Users with Points"
          value={ov.totalUsers.toLocaleString()}
          color="bg-primary"
          iconColor="text-primary-foreground"
        />
        <OverviewCard
          icon={Star}
          label="Total Points"
          value={ov.totalPoints.toLocaleString()}
          color="bg-gold"
          iconColor="text-gold-foreground"
        />
        <OverviewCard
          icon={Banknote}
          label="Est. Payout"
          value={formatNaira(ov.estimatedPayout)}
          color="bg-success"
          iconColor="text-success-foreground"
        />
      </div>

      {/* ── How points is earned info ────────────────────── */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-sm font-black uppercase tracking-wider">Points Earning Summary</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label="Invest any package" value={`${investmentDefaultPoints} pts`} />
          <InfoRow label="Refer + new member joins" value={`${referralJoinPoints} pts each`} />
          <InfoRow label="Game win (per ₦10 won)" value={`${gameWinPointsRate} pt`} />
          <InfoRow label="Task reward" value="Varies per task" />
          <InfoRow label="Conversion rate" value={`10 pts = ₦${(10 * pointsRate).toFixed(2)}`} />
          <InfoRow label="Payout schedule" value="Every Saturday" />
        </div>
      </div>

      {/* ── Payout trigger ───────────────────────────────── */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-black uppercase tracking-wider">Weekend Salary Payout</p>
          </div>
          <span className="rounded-full border-2 border-ink bg-primary px-2.5 py-0.5 text-[10px] font-black text-primary-foreground uppercase">
            Saturdays
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Converts all users&apos; weekend salary points to naira and credits their wallet. Resets points to zero after paying.
          Currently <span className="font-black text-foreground">{ov.totalPoints.toLocaleString()} pts</span> across{" "}
          <span className="font-black text-foreground">{ov.totalUsers}</span> users
          {" "}≈ <span className="font-black text-success">{formatNaira(ov.estimatedPayout)}</span>.
        </p>
        <button
          onClick={handlePayout}
          disabled={payoutPending || ov.totalUsers === 0}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-success py-3 text-sm font-black uppercase text-success-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-50"
        >
          {payoutPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Banknote className="h-4 w-4" />
          )}
          Run Weekend Payout
        </button>
      </div>

      {/* ── Config editor ─────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-4 w-4 text-primary" />
          <p className="text-sm font-black uppercase tracking-wider">Points Configuration</p>
        </div>
        <div className="grid gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Points per naira (1 pt = ₦ ?)
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pointsPerNaira}
              onChange={(e) => setPointsPerNaira(e.target.value)}
              className={fieldCls}
              placeholder="0.5"
            />
            <span className="text-[10px] text-muted-foreground">
              Current: 10 pts = ₦{(10 * (parseFloat(pointsPerNaira) || 0)).toFixed(2)}
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Referral join points (both sides)
            </span>
            <input
              type="number"
              min="0"
              value={referralJoinPoints}
              onChange={(e) => setReferralJoinPoints(e.target.value)}
              className={fieldCls}
              placeholder="1000"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Game win points rate (pts per ₦10 won)
            </span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={gameWinPointsRate}
              onChange={(e) => setGameWinPointsRate(e.target.value)}
              className={fieldCls}
              placeholder="1"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Default investment points (per plan purchase)
            </span>
            <input
              type="number"
              min="0"
              value={investmentDefaultPoints}
              onChange={(e) => setInvestmentDefaultPoints(e.target.value)}
              className={fieldCls}
              placeholder="500"
            />
          </label>

          <button
            onClick={handleSaveConfig}
            disabled={configPending}
            className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3 text-sm font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-50"
          >
            {configPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
            Save Config
          </button>
        </div>
      </div>

      {/* ── Payout history ────────────────────────────────── */}
      {ov.payoutHistory.length > 0 && (
        <div className="rounded-2xl border-2 border-ink bg-card shadow-[3px_3px_0_0_var(--ink)] overflow-hidden">
          <div className="flex items-center gap-2 border-b-2 border-ink px-4 py-3">
            <History className="h-4 w-4 text-primary" />
            <p className="text-sm font-black uppercase tracking-wider">Payout History</p>
          </div>
          <div className="divide-y-2 divide-ink/10">
            {ov.payoutHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs font-black text-foreground">
                    {h.userCount} users · {h.totalPoints.toLocaleString()} pts
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(h.runAt).toLocaleString("en-NG", {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="rounded-full border-2 border-ink bg-success/20 px-2.5 py-0.5 text-xs font-black text-success">
                  {formatNaira(h.totalNaira)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh */}
      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground self-center"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </button>
    </div>
  )
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  color,
  iconColor,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
  iconColor: string
}) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-3 shadow-[3px_3px_0_0_var(--ink)]">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink ${color}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </span>
      <p className="mt-2 text-lg font-black tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground leading-tight">{label}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-ink/10 bg-surface px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-black text-foreground">{value}</span>
    </div>
  )
}
