"use client"

import { ArrowLeft, Lock, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { LockVaultGame } from "./lock-vault"

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

type Tier = { days: number; bonusPercent: number; penaltyPercent: number }

export function LockVaultPage({
  balance,
  hasDeposited,
  vaults,
  tiers,
  vaultMin,
}: {
  balance: number
  hasDeposited: boolean
  vaults: Vault[]
  tiers: Tier[]
  vaultMin: number
}) {
  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Lock className="h-4 w-4 text-primary shrink-0" />
            <h1 className="text-base font-bold tracking-tight">Lock Vault</h1>
          </div>
          <p className="font-mono text-xs text-muted-foreground shrink-0">
            ₦{balance.toLocaleString()}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pt-5">
        {/* Deposit gate */}
        {!hasDeposited ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary">
              <ShieldAlert className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold">Deposit Required</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Make your first deposit to unlock Lock Vault.
              </p>
            </div>
            <Link
              href="/deposit"
              className="flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground"
            >
              Make a Deposit
            </Link>
          </div>
        ) : (
          <LockVaultGame
            balance={balance}
            vaults={vaults}
            tiers={tiers}
            vaultMin={vaultMin}
          />
        )}
      </div>
    </div>
  )
}
