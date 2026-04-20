import { type ReactNode } from 'react'
import { cn } from './cn'

export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        // Glassmorphism base
        'rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        // Hover: glow + scale
        'transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(79,70,229,0.35)] hover:border-indigo-500/30',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 p-5', className)}>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          {title}
        </div>
        {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

export function CardBody({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>
}

