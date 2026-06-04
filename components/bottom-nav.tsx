'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FolderClosed, Zap, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/products', label: 'Products', icon: FolderClosed },
  { href: '/my-investments', label: 'Investments', icon: Zap },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className={cn('h-5 w-5', active && 'fill-primary/20')} />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
