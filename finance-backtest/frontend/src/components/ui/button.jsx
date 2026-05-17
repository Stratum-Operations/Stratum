import { cn } from '../../lib/utils'
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center text-[10px] font-700 tracking-widest uppercase font-mono transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 border-0',
  {
    variants: {
      variant: {
        default:     'bg-white text-black hover:bg-[#d0d0d0]',
        ghost:       'bg-transparent text-[#888888] hover:text-[#d0d0d0] hover:bg-[#141414]',
        outline:     'bg-transparent border border-[#2e2e2e] text-[#d0d0d0] hover:bg-[#141414]',
        destructive: 'bg-[#ef4444] text-white hover:bg-[#dc2626]',
        success:     'bg-[#22c55e] text-black hover:bg-[#16a34a]',
        muted:       'bg-[#141414] text-[#888888] hover:bg-[#1a1a1a] hover:text-[#d0d0d0]',
      },
      size: {
        sm:  'h-7 px-3 text-[9px]',
        md:  'h-9 px-4',
        lg:  'h-11 px-6 text-[11px]',
        xl:  'h-14 px-8 text-[13px] font-900',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
