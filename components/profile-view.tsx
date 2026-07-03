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
    { label: "Transactions", icon: ListFilter, href: "/transactions", color: "text-foreground", bg: "bg-card" },
    { label: "Deposit",      icon: ArrowDownToLine, href: "/deposits", color: "text-success-foreground",   bg: "bg-success" },
    { label: "Withdraw",     icon: ArrowUpFromLine, href: "/withdraw",color: "text-primary-foreground",    bg: "bg-primary" },
    { label: "Gift Code",    icon: Ticket,          href: "/gift-code",color: "text-gold-foreground",      bg: "bg-gold" },
    { label: "My Network",   icon: UsersRound,      href: "/team",    color: "text-primary-foreground",    bg: "bg-primary" },
    { label: "Support",      icon: MessageCircleHeart, href: SITE.telegramGroup, color: "text-primary-foreground",  bg: "bg-primary" },
    ...(props.role === "admin" || props.role === "moderator"
      ? [{ label: "Admin Panel", icon: ShieldCheck, href: "/admin", color: "text-destructive-foreground", bg: "bg-destructive" }]
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
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5 animate-fade-up">

      {/* Identity card */}
      <section className="card-glass relative overflow-hidden rounded-3xl p-5">
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-primary text-xl font-black text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]">
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
        <div className="relative mt-4 flex items-center justify-between rounded-2xl border-2 border-ink bg-surface px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Wallet2 className="h-4 w-4 text-success" strokeWidth={2.2} />
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Available Balance</span>
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
      <section className="card-glass overflow-hidden rounded-3xl">
        {menu.map((item, i) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.href.startsWith("http")) window.open(item.href, "_blank")
              else router.push(item.href)
            }}
            className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface active:bg-surface ${
              i !== menu.length - 1 ? "border-b-2 border-ink/15" : ""
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-sm font-bold">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </section>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={pending}
        className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-destructive py-3.5 text-sm font-black uppercase text-destructive-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
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
    <div className="card-glass flex flex-col items-center gap-0.5 rounded-2xl p-3 text-center">
      <p className="text-sm font-black tabular-nums">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
