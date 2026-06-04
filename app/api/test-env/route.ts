export const dynamic = "force-dynamic"

export async function GET() {
  const hasUrl = !!process.env.DATABASE_URL
  const urlPreview = hasUrl
    ? process.env.DATABASE_URL!.substring(0, 30) + "..."
    : "NOT SET"
  return Response.json({
    hasUrl,
    urlPreview,
    nodeEnv: process.env.NODE_ENV,
    hasBetterAuthSecret: !!process.env.BETTER_AUTH_SECRET,
  })
}
