import { cn } from '../../lib/utils'

export function Tabs({ value, onValueChange, children, className, ...props }) {
  return (
    <div
      className={cn('w-full', className)}
      data-value={value}
      data-on-value-change={onValueChange ? 'controlled' : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsList({ className, ...props }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex min-h-10 items-center rounded-none border border-[var(--border)] bg-[var(--surface-2)] p-1',
        className
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ value, currentValue, onValueChange, className, ...props }) {
  const active = value === currentValue
  return (
    <button
      role="tab"
      aria-selected={active}
      data-state={active ? 'active' : 'inactive'}
      onClick={() => onValueChange?.(value)}
      className={cn(
        'inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-none px-3 text-xs font-bold text-[var(--text-2)] transition-colors hover:text-[var(--text-strong)]',
        active && 'bg-[var(--surface)] text-[var(--text-strong)] shadow-sm',
        className
      )}
      {...props}
    />
  )
}

export function TabsContent({ value, currentValue, className, ...props }) {
  if (value !== currentValue) return null
  return <div role="tabpanel" className={cn('mt-5', className)} {...props} />
}
