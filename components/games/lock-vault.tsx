"use client"

import { useState, useTransition } from "react"
import { Lock, Unlock, AlertTriangle, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { createVault, claimVault, getUserVaults } from "@/app/actions/games"

type Vault = {
  id: number
  amount: string | number
  lockDays: number
  bonusPercent: string | number
  bonusAmount: string | number
  status: string
  unlocksAt: Date | string
  createdAt: Date | string
}

type Tier = {
  days: number
  bonusPercent: number
  penaltyPercent: number
}

export function LockVaultGame({
  balance,
  vaults,
  tiers,
  vaultMin,
}: {
  balance: number
  vaults: Vault[]
  tiers: Tier[]
  vaultMin: number
}) {
  const [localBalance, setLocalBalance] = useState(balance)
  const [activeVaults, setActiveVaults] = useState(vaults)
  const [selectedTier, setSelectedTier] = useState(0)
  const [amount, setAmount] = useState("")
  const [pending, startTransition] = useTransition()

  const tier = tiers[selectedTier]
  const parsedAmount = Number(amount) || 0
  const bonus = tier ? Math.round(parsedAmount * (tier.bonusPercent / 100)) : 0
  const payout = parsedAmount + bonus

  const handleCreate = () => {
    if (!tier || parsedAmount < vaultMin) {
      toast.error(`Minimum lock amount is ₦${vaultMin.toLocaleString()}`)
      return
    }
    if (parsedAmount > localBalance) {
      toast.error("Insufficient balance")
      return
    }
    startTransition(async () => {
      const res = await createVault(parsedAmount, selectedTier)
      if (!res.ok) { toast.error(res.message); return }
      toast.success(res.message)
      setLocalBalance((b) => b - parsedAmount)
      setAmount("")
      // Reload real vaults from server so we have the true DB id (no fake optimistic id)
      const fresh = await getUserVaults()
      setActiveVaults(fresh as Vault[])
    })
  }

  const handleClaim = (vaultId: number) => {
    startTransition(async () => {
      const res = await claimVault(vaultId)
      if (!res.ok) { toast.error(res.message); return }

      if (res.matured) {
        toast.success(res.message)
      } else {
        toast.warning(res.message)
      }

      setLocalBalance((b) => b + (res.payout ?? 0))
      setActiveVaults((v) =>
        v.map((vault) =>
          vault.id === vaultId
            ? { ...vault, status: res.matured ? "completed" : "broken" }
            : vault
        )
      )
    })
  }

  const lockedVaults = activeVaults.filter((v) => v.status === "locked")
  const pastVaults = activeVaults.filter((v) => v.status !== "locked")

  return (
    <div className="flex flex-col gap-4">
      {/* Create vault */}
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <p className="font-bold">Create New Vault</p>
        </div>

        {/* Tier selector */}
        <div className="mb-4 flex gap-2">
          {tiers.map((t, i) => (
            <button
              key={t.days}
              onClick={() => setSelectedTier(i)}
              className={`flex-1 rounded-xl border p-3 text-center transition-all ${
                selectedTier === i
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/50"
              }`}
            >
              <p className="text-xs font-bold text-muted-foreground">{t.days} Days</p>
              <p
                className={`text-lg font-black ${
                  selectedTier === i ? "text-primary" : "text-foreground"
                }`}
              >
                +{t.bonusPercent}%
              </p>
              <p className="text-[10px] text-muted-foreground">{t.penaltyPercent}% early penalty</p>
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
            Amount to Lock (min ₦{vaultMin.toLocaleString()})
          </label>
          <input
            type="number"
            placeholder="Enter amount..."
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Calculation preview */}
        {parsedAmount >= vaultMin && tier && (
          <div className="mb-4 rounded-xl border border-border bg-secondary/50 p-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Principal</span>
              <span className="font-mono font-bold text-foreground">₦{parsedAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Bonus (+{tier.bonusPercent}%)</span>
              <span className="font-mono font-bold text-success">+₦{bonus.toLocaleString()}</span>
            </div>
            <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 text-sm">
              <span className="font-bold">Total at maturity</span>
              <span className="font-mono font-black text-primary">₦{payout.toLocaleString()}</span>
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Unlocks</span>
              <span className="font-mono text-foreground">
                {new Date(Date.now() + (tier?.days ?? 0) * 86400000).toLocaleDateString("en-NG", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={pending || parsedAmount < vaultMin || parsedAmount > localBalance}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Lock ₦{parsedAmount > 0 ? parsedAmount.toLocaleString() : "..."} for {tier?.days ?? "?"} Days
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Balance: ₦{localBalance.toLocaleString()}
        </p>
      </div>

      {/* Active vaults */}
      {lockedVaults.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-foreground">Active Vaults</p>
          {lockedVaults.map((v) => {
            const unlockDate = new Date(v.unlocksAt)
            const now = new Date()
            const matured = now >= unlockDate
            const daysLeft = Math.max(0, Math.ceil((unlockDate.getTime() - now.getTime()) / 86400000))
            const principal = Number(v.amount)
            const bonus = Number(v.bonusAmount)

            return (
              <div
                key={v.id}
                className={`rounded-2xl border p-4 ${
                  matured
                    ? "border-success/40 bg-success/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold">
                      ₦{principal.toLocaleString()} locked
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.lockDays} days • +{Number(v.bonusPercent)}% bonus
                    </p>
                  </div>
                  <div className="text-right">
                    {matured ? (
                      <span className="flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-bold text-success">
                        <CheckCircle className="h-3 w-3" /> Matured
                      </span>
                    ) : (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                        {daysLeft}d left
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-3 flex justify-between text-xs text-muted-foreground">
                  <span>Payout at maturity</span>
                  <span className="font-mono font-bold text-foreground">
                    ₦{(principal + bonus).toLocaleString()}
                  </span>
                </div>

                {!matured && (
                  <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <p className="text-[11px] text-amber-400">
                      Breaking early deducts {tiers.find((t) => t.days === v.lockDays)?.penaltyPercent ?? 10}% penalty
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleClaim(v.id)}
                  disabled={pending}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold disabled:opacity-60 ${
                    matured
                      ? "bg-success text-success-foreground"
                      : "border border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : matured ? (
                    <Unlock className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {matured ? "Claim Payout" : "Break Lock Early"}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Past vaults */}
      {pastVaults.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-muted-foreground">Past Vaults</p>
          {pastVaults.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div>
                <p className="text-xs font-bold">₦{Number(v.amount).toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{v.lockDays} days</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  v.status === "completed"
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                }`}
              >
                {v.status === "completed" ? "Completed" : "Broken"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">How it works</p>
        <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <li>• Lock your funds for 7, 14, or 30 days</li>
          <li>• Cannot withdraw during the lock period</li>
          <li>• At maturity: receive your capital + bonus</li>
          <li>• Break early: 10% penalty on principal, bonus forfeited</li>
        </ul>
      </div>
    </div>
  )
}
