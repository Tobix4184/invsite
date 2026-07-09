import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { db } from "@/lib/db"
import { transaction } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 })

  const rows = await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, session.user.id))
    .orderBy(desc(transaction.createdAt))
    .limit(3)

  return NextResponse.json({ ok: true, transactions: rows })
}
