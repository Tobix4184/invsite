"use client"

import { useState } from "react"
import {
  Wallet,
  TrendingUp,
  Users,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Star,
  Award,
  Clock,
} from "lucide-react"
import { formatNaira } from "@/lib/plans"

type SalaryPayment = {
  id: number
  amount: number
  note: string | null
  paidAt: Date
}

type ReferralBreakdown = {
  name: string
  email: string
  commission: number
  level: number
  joinedAt: Date
  activePackagePrice: number | null
}

type Salary = {
  weeklyAmount: number
  isActive: boolean
  manualOverride: boolean | null
  lastPaidAt: Date | null
  totalPaid: number
  totalCommissionEarned: number
  points: number | null
  referralsCounted: number | null
  windowDays: number
  enabled: boolean
  payments: SalaryPayment[]
  breakdown: ReferralBreakdown[]
}

export function PromoterDashboard({ salary }: { salary: Salary }) {
  const [showHistory, setShowHistory] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(true)

  const topEarners = [...salary.breakdown]
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 10)

  return (
    <div className="flex flex-col gap-5">
      {/* ── Partner badge ── */}
      <div className="flex items-center gap-2">
        <span className="rounded-full border-2 border-ink bg-gold px-3 py-1 text-[11px] font-black uppercase tracking-widest text-gold-foreground">
          Partner
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {salary.manualOverride ? "Fixed salary" : "Algorithm-based salary"}
        </span>
      </div>

      {/* ── Salary balance card ── */}
      <div className="overflow-hidden rounded-3xl border-2 border-ink bg-primary shadow-[4px_4px_0_0_var(--ink)]">
        <div className="px-5 pt-5 pb-4 text-primary-foreground">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-primary-foreground/70">
            Total Salary Earned
          </p>
          <p className="mt-1 text-4xl font-black tabular-nums tracking-tight">
            {formatNaira(salary.totalPaid)}
          </p>
          {salary.lastPaidAt && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/70">
              <Clock className="h-3.5 w-3.5" />
              Last paid {new Date(salary.lastPaidAt).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x-2 divide-ink border-t-2 border-ink bg-primary/80">
          <StatCell
            label="This Period"
            value={formatNaira(salary.weeklyAmount)}
          />
          <StatCell
            label="Ref Commission"
            value={formatNaira(salary.totalCommissionEarned)}
          />
          <StatCell
            label="Active Refs"
            value={String(salary.referralsCounted ?? salary.breakdown.length)}
          />
        </div>
      </div>

      {/* ── Points info (if algorithm-based) ── */}
      {!salary.manualOverride && salary.points !== null && (
        <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[2px_2px_0_0_var(--ink)]">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-gold/20">
              <Star className="h-4 w-4 text-gold" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Activity Points This Period</p>
              <p className="text-lg font-black tabular-nums">
                {salary.points.toLocaleString()} pts
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Based on referrals who bought active packages within the last {salary.windowDays} days.
            Points determine your weekly salary amount.
          </p>
        </div>
      )}

      {/* ── Earnings breakdown (who earns for you) ── */}
      <div className="overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-[2px_2px_0_0_var(--ink)]">
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-success/15">
              <Users className="h-4 w-4 text-success" />
            </span>
            <div className="text-left">
              <p className="text-sm font-black">Your Network Earnings</p>
              <p className="text-xs text-muted-foreground">
                {salary.breakdown.length} member{salary.breakdown.length !== 1 ? "s" : ""} generated commission for you
              </p>
            </div>
          </div>
          {showBreakdown ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showBreakdown && (
          <div className="border-t-2 border-ink">
            {topEarners.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No commission earned yet. Share your invite link to start earning.
              </p>
            ) : (
              <div className="flex flex-col divide-y-2 divide-ink">
                {topEarners.map((ref, i) => (
                  <ReferralRow key={ref.email + i} ref_={ref} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Salary payment history ── */}
      <div className="overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-[2px_2px_0_0_var(--ink)]">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-primary/15">
              <Award className="h-4 w-4 text-primary" />
            </span>
            <div className="text-left">
              <p className="text-sm font-black">Salary History</p>
              <p className="text-xs text-muted-foreground">
                {salary.payments.length} payment{salary.payments.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {showHistory ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showHistory && (
          <div className="border-t-2 border-ink">
            {salary.payments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No salary payments yet. Keep building your network!
              </p>
            ) : (
              <div className="flex flex-col divide-y-2 divide-ink">
                {salary.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-bold">{p.note ?? "Salary payment"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.paidAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="font-black text-success tabular-nums">
                      +{formatNaira(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-2 py-3 text-primary-foreground">
      <p className="text-[10px] font-bold uppercase tracking-wide text-primary-foreground/70">{label}</p>
      <p className="mt-0.5 text-sm font-black tabular-nums">{value}</p>
    </div>
  )
}

function ReferralRow({ ref_, rank }: { ref_: ReferralBreakdown; rank: number }) {
  const isTopThree = rank <= 3
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[11px] font-black ${
          rank === 1
            ? "bg-gold text-gold-foreground"
            : rank === 2
            ? "bg-muted text-foreground"
            : rank === 3
            ? "bg-card text-muted-foreground"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{ref_.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{ref_.email}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-success tabular-nums">
          +{formatNaira(ref_.commission)}
        </p>
        {ref_.activePackagePrice && (
          <p className="text-[10px] text-muted-foreground">
            {formatNaira(ref_.activePackagePrice)} plan
          </p>
        )}
      </div>
    </div>
  )
}
