import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Inbox, Search } from 'lucide-react'
import { cn } from '../lib/format'
import { EMP } from '../data/employees'
import type { EmployeeId, Priority, TaskStatus } from '../types'

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'outline' | 'ghost' | 'danger'
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'sm' | 'md'
  icon?: LucideIcon
}
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-ctl font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none select-none'
const btnVar: Record<BtnVariant, string> = {
  primary: 'bg-brand text-canvas hover:bg-brand/90',
  outline: 'border border-line text-ink hover:bg-raised',
  ghost: 'text-mute hover:text-ink hover:bg-raised',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
}
export function Button({ variant = 'outline', size = 'md', icon: Icon, className, children, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={cn(btnBase, btnVar[variant], size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm', className)}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden />}
      {children}
    </button>
  )
}

export function IconButton({
  icon: Icon,
  label,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-ctl text-mute transition-colors hover:bg-raised hover:text-ink disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      <Icon size={18} aria-hidden />
    </button>
  )
}

/* ---------- Surfaces ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-card border border-line bg-surface shadow-card', className)}>{children}</section>
}

export function CardHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
      </div>
      {aside}
    </header>
  )
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-sm text-mute">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Notice({ tone = 'warn', children }: { tone?: 'warn' | 'info'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-ctl border px-3.5 py-2.5 text-[13px]',
        tone === 'warn' ? 'border-warn/30 bg-warn/5 text-ink' : 'border-info/30 bg-info/5 text-ink',
      )}
    >
      <AlertTriangle size={16} className={cn('mt-0.5 shrink-0', tone === 'warn' ? 'text-warn' : 'text-info')} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/* ---------- Badges ---------- */
const toneCls = {
  neutral: 'bg-raised text-mute',
  brand: 'bg-brand/15 text-brand',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
}
export type Tone = keyof typeof toneCls
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', toneCls[tone], className)}>
      {children}
    </span>
  )
}

const statusTone: Record<TaskStatus, Tone> = {
  Pending: 'neutral',
  Assigned: 'info',
  'In Progress': 'info',
  Review: 'warn',
  Completed: 'brand',
  Failed: 'danger',
  'Requires Approval': 'warn',
}
export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>
}

const prioTone: Record<Priority, Tone> = { Low: 'neutral', Medium: 'info', High: 'warn', Urgent: 'danger' }
export function PriorityBadge({ p }: { p: Priority }) {
  return <Badge tone={prioTone[p]}>{p}</Badge>
}

/* ---------- Avatar ---------- */
export function Avatar({ id, size = 40, ring }: { id: EmployeeId; size?: number; ring?: boolean }) {
  const e = EMP[id]
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold', ring && 'ring-2 ring-brand')}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `hsl(${e.hue} 26% 22%)`,
        color: `hsl(${e.hue} 55% 80%)`,
      }}
    >
      {e.name[0]}
    </span>
  )
}

/* ---------- Forms ---------- */
export const inputCls =
  'h-10 w-full rounded-ctl border border-line bg-canvas px-3 text-sm text-ink placeholder:text-mute/70 focus:border-brand focus:outline-none'

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-mute">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-mute">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger" role="alert">{error}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, 'h-auto min-h-[88px] resize-y py-2.5', props.className)} />
}

export function Select({ children, className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(inputCls, 'appearance-none bg-no-repeat pr-8', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a9992' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 12px center',
      }}
    >
      {children}
    </select>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Cari' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(inputCls, 'pl-9')}
      />
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40',
        checked ? 'bg-brand' : 'bg-line',
      )}
    >
      <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ink transition-transform', checked && 'translate-x-5')} />
    </button>
  )
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto rounded-ctl border border-line bg-surface p-1', className)}>
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
            value === it.id ? 'bg-raised text-ink' : 'text-mute hover:text-ink',
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="tabular text-xs text-mute">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- States ---------- */
export function EmptyState({ title, desc, action, icon: Icon = Inbox }: { title: string; desc?: string; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-raised text-mute">
        <Icon size={20} aria-hidden />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-[13px] text-mute">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ title, desc, onRetry }: { title: string; desc: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle size={20} aria-hidden />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-mute">{desc}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-ctl bg-raised', className)} />
}

export function PageLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat halaman">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

/* ---------- Stat ---------- */
export function Stat({ label, value, note, icon: Icon }: { label: string; value: ReactNode; note?: string; icon: LucideIcon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-mute">{label}</span>
        <Icon size={16} className="text-mute" aria-hidden />
      </div>
      <div className="tabular mt-2 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-mute">
        {note}
      </div>
    </Card>
  )
}
