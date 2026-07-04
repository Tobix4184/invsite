import { NextResponse } from "next/server"
import { getGameConfig, saveGameConfig } from "@/app/actions/settings"

export const dynamic = "force-dynamic"

export async function GET() {
  const cfg = await getGameConfig()
  return NextResponse.json(cfg)
}

export async function POST(req: Request) {
  const body = await req.json()
  await saveGameConfig(body)
  return NextResponse.json({ ok: true })
}
