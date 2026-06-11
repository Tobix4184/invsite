import Image from 'next/image'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-xl overflow-hidden shrink-0',
        className,
      )}
      aria-label="Poco logo"
    >
      <Image
        src="/logo.png"
        alt="Poco"
        fill
        className="object-cover"
        priority
      />
    </div>
  )
}
