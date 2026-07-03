"use server"

import { db } from "@/lib/db"
import { promo } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { and, desc, eq, gt, lt, or, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/** Public: the currently active promos, for showing banners on the app. */
export async function getActivePromos() {
  const now = new Date()
  return db
    .select()
    .from(promo)
    .where(
      and(
        eq(promo.isActive, true),
        or(isNull(promo.startsAt), lt(promo.startsAt, now)),
        or(isNull(promo.endsAt), gt(promo.endsAt, now)),
      ),
    )
    .orderBy(desc(promo.createdAt))
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function listPromos() {
  await requireAdmin()
  return db.select().from(promo).orderBy(desc(promo.createdAt))
}

export async function createPromo(input: {
  name: string
  description?: string
  conditionValue: number
  bonusType: "percent" | "fixed"
  bonusValue: number
  firstPurchaseOnly: boolean
  maxRedemptions?: number | null
}) {
  await requireAdmin()
  if (!input.name.trim()) return { ok: false, message: "Enter a promo name" }
  await db.insert(promo).values({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    conditionType: "min_package_price",
    conditionValue: String(Math.max(0, Math.round(input.conditionValue) || 0)),
    bonusType: input.bonusType,
    bonusValue: String(Math.max(0, Math.round(input.bonusValue) || 0)),
    firstPurchaseOnly: input.firstPurchaseOnly,
    maxRedemptions: input.maxRedemptions ?? null,
    isActive: true,
  })
  revalidatePath("/admin")
  return { ok: true, message: "Promo created" }
}

export async function updatePromo(
  id: number,
  input: Partial<{
    name: string
    description: string | null
    conditionValue: number
    bonusType: "percent" | "fixed"
    bonusValue: number
    firstPurchaseOnly: boolean
    maxRedemptions: number | null
    isActive: boolean
  }>,
) {
  await requireAdmin()
  const patch: Record<string, unknown> = {}
  if (input.name != null) patch.name = input.name.trim()
  if (input.description !== undefined) patch.description = input.description
  if (input.conditionValue != null) patch.conditionValue = String(Math.round(input.conditionValue))
  if (input.bonusType != null) patch.bonusType = input.bonusType
  if (input.bonusValue != null) patch.bonusValue = String(Math.round(input.bonusValue))
  if (input.firstPurchaseOnly != null) patch.firstPurchaseOnly = input.firstPurchaseOnly
  if (input.maxRedemptions !== undefined) patch.maxRedemptions = input.maxRedemptions
  if (input.isActive != null) patch.isActive = input.isActive
  await db.update(promo).set(patch).where(eq(promo.id, id))
  revalidatePath("/admin")
  return { ok: true, message: "Promo updated" }
}

export async function togglePromo(id: number, isActive: boolean) {
  await requireAdmin()
  await db.update(promo).set({ isActive }).where(eq(promo.id, id))
  revalidatePath("/admin")
  return { ok: true }
}

export async function deletePromo(id: number) {
  await requireAdmin()
  await db.update(promo).set({ isActive: false }).where(eq(promo.id, id))
  revalidatePath("/admin")
  return { ok: true, message: "Promo deactivated" }
}
