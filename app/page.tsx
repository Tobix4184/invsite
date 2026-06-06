import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AuthScreen } from "@/components/auth-screen"

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; promo?: string }>
}) {
  const session = await getSession()
  if (session?.user) redirect("/dashboard")
  const { ref, promo } = await searchParams
  return <AuthScreen defaultInvite={ref ?? ""} promoCode={promo ?? ""} />
}
