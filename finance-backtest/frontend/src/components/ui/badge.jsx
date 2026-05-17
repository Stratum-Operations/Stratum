import { cn } from '../../lib/utils'
import { cva } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 text-[10px] font-700 tracking-widest uppercase font-mono border transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-transparent border-[#2e2e2e] text-[#d0d0d0]',
        selected:    'bg-white border-white text-black',
        green:       'bg-transparent border-[#22c55e] text-[#22c55e]',
        red:         'bg-transparent border-[#ef4444] text-[#ef4444]',
        amber:       'bg-transparent border-[#f59e0b] text-[#f59e0b]',
        muted:       'bg-transparent border-[#1c1c1c] text-[#888888]',
        solid:       'bg-[#1a1a1a] border-[#2e2e2e] text-[#d0d0d0]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
