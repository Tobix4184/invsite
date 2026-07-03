import { NextResponse } from "next/server"
import { getPlatformInfo } from "@/app/actions/settings"

export const dynamic = "force-dynamic"

export async function GET() {
  const info = await getPlatformInfo()
  return NextResponse.json(info)
}
