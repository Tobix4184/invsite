'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Layers, Lock, UsersRound, CircleUserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Home',    icon: LayoutDashboard },
  { href: '/products',  label: 'Plans',   icon: Layers },
  { href: '/games',     label: 'Vault',   icon: Lock },
  { href: '/team',      label: 'Network', icon: UsersRound },
  { href: '/profile',   label: 'Account', icon: CircleUserRound },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 pt-3 pb-2.5 text-[10px] font-bold tracking-wide transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {/* Top underline indicator */}
              <span className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 transition-all",
                active ? "w-6 bg-primary" : "w-0 bg-transparent"
              )} />
              <tab.icon
                className="h-5 w-5"
                strokeWidth={active ? 2.4 : 1.6}
              />
              <span className="leading-none">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
