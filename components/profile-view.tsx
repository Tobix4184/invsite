"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Ticket,
  UsersRound,
  MessageCircleHeart,
  ChevronRight,
  LogOut,
  ListFilter,
  ShieldCheck,
  Loader2,
  Wallet2,
  TrendingUp,
  BadgeDollarSign,
  Star,
  Phone,
  Mail,
} from "lucide-react"
import { toast } from "sonner"
import { SITE, formatNaira, maskPhone } from "@/lib/plans"
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
  const [balanceVisible, setBalanceVisible] = useState(true)

  const isAdmin = props.role === "admin" || props.role === "moderator"

  const quickLinks = [
    { label: "Deposit",    icon: ArrowDownToLine, href: "/deposits",  bg: "bg-success",      fg: "text-success-foreground" },
    { label: "Withdraw",   icon: ArrowUpFromLine, href: "/withdraw",  bg: "bg-primary",      fg: "text-primary-foreground" },
    { label: "Gift Code",  icon: Ticket,          href: "/gift-code", bg: "bg-gold",         fg: "text-gold-foreground" },
    { label: "My Network", icon: UsersRound,       href: "/team",     bg: "bg-card",         fg: "text-foreground" },
  ]

  const menuItems = [
    { label: "Transaction History", icon: ListFilter,          href: "/transactions",       sub: "All deposits, withdrawals & earnings" },
    { label: "My Referral Network", icon: UsersRound,          href: "/team",               sub: "Track your team & commissions" },
    { label: "Support",             icon: MessageCircleHeart,  href: SITE.telegramSupport,  sub: "Chat with us on Telegram" },
    ...(isAdmin
      ? [{ label: "Admin Panel", icon: ShieldCheck, href: "/admin", sub: "Manage the platform" }]
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
    .toUpperCase() || "ME"

  const displayPhone = props.phone ? maskPhone(props.phone) : null

  return (
    <main className="mx-auto flex max-w-md flex-col gap-0 animate-fade-up">

      {/* ── Hero cover ─────────────────────────────────────────── */}
      <div className="relative border-b-2 border-ink bg-primary px-4 pb-16 pt-6">
        {/* Role badge */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-background px-3 py-1 text-[11px] font-black uppercase tracking-widest text-foreground">
            {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <Star className="h-3 w-3" />}
            {props.role === "admin" ? "Admin" : props.role === "moderator" ? "Moderator" : "Member"}
          </span>
          <span className="text-[11px] font-bold text-primary-foreground/70 uppercase tracking-widest">
            {SITE.name}
          </span>
        </div>

        {/* Name */}
        <div className="mt-4">
          <h2 className="text-2xl font-black tracking-tight text-primary-foreground leading-none text-balance">
            {props.name}
          </h2>
        </div>
      </div>

      {/* ── Avatar card (breaks out of cover) ────────────────── */}
      <div className="relative z-10 -mt-10 px-4">
        <div className="card-glass overflow-hidden rounded-3xl border-2 border-ink shadow-[5px_5px_0_0_var(--ink)]">

          {/* Avatar row */}
          <div className="flex items-end gap-4 px-5 pt-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-primary text-3xl font-black text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]">
              {initials}
            </div>
            <div className="mb-1 min-w-0 flex-1">
              {displayPhone && (
                <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {displayPhone}
                </p>
              )}
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-bold text-muted-foreground">
                <Mail className="h-3 w-3" />
                {props.email}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 mt-4 border-t-2 border-ink/15" />

          {/* Balance */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink bg-success">
                <Wallet2 className="h-4 w-4 text-success-foreground" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Wallet Balance
              </span>
            </div>
            <button
              onClick={() => setBalanceVisible((v) => !v)}
              className="text-right"
            >
              <span className="text-xl font-black tabular-nums">
                {balanceVisible ? formatNaira(props.balance) : "₦ ••••••"}
              </span>
              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {balanceVisible ? "hide" : "show"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div className="mt-4 px-4">
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard
            icon={ArrowDownToLine}
            iconBg="bg-surface"
            iconColor="text-foreground"
            label="Deposited"
            value={formatNaira(props.totalDeposited)}
          />
          <StatCard
            icon={TrendingUp}
            iconBg="bg-surface"
            iconColor="text-success"
            label="Earned"
            value={formatNaira(props.totalEarned)}
          />
          <StatCard
            icon={BadgeDollarSign}
            iconBg="bg-surface"
            iconColor="text-gold"
            label="Referral"
            value={formatNaira(props.referralEarnings)}
          />
        </div>
      </div>

      {/* ── Quick action pills ───────────────────────────────── */}
      <div className="mt-4 px-4">
        <p className="mb-2.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Quick Actions
        </p>
        <div className="grid grid-cols-4 gap-2.5">
          {quickLinks.map((q) => (
            <button
              key={q.label}
              onClick={() => {
                if (q.href.startsWith("http")) window.open(q.href, "_blank")
                else router.push(q.href)
              }}
              className="press flex flex-col items-center gap-2 rounded-2xl border-2 border-ink bg-card py-3.5 shadow-[3px_3px_0_0_var(--ink)]"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink ${q.bg}`}>
                <q.icon className={`h-5 w-5 ${q.fg}`} strokeWidth={2.2} />
              </span>
              <span className="text-[10px] font-black uppercase leading-tight tracking-wide text-center">
                {q.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Menu list ────────────────────────────────────────── */}
      <div className="mt-4 px-4">
        <p className="mb-2.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Account
        </p>
        <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.href.startsWith("http")) window.open(item.href, "_blank")
                else router.push(item.href)
              }}
              className={`flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-surface active:bg-surface ${
                i !== menuItems.length - 1 ? "border-b-2 border-ink/15" : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface">
                <item.icon className="h-4 w-4 text-foreground" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">{item.label}</p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{item.sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Sign out ─────────────────────────────────────────── */}
      <div className="mt-4 px-4 pb-8">
        <button
          onClick={handleSignOut}
          disabled={pending}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-destructive py-4 text-sm font-black uppercase tracking-widest text-destructive-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Sign Out
        </button>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          {SITE.name} &middot; {SITE.tagline}
        </p>
      </div>
    </main>
  )
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-ink bg-card p-3 shadow-[3px_3px_0_0_var(--ink)]">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink ${iconBg}`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} strokeWidth={2.2} />
      </span>
      <div>
        <p className="text-sm font-black tabular-nums leading-tight">{value}</p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
