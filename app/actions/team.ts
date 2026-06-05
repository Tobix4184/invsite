"use server"

import { db } from "@/lib/db"
import { referral, profile, user as userTable } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { eq, sql } from "drizzle-orm"

export async function getTeamData() {
  const userId = await getUserId()
  const [p] = await db.select().from(profile).where(eq(profile.userId, userId))
  const inviteCode = p?.inviteCode ?? ""

  const members = await db
    .select({
      level: referral.level,
      commission: referral.totalCommission,
      name: userTable.name,
      email: userTable.email,
      joined: referral.createdAt,
    })
    .from(referral)
    .leftJoin(userTable, eq(referral.referredId, userTable.id))
    .where(eq(referral.referrerId, userId))

  const level1 = members.filter((m) => m.level === 1)
  const level2 = members.filter((m) => m.level === 2)
  const totalCommission = members.reduce((s, m) => s + Number(m.commission), 0)

  return {
    inviteCode,
    isPromoter: p?.isPromoter ?? false,
    level1: level1.map((m) => ({
      name: m.name ?? "User",
      email: maskEmail(m.email ?? ""),
      commission: Number(m.commission),
      joined: m.joined,
    })),
    level2: level2.map((m) => ({
      name: m.name ?? "User",
      email: maskEmail(m.email ?? ""),
      commission: Number(m.commission),
      joined: m.joined,
    })),
    totalCommission,
    totalMembers: members.length,
  }
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@")
  if (!domain) return email
  const visible = name.slice(0, 2)
  return `${visible}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`
}
