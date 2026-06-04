import Image from 'next/image'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-xl overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src="/logo.png"
        alt="incomehh"
        fill
        className="object-cover"
        priority
      />
    </div>
  )
}
