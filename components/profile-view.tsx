"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Ticket,
  UsersRound,
  Wallet2,
  MessageCircleHeart,
  ChevronRight,
  LogOut,
  ListFilter,
  ShieldCheck,
  Loader2,
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
    { label: "Transactions", icon: ListFilter, href: "/transactions", color: "text-foreground", bg: "bg-secondary" },
    { label: "Deposit",      icon: ArrowDownToLine, href: "/topup",   color: "text-success",   bg: "bg-success/12" },
    { label: "Withdraw",     icon: ArrowUpFromLine, href: "/withdraw",color: "text-primary",    bg: "bg-primary/12" },
    { label: "Gift Code",    icon: Ticket,          href: "/gift-code",color: "text-amber-400", bg: "bg-amber-400/12" },
    { label: "My Network",   icon: UsersRound,      href: "/team",    color: "text-sky-400",    bg: "bg-sky-400/12" },
    { label: "Support",      icon: MessageCircleHeart, href: SITE.telegramGroup, color: "text-pink-400", bg: "bg-pink-400/12" },
    ...(props.role === "admin"
      ? [{ label: "Admin Panel", icon: ShieldCheck, href: "/admin", color: "text-destructive", bg: "bg-destructive/12" }]
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
    .toUpperCase() || "PC"

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">

      {/* Identity card */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5">
        {/* Warm orb accent */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, oklch(0.75 0.16 75) 0%, transparent 70%)' }}
        />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black">{props.name}</h2>
            <p className="truncate text-xs text-muted-foreground">{props.email}</p>
            {props.phone && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{props.phone}</p>
            )}
          </div>
        </div>

        {/* Balance row */}
        <div className="relative mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Wallet2 className="h-4 w-4 text-success" strokeWidth={1.8} />
            <span className="text-xs font-semibold text-muted-foreground">Available Balance</span>
          </div>
          <span className="text-base font-black tabular-nums">{formatNaira(props.balance)}</span>
        </div>
      </section>

      {/* Stats row */}
      <section className="grid grid-cols-3 gap-2.5">
        <StatTile label="Deposited" value={formatNaira(props.totalDeposited)} />
        <StatTile label="Earned" value={formatNaira(props.totalEarned)} />
        <StatTile label="Referrals" value={formatNaira(props.referralEarnings)} />
      </section>

      {/* Menu list */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        {menu.map((item, i) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.href.startsWith("http")) window.open(item.href, "_blank")
              else router.push(item.href)
            }}
            className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface active:bg-surface ${
              i !== menu.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={1.8} />
            </span>
            <span className="flex-1 text-sm font-semibold">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </section>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/8 py-3.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/15 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign Out
      </button>

      <p className="text-center text-xs text-muted-foreground pb-2">
        {SITE.name} &middot; {SITE.tagline}
      </p>
    </main>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-border bg-card p-3 text-center">
      <p className="text-sm font-black tabular-nums">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
