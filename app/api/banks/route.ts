import { NextResponse } from "next/server"

export const revalidate = 86400 // cache for 24 hours

export async function GET() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) {
    return NextResponse.json({ ok: false, banks: [] }, { status: 200 })
  }

  try {
    const res = await fetch(
      "https://api.paystack.co/bank?country=nigeria&perPage=200&use_cursor=false",
      {
        headers: { Authorization: `Bearer ${key}` },
        next: { revalidate: 86400 },
      }
    )
    const data = await res.json()
    if (!res.ok || !data?.status) {
      return NextResponse.json({ ok: false, banks: [] }, { status: 200 })
    }

    // Return only what the form needs: name + code, sorted alphabetically
    const banks: { name: string; code: string }[] = (data.data as { name: string; code: string }[])
      .filter((b) => b.code && b.name)
      .map((b) => ({ name: b.name, code: b.code }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ ok: true, banks })
  } catch {
    return NextResponse.json({ ok: false, banks: [] }, { status: 200 })
  }
}
