'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { Logo } from '@/components/logo'
import { InfoModal } from '@/components/info-modal'
import { SITE } from '@/lib/plans'

export function AppHeader({ title }: { title?: string }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight">{title ?? SITE.name}</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            aria-label="Platform information"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>
      {mounted && open && createPortal(
        <InfoModal open={open} onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  )
}
