import { cn } from '../../lib/utils'
import { cva } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-white border-[var(--border)] text-[var(--text)]',
        selected:    'bg-[var(--ink)] border-[var(--ink)] text-white',
        green:       'bg-[var(--green-dim)] border-transparent text-[var(--green)]',
        red:         'bg-[var(--red-dim)] border-transparent text-[var(--red)]',
        amber:       'bg-[#fff7ed] border-transparent text-[var(--amber)]',
        muted:       'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-2)]',
        solid:       'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-strong)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
