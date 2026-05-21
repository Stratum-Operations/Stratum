import { cn } from '../../lib/utils'
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-none text-[12px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 border',
  {
    variants: {
      variant: {
        default:     'bg-[var(--ink)] border-[var(--ink)] text-white hover:bg-[var(--text-strong)]',
        ghost:       'bg-transparent border-transparent text-[var(--text-2)] hover:text-[var(--text-strong)] hover:bg-[var(--surface-2)]',
        outline:     'bg-white border-[var(--border)] text-[var(--text-strong)] hover:bg-[var(--surface-2)]',
        destructive: 'bg-[var(--red)] border-[var(--red)] text-white hover:opacity-90',
        success:     'bg-[var(--green)] border-[var(--green)] text-white hover:opacity-90',
        muted:       'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-strong)]',
      },
      size: {
        sm:  'h-8 px-3 text-[11px]',
        md:  'h-10 px-4',
        lg:  'h-11 px-6 text-[13px]',
        xl:  'h-14 px-8 text-[14px] font-extrabold',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
