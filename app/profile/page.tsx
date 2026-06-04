import Link from 'next/link'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Gift,
  Users,
  Wallet,
  Headphones,
  ShieldCheck,
  ChevronRight,
  LogIn,
  UserPlus,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { SITE, formatNaira } from '@/lib/plans'

const menu = [
  { label: 'Topup', icon: ArrowDownToLine, href: '/topup', tint: 'text-success' },
  { label: 'Withdraw', icon: ArrowUpFromLine, href: '/withdraw', tint: 'text-amber-400' },
  { label: 'Gift Code', icon: Gift, href: '/gift-code', tint: 'text-pink-400' },
  { label: 'My Team', icon: Users, href: '/team', tint: 'text-primary' },
  { label: 'Customer Support', icon: Headphones, href: SITE.telegramGroup, tint: 'text-sky-400' },
  { label: 'Security', icon: ShieldCheck, href: '/register', tint: 'text-muted-foreground' },
]

export default function ProfilePage() {
  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Profile" />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/30 via-card to-card p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground">
              IH
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">Guest User</h2>
              <p className="truncate text-sm text-muted-foreground">Not signed in</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/40 p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">Available Balance</span>
            </div>
            <span className="text-lg font-bold tabular-nums">{formatNaira(1100)}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
              href="/sign-in"
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-bold text-secondary-foreground transition-colors hover:bg-accent"
            >
              <LogIn className="h-4 w-4" /> Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <UserPlus className="h-4 w-4" /> Register
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          {menu.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 p-4 transition-colors hover:bg-secondary ${
                i !== menu.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <item.icon className={`h-4 w-4 ${item.tint}`} />
              </span>
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          {SITE.name} • {SITE.tagline}
        </p>
      </main>

      <BottomNav />
    </div>
  )
}
