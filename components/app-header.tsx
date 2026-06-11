'use client'

import Link from 'next/link'
import { BellDot } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SITE } from '@/lib/plans'

export function AppHeader({ title }: { title?: string }) {
  const isHome = !title

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        {isHome ? (
          /* Home: logo + wordmark */
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="text-base font-black tracking-tight">{SITE.name}</span>
          </div>
        ) : (
          /* Inner page: just the title */
          <h1 className="text-base font-black tracking-tight">{title}</h1>
        )}

        <Link
          href="/profile"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <BellDot className="h-4 w-4" />
        </Link>
      </div>
    </header>
  )
}
