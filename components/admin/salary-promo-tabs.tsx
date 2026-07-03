"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { Loader2, Plus, Wallet, Zap, ToggleLeft, ToggleRight, Percent, Users } from "lucide-react"
import { toast } from "sonner"
import { formatNaira } from "@/lib/plans"
import {
  listPromoterSalaries,
  setPromoterSalary,
  togglePromoterSalary,
  payPromoterSalary,
  payAllSalaries,
} from "@/app/actions/salary"
import { listPromos, createPromo, togglePromo, deletePromo } from "@/app/actions/promos"

type SalaryRow = Awaited<ReturnType<typeof listPromoterSalaries>>[number]
type PromoRow = Awaited<ReturnType<typeof listPromos>>[number]

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}

/* ── Salary Tab ─────────────────────────────────────────────────────────── */

export function SalaryTab() {
  const [rows, setRows] = useState<SalaryRow[] | null>(null)
  const [pending, startTransition] = useTransition()
  const [identifier, setIdentifier] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  const load = useCallback(async () => {
    try {
      setRows(await listPromoterSalaries())
    } catch {
      toast.error("Could not load salaries")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalWeekly = (rows ?? [])
    .filter((r) => r.isActive)
    .reduce((sum, r) => sum + Number(r.weeklyAmount), 0)

  function addSalary() {
    if (!identifier.trim() || !amount) {
      toast.error("Enter a phone/email and weekly amount")
      return
    }
    startTransition(async () => {
      const res = await setPromoterSalary({
        identifier,
        weeklyAmount: Number(amount),
        note: note || undefined,
      })
      if (res.ok) {
        toast.success(res.message)
        setIdentifier("")
        setAmount("")
        setNote("")
        load()
      } else {
        toast.error(res.message)
      }
    })
  }

  function toggle(userId: string, next: boolean) {
    startTransition(async () => {
      await togglePromoterSalary(userId, next)
      load()
    })
  }

  function payOne(userId: string) {
    startTransition(async () => {
      const res = await payPromoterSalary(userId)
      res.ok ? toast.success(res.message) : toast.error(res.message)
      load()
    })
  }

  function payAll() {
    startTransition(async () => {
      const res = await payAllSalaries()
      res.ok ? toast.success(res.message) : toast.error(res.message)
      load()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-ink bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-semibold">Active Promoters</span>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums">
            {(rows ?? []).filter((r) => r.isActive).length}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-ink bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-semibold">Weekly Payroll</span>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-success">{formatNaira(totalWeekly)}</p>
        </div>
      </div>

      {/* Add / update salary */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4">
        <h3 className="mb-3 text-sm font-bold">Set Promoter Salary</h3>
        <div className="flex flex-col gap-2.5">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Promoter phone number or email"
            className="w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2.5">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              placeholder="Weekly ₦"
              className="w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={addSalary}
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save Salary
          </button>
        </div>
      </div>

      {/* Payout all */}
      <button
        onClick={payAll}
        disabled={pending || totalWeekly <= 0}
        className="flex items-center justify-center gap-2 rounded-2xl border border-success/40 bg-success/10 py-3 text-sm font-bold text-success disabled:opacity-50"
      >
        <Zap className="h-4 w-4" />
        Pay All Active Promoters ({formatNaira(totalWeekly)})
      </button>

      {/* List */}
      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No promoter salaries yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border-2 border-ink bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{r.userName || "User"}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.userPhone || r.userEmail}</p>
                  {r.note && <p className="mt-1 text-xs text-muted-foreground/70">{r.note}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-success">
                    {formatNaira(Number(r.weeklyAmount))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">per week</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => toggle(r.userId, !r.isActive)}
                  className="flex items-center gap-1 rounded-lg border-2 border-ink px-2.5 py-1.5 text-xs font-semibold"
                >
                  {r.isActive ? (
                    <ToggleRight className="h-4 w-4 text-success" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                  {r.isActive ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => payOne(r.userId)}
                  disabled={pending || !r.isActive}
                  className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  <Wallet className="h-3.5 w-3.5" /> Pay Now
                </button>
              </div>
              {r.lastPaidAt && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Last paid {new Date(r.lastPaidAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Promotions Tab ─────────────────────────────────────────────────────── */

export function PromotionsTab() {
  const [rows, setRows] = useState<PromoRow[] | null>(null)
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [conditionValue, setConditionValue] = useState("")
  const [bonusType, setBonusType] = useState<"percent" | "fixed">("percent")
  const [bonusValue, setBonusValue] = useState("")
  const [firstPurchaseOnly, setFirstPurchaseOnly] = useState(true)
  const [maxRedemptions, setMaxRedemptions] = useState("")

  const load = useCallback(async () => {
    try {
      setRows(await listPromos())
    } catch {
      toast.error("Could not load promos")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function add() {
    if (!name.trim() || !bonusValue) {
      toast.error("Enter a name and bonus value")
      return
    }
    startTransition(async () => {
      const res = await createPromo({
        name,
        description: description || undefined,
        conditionValue: Number(conditionValue) || 0,
        bonusType,
        bonusValue: Number(bonusValue),
        firstPurchaseOnly,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
      })
      if (res.ok) {
        toast.success(res.message)
        setName("")
        setDescription("")
        setConditionValue("")
        setBonusValue("")
        setMaxRedemptions("")
        load()
      } else {
        toast.error(res.message)
      }
    })
  }

  function toggle(id: number, next: boolean) {
    startTransition(async () => {
      await togglePromo(id, next)
      load()
    })
  }

  function remove(id: number) {
    startTransition(async () => {
      const res = await deletePromo(id)
      res.ok ? toast.success(res.message) : toast.error("Failed")
      load()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Create promo */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4">
        <h3 className="mb-3 text-sm font-bold">Create Promotion</h3>
        <div className="flex flex-col gap-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Promo name (e.g. Weekend Cashback)"
            className="w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description shown to users"
            className="w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">
                Min package price ₦
              </label>
              <input
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                inputMode="numeric"
                placeholder="35000"
                className="w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">
                Max uses (blank = ∞)
              </label>
              <input
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                inputMode="numeric"
                placeholder="Unlimited"
                className="w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Bonus type</label>
              <div className="flex gap-1 rounded-xl border-2 border-ink bg-surface p-1">
                {(["percent", "fixed"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBonusType(t)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${
                      bonusType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {t === "percent" ? "% Percent" : "₦ Fixed"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">
                Bonus value {bonusType === "percent" ? "(%)" : "(₦)"}
              </label>
              <input
                value={bonusValue}
                onChange={(e) => setBonusValue(e.target.value)}
                inputMode="numeric"
                placeholder={bonusType === "percent" ? "60" : "21000"}
                className="w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={firstPurchaseOnly}
              onChange={(e) => setFirstPurchaseOnly(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            First package purchase only
          </label>
          <button
            onClick={add}
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Promo
          </button>
        </div>
      </div>

      {/* List */}
      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No promotions yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((p) => (
            <div key={p.id} className="rounded-2xl border-2 border-ink bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    <p className="truncate text-sm font-bold">{p.name}</p>
                  </div>
                  {p.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    p.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.isActive ? "LIVE" : "OFF"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-surface py-2">
                  <p className="font-bold text-primary">
                    {p.bonusType === "percent" ? `${Number(p.bonusValue)}%` : formatNaira(Number(p.bonusValue))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">bonus</p>
                </div>
                <div className="rounded-lg bg-surface py-2">
                  <p className="font-bold tabular-nums">{formatNaira(Number(p.conditionValue))}</p>
                  <p className="text-[10px] text-muted-foreground">min buy</p>
                </div>
                <div className="rounded-lg bg-surface py-2">
                  <p className="font-bold tabular-nums">
                    {p.redemptions}
                    {p.maxRedemptions != null ? `/${p.maxRedemptions}` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">claimed</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => toggle(p.id, !p.isActive)}
                  className="flex items-center gap-1 rounded-lg border-2 border-ink px-2.5 py-1.5 text-xs font-semibold"
                >
                  {p.isActive ? (
                    <ToggleRight className="h-4 w-4 text-success" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                  {p.isActive ? "Turn Off" : "Turn On"}
                </button>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {p.firstPurchaseOnly ? "First purchase only" : "Repeatable"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
