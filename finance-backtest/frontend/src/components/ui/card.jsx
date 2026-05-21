import { cn } from '../../lib/utils'

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-none border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn(
        'text-sm font-semibold leading-none tracking-normal text-[var(--text-strong)]',
        className
      )}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-xs text-[var(--text-2)]', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}
