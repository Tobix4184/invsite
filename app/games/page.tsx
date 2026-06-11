"use server"

import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { wallet, lockVault } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { getGameConfig } from "@/app/actions/settings"
import { LockVaultPage } from "@/components/games/lock-vault-page"
import { BottomNav } from "@/components/bottom-nav"

export default async function GamesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")
  const userId = session.user.id

  const [w, vaults, cfg] = await Promise.all([
    db.select().from(wallet).where(eq(wallet.userId, userId)).then((r) => r[0]),
    db.select().from(lockVault).where(eq(lockVault.userId, userId)).orderBy(desc(lockVault.createdAt)),
    getGameConfig(),
  ])

  const balance = Number(w?.balance ?? 0)
  const hasDeposited = Number(w?.totalDeposited ?? 0) > 0

  return (
    <>
      <LockVaultPage
        balance={balance}
        hasDeposited={hasDeposited}
        vaults={vaults}
        tiers={cfg.vaultTiers}
        vaultMin={cfg.vaultMin}
      />
      <BottomNav />
    </>
  )
}
