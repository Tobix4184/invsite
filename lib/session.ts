import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function getUserId() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export async function requireAdmin() {
  const userId = await getUserId()
  const [p] = await db.select().from(profile).where(eq(profile.userId, userId))
  if (!p || p.role !== "admin") throw new Error("Forbidden")
  return userId
}

/** Allows both "admin" and "moderator" roles. Returns { userId, isModerator }. */
export async function requireAdminOrModerator() {
  const userId = await getUserId()
  const [p] = await db.select().from(profile).where(eq(profile.userId, userId))
  if (!p || (p.role !== "admin" && p.role !== "moderator")) throw new Error("Forbidden")
  return { userId, isModerator: p.role === "moderator" }
}
