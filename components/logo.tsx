import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Logo — tries to load /logo.png; if the project has a custom logo image it
 * will show that, otherwise falls back to a clean SVG monogram mark.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden shrink-0 bg-primary',
        className,
      )}
      aria-label="247 Incum logo"
    >
      <Image
        src="/logo.png"
        alt="247 Incum"
        fill
        className="object-cover"
        priority
        onError={(e) => {
          // If the image fails to load show the SVG fallback
          const target = e.currentTarget as HTMLImageElement
          target.style.display = 'none'
        }}
      />
      {/* SVG monogram fallback — always rendered behind the image */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {/* Background — primary green */}
        <rect width="40" height="40" fill="currentColor" className="text-primary" />
        {/* "2" — bold slab numeral in off-white */}
        <text
          x="50%"
          y="55%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="22"
          fontWeight="900"
          fontFamily="Archivo, system-ui, sans-serif"
          fill="#f5f5f0"
          letterSpacing="-1"
        >
          2I
        </text>
      </svg>
    </div>
  )
}

/** Inline logotype — icon + wordmark side by side for headers */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo className="h-9 w-9 rounded-xl border-2 border-ink" />
      <div className="leading-none">
        <span className="block text-[15px] font-black tracking-tight text-foreground">247 Incum</span>
        <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Invest. Earn. Grow.
        </span>
      </div>
    </div>
  )
}
