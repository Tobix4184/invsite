"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Gift,
  Users,
  Wallet,
  Headphones,
  ChevronRight,
  LogOut,
  ListOrdered,
  ShieldCheck,
  Loader2,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { SITE, formatNaira } from "@/lib/plans"
import { authClient } from "@/lib/auth-client"

type Props = {
  name: string
  email: string
  phone: string
  role: string
  balance: number
  totalDeposited: number
  totalEarned: number
  referralEarnings: number
}

export function ProfileView(props: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const menu = [
    { label: "Transactions", icon: ListOrdered, href: "/transactions", tint: "text-foreground" },
    { label: "Deposit History", icon: Clock, href: "/deposits", tint: "text-primary" },
    { label: "Topup", icon: ArrowDownToLine, href: "/topup", tint: "text-success" },
    { label: "Withdraw", icon: ArrowUpFromLine, href: "/withdraw", tint: "text-amber-400" },
    { label: "Gift Code", icon: Gift, href: "/gift-code", tint: "text-pink-400" },
    { label: "My Team", icon: Users, href: "/team", tint: "text-primary" },
    { label: "Customer Support", icon: Headphones, href: SITE.telegramGroup, tint: "text-sky-400" },
    ...(props.role === "admin"
      ? [{ label: "Admin Dashboard", icon: ShieldCheck, href: "/admin", tint: "text-destructive" }]
      : []),
  ]

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut()
      toast.success("Signed out")
      router.push("/")
      router.refresh()
    })
  }

  const initials = props.name
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/30 via-card to-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground">
            {initials || "IH"}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{props.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{props.email}</p>
            {props.phone && <p className="truncate text-xs text-muted-foreground">{props.phone}</p>}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/40 p-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-success" />
            <span className="text-sm text-muted-foreground">Available Balance</span>
          </div>
          <span className="text-lg font-bold tabular-nums">{formatNaira(props.balance)}</span>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Deposited" value={formatNaira(props.totalDeposited)} />
        <Stat label="Earned" value={formatNaira(props.totalEarned)} />
        <Stat label="Referral" value={formatNaira(props.referralEarnings)} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {menu.map((item, i) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.href.startsWith("http")) window.open(item.href, "_blank")
              else router.push(item.href)
            }}
            className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary ${
              i !== menu.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
              <item.icon className={`h-4 w-4 ${item.tint}`} />
            </span>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </section>

      <button
        onClick={handleSignOut}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign Out
      </button>

      <p className="text-center text-xs text-muted-foreground">
        {SITE.name} • {SITE.tagline}
      </p>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <p className="text-sm font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
