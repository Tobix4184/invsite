'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Layers, UsersRound, CircleUser, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

const tabs = [
  { href: '/dashboard', label: 'Home',    icon: LayoutGrid },
  { href: '/products',  label: 'Plans',   icon: Layers },
  { href: '/tasks',     label: 'Tasks',   icon: ListChecks },
  { href: '/team',      label: 'Network', icon: UsersRound },
  { href: '/profile',   label: 'Account', icon: CircleUser },
]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function BottomNav() {
  const pathname = usePathname()

  const { data } = useSWR('/api/pending-tasks', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })
  const hasPendingTasks = (data?.count ?? 0) > 0

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <nav className="mx-auto flex max-w-md items-stretch justify-around rounded-2xl border-2 border-ink bg-card px-1.5 py-1.5 shadow-[4px_4px_0_0_var(--ink)]">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          const isTasksTab = tab.href === '/tasks'
          const showDot = isTasksTab && hasPendingTasks && !active

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-wide transition-colors',
                active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl border-2 border-ink bg-primary" aria-hidden />
              )}

              {/* Icon + green dot badge */}
              <span className="relative">
                <tab.icon
                  className={cn(
                    'relative h-[18px] w-[18px] transition-transform group-active:scale-90',
                    showDot && 'text-success',
                  )}
                  strokeWidth={active ? 2.6 : showDot ? 2.4 : 2}
                />
                {showDot && (
                  <span
                    className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full border border-card bg-success"
                    aria-label="Available tasks"
                  />
                )}
              </span>

              <span className={cn('relative leading-none', showDot && 'text-success')}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
