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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/98 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold tracking-wide transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {/* Active pill behind icon */}
              {active && (
                <span className="absolute top-1.5 h-7 w-12 rounded-full bg-primary/12" />
              )}
              <tab.icon
                className={cn(
                  'relative z-10 h-5 w-5 transition-transform',
                  active ? 'scale-110' : 'scale-100',
                )}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className="relative z-10 leading-none">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
