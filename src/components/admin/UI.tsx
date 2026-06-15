import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

type Tone = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'purple'
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

const toneClass: Record<Tone, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  red: 'border-rose-200 bg-rose-50 text-rose-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  purple: 'border-violet-200 bg-violet-50 text-violet-700',
}

export const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'

export const selectClass = inputClass

export const primaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-[0_10px_24px_rgba(245,158,11,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-[0_14px_28px_rgba(245,158,11,0.28)] focus:outline-none focus:ring-4 focus:ring-amber-500/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:translate-y-0 disabled:opacity-50'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: primaryButton,
  secondary: secondaryButton,
  ghost: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-600 transition duration-200 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-50',
  danger: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:translate-y-0 disabled:opacity-50',
  success: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:translate-y-0 disabled:opacity-50',
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-[34px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] transition duration-200', className)}>
      {children}
    </section>
  )
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold tracking-[-0.02em] text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold leading-none', toneClass[tone])}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase()
  const tone: Tone =
    normalized === 'PAID' || normalized === 'READY' || normalized === 'ACTIVE'
      ? 'green'
      : normalized === 'PREPARING'
        ? 'blue'
        : normalized === 'UNPAID' || normalized === 'PENDING_PAYMENT' || normalized === 'QUEUED'
          ? 'amber'
          : normalized === 'FAILED' || normalized === 'CANCELLED' || normalized === 'INACTIVE'
            ? 'red'
            : 'slate'
  return <Badge tone={tone}>{normalized.replaceAll('_', ' ')}</Badge>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-400 shadow-inner">+</div>
      <p className="font-extrabold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function LoadingState({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-[1.35rem] border border-slate-200 bg-white">
      <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
        {label}
      </div>
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: ButtonVariant; className?: string }) {
  return (
    <button {...props} className={cn(buttonVariants[variant], className)}>
      {children}
    </button>
  )
}

export function ActionButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; className?: string }) {
  return (
    <button {...props} className={cn(secondaryButton, 'min-h-10 rounded-xl px-3 py-2 text-xs', className)}>
      {children}
    </button>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(selectClass, props.className)} />
}

export function MetricCard({
  label,
  value,
  detail,
  tone = 'amber',
}: {
  label: string
  value: ReactNode
  detail?: string
  tone?: Tone
}) {
  const accents: Record<Tone, string> = {
    slate: 'from-slate-500 to-slate-700',
    green: 'from-emerald-400 to-emerald-600',
    amber: 'from-amber-300 to-orange-500',
    red: 'from-rose-400 to-rose-600',
    blue: 'from-blue-400 to-sky-600',
    purple: 'from-violet-400 to-fuchsia-600',
  }
  return (
    <Card className="group overflow-hidden p-5 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.09)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black tracking-[-0.035em] text-slate-950">{value}</p>
          {detail ? <p className="mt-2 text-xs font-semibold text-slate-400">{detail}</p> : null}
        </div>
        <span className={cn('h-12 w-2 rounded-full bg-gradient-to-b shadow-sm', accents[tone])} />
      </div>
    </Card>
  )
}

export const StatCard = MetricCard

export function DataTable({
  columns,
  children,
  minWidth = 760,
}: {
  columns: string[]
  children: ReactNode
  minWidth?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
          <tr>{columns.map((column) => <th key={column} className="px-5 py-3 font-extrabold">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}
