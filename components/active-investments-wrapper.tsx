'use client'

import dynamic from "next/dynamic"

const ActiveInvestments = dynamic(
  () => import("@/components/active-investments").then((m) => m.ActiveInvestments),
  { ssr: false }
)

export function ActiveInvestmentsWrapper({ investments }: { investments: any[] }) {
  return <ActiveInvestments investments={investments} />
}
