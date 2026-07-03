'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Layers, Gamepad2, UsersRound, CircleUser } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: LayoutGrid },
  { href: '/products', label: 'Plans', icon: Layers },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/team', label: 'Team', icon: UsersRound },
  { href: '/profile', label: 'Account', icon: CircleUser },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <nav className="card-glass mx-auto flex max-w-md items-stretch justify-around rounded-2xl px-1.5 py-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold tracking-wide transition-colors',
                active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl bg-primary glow-primary" aria-hidden />
              )}
              <tab.icon
                className={cn('relative h-[18px] w-[18px] transition-transform group-active:scale-90')}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className="relative leading-none">{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
