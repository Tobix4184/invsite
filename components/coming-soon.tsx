import Link from 'next/link'
import { ArrowLeft, Lock, Bell } from 'lucide-react'
import { SITE } from '@/lib/plans'

export function ComingSoon({
  title,
  description,
  backHref = '/dashboard',
}: {
  title: string
  description: string
  backHref?: string
}) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-14 text-center">
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <Lock className="h-9 w-9 text-primary" />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black tracking-tight text-balance">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-balance">{description}</p>
      </div>

      {/* Notify button (UI only) */}
      <button className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/20">
        <Bell className="h-4 w-4" />
        Notify Me When Live
      </button>

      {/* Back link */}
      <Link
        href={backHref}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <p className="text-xs text-muted-foreground">
        {SITE.name} — {SITE.tagline}
      </p>
    </main>
  )
}
