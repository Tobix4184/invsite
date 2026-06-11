import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-xl overflow-hidden bg-primary shrink-0',
        className,
      )}
      aria-label="Poco logo"
    >
      <span
        className="text-primary-foreground font-black tracking-tighter select-none"
        style={{ fontSize: '40%', lineHeight: 1 }}
      >
        P
      </span>
    </div>
  )
}
