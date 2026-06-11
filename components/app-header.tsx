'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SITE } from '@/lib/plans'

export function AppHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="text-base font-black tracking-tight">{title ?? SITE.name}</span>
        </div>
        <Link
          href="/profile"
          aria-label="Profile"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </Link>
      </div>
    </header>
  )
}
