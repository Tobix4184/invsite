import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button press inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-clip-padding text-sm font-bold whitespace-nowrap outline-none select-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] hover:brightness-105',
        outline:
          'border-ink bg-card text-foreground shadow-[3px_3px_0_0_var(--ink)] hover:bg-surface',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[3px_3px_0_0_var(--ink)] hover:bg-surface',
        ghost:
          'border-transparent shadow-none hover:bg-surface hover:text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[3px_3px_0_0_var(--ink)] hover:brightness-105',
        link: 'border-transparent shadow-none text-primary underline underline-offset-4 hover:brightness-110',
      },
      size: {
        default: 'h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-md px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-11 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-9',
        'icon-xs': "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
