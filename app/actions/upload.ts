"use server"

import { put } from "@vercel/blob"
import { getUserId } from "@/lib/session"

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]

/**
 * Uploads a proof image to Vercel Blob (private) and returns its URL.
 * Called from the client via a FormData submission.
 */
export async function uploadProofImage(formData: FormData): Promise<{ ok: boolean; url?: string; message?: string }> {
  const userId = await getUserId()
  if (!userId) return { ok: false, message: "You must be signed in to upload." }

  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, message: "No file provided." }
  if (file.size === 0) return { ok: false, message: "The file is empty." }
  if (file.size > MAX_BYTES) return { ok: false, message: "Image is too large (max 8 MB)." }
  if (!ALLOWED.includes(file.type)) return { ok: false, message: "Please upload a JPG, PNG, WEBP or GIF image." }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const key = `task-proofs/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  try {
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
    })
    return { ok: true, url: blob.url }
  } catch (e) {
    console.log("[v0] Blob upload error:", e instanceof Error ? e.message : String(e))
    return { ok: false, message: "Upload failed. Please try again." }
  }
}
