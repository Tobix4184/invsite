import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/session"
import { getDepositByReference } from "@/app/actions/deposit"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import DepositDetailClient from "./deposit-detail-client"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ reference: string }>
}

export default async function DepositDetailPage({ params }: Props) {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const { reference } = await params
  const deposit = await getDepositByReference(reference)

  if (!deposit) {
    notFound()
  }

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Deposit" />
      <DepositDetailClient deposit={deposit} />
      <BottomNav />
    </div>
  )
}
