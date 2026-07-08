import { cn } from '@/lib/utils'

/**
 * 247 Incum brand mark — a geometric diamond shield with "247" cut in.
 * Renders as pure SVG; no image dependency.
 * Works at any size from 16px favicon to full-page splash.
 */
export function LogoIcon({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="247 Incum"
    >
      {/* Outer diamond shield */}
      <path
        d="M20 2L38 12V28L20 38L2 28V12L20 2Z"
        fill="var(--primary)"
        stroke="var(--ink)"
        strokeWidth="1.5"
      />
      {/* Gold accent top-right facet */}
      <path
        d="M20 2L38 12L28 12L20 5Z"
        fill="var(--gold)"
        opacity="0.85"
      />
      {/* "247" numeral */}
      <text
        x="50%"
        y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="11"
        fontWeight="900"
        fontFamily="Archivo, system-ui, sans-serif"
        fill="var(--primary-foreground)"
        letterSpacing="-0.5"
      >
        247
      </text>
    </svg>
  )
}

/** Full logotype — icon mark + wordmark side by side */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoIcon size={36} />
      <div className="leading-none">
        <span className="block text-[15px] font-black tracking-tight text-foreground">247 Incum</span>
        <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Invest · Earn · Grow
        </span>
      </div>
    </div>
  )
}

/** Compact icon-only mark for favicons / small spaces */
export function Logo({ className }: { className?: string }) {
  return <LogoIcon className={className} />
}
