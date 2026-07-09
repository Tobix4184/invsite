import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getUserId } from "@/lib/session"

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]

export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ ok: false, message: "Could not parse upload." }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "No file provided." }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ ok: false, message: "The file is empty." }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: "Image is too large (max 8 MB)." }, { status: 413 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ ok: false, message: "Please upload a JPG, PNG, WEBP or GIF." }, { status: 415 })

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const key = `task-proofs/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  try {
    const blob = await put(key, file, { access: "private", addRandomSuffix: false })
    // Private blobs return a signed downloadUrl valid for long-term viewing
    const url = (blob as { downloadUrl?: string }).downloadUrl ?? blob.url
    return NextResponse.json({ ok: true, url })
  } catch {
    return NextResponse.json({ ok: false, message: "Upload failed. Please try again." }, { status: 500 })
  }
}
