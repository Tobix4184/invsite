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
  Eye,
  EyeOff,
  Zap,
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

  const initials = props.name
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase() || "ME"

  const displayPhone = props.phone ? maskPhone(props.phone) : null

  const quickLinks = [
    { label: "Deposit",    icon: ArrowDownToLine, href: "/deposits",  bg: "bg-success",  fg: "text-success-foreground" },
    { label: "Withdraw",   icon: ArrowUpFromLine, href: "/withdraw",  bg: "bg-primary",  fg: "text-primary-foreground" },
    { label: "Gift Code",  icon: Ticket,          href: "/gift-code", bg: "bg-gold",     fg: "text-gold-foreground" },
    { label: "Network",    icon: UsersRound,       href: "/team",     bg: "bg-card",     fg: "text-foreground" },
  ]

  const menuItems = [
    { label: "Transaction History", icon: ListFilter,         href: "/transactions",      sub: "All deposits, withdrawals & earnings" },
    { label: "My Referral Network", icon: UsersRound,         href: "/team",              sub: "Track your team & commissions" },
    { label: "Support",             icon: MessageCircleHeart, href: SITE.telegramSupport, sub: "Chat with us on Telegram" },
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

  return (
    <main className="mx-auto flex max-w-md flex-col animate-fade-up">

      {/* ── Full-bleed hero ──────────────────────────────────── */}
      <div className="relative border-b-2 border-ink bg-primary px-5 pt-6 pb-20">
        {/* Top row: role + site name */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/30 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary-foreground">
            {isAdmin
              ? <><ShieldCheck className="h-3 w-3" /> {props.role === "admin" ? "Admin" : "Moderator"}</>
              : <><Star className="h-3 w-3" /> Member</>
            }
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/60">
            {SITE.name}
          </span>
        </div>

        {/* Name */}
        <h2 className="mt-4 text-3xl font-black leading-none tracking-tight text-primary-foreground text-balance">
          {props.name}
        </h2>

        {/* Contact chips */}
        <div className="mt-2 flex flex-wrap gap-2">
          {displayPhone && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-primary-foreground/80">
              <Phone className="h-3 w-3" /> {displayPhone}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-primary-foreground/80">
            <Mail className="h-3 w-3" /> {props.email}
          </span>
        </div>
      </div>

      {/* ── Balance card (breaks out of hero) ───────────────── */}
      <div className="relative z-10 -mt-14 px-4">
        <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[5px_5px_0_0_var(--ink)]">

          {/* Balance row */}
          <div className="flex items-center justify-between px-5 py-4 border-b-2 border-ink/10">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-success">
                <Wallet2 className="h-5 w-5 text-success-foreground" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Wallet Balance</p>
                <button
                  onClick={() => setBalanceVisible((v) => !v)}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-2xl font-black tabular-nums">
                    {balanceVisible ? formatNaira(props.balance) : "₦ ••••••"}
                  </span>
                  {balanceVisible
                    ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    : <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </button>
              </div>
            </div>
            {/* Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-primary text-xl font-black text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]">
              {initials}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x-2 divide-ink/10">
            <MiniStat icon={ArrowDownToLine} label="Deposited" value={formatNaira(props.totalDeposited)} iconBg="bg-surface" iconColor="text-foreground" />
            <MiniStat icon={TrendingUp} label="Earned" value={formatNaira(props.totalEarned)} iconBg="bg-surface" iconColor="text-success" />
            <MiniStat icon={BadgeDollarSign} label="Referral" value={formatNaira(props.referralEarnings)} iconBg="bg-surface" iconColor="text-gold-foreground" />
          </div>
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────────────── */}
      <div className="mt-5 px-4">
        <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
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
              <span className="text-center text-[10px] font-black uppercase leading-tight tracking-wide">
                {q.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Achievement strip ────────────────────────────────── */}
      {props.totalEarned > 0 && (
        <div className="mt-4 mx-4 flex items-center gap-3 rounded-2xl border-2 border-ink bg-gold/15 px-4 py-3">
          <Zap className="h-5 w-5 shrink-0 text-gold-foreground" />
          <p className="text-xs font-bold text-foreground">
            You have earned <span className="font-black text-gold-foreground">{formatNaira(props.totalEarned)}</span> in total returns. Keep investing!
          </p>
        </div>
      )}

      {/* ── Menu ─────────────────────────────────────────────── */}
      <div className="mt-5 px-4">
        <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
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
                i !== menuItems.length - 1 ? "border-b-2 border-ink/10" : ""
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
      <div className="mt-5 px-4 pb-8">
        <button
          onClick={handleSignOut}
          disabled={pending}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-destructive py-4 text-sm font-black uppercase tracking-widest text-destructive-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Sign Out
        </button>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          {SITE.name} &middot; {SITE.tagline}
        </p>
      </div>
    </main>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType
  label: string
  value: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-4 text-center">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg border border-ink/20 ${iconBg}`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} strokeWidth={2.2} />
      </span>
      <p className="text-sm font-black tabular-nums leading-none">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
