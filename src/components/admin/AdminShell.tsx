'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { LogoutButton } from '@/components/LogoutButton'

type IconName = 'dashboard' | 'categories' | 'menu' | 'users' | 'promo' | 'reports' | 'tables' | 'settings' | 'cashier' | 'kitchen'

const navGroups: Array<{ title: string; items: Array<{ label: string; href: string; icon: IconName }> }> = [
  {
    title: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
      { label: 'Kategori', href: '/admin/categories', icon: 'categories' },
      { label: 'Menu', href: '/admin/menu', icon: 'menu' },
      { label: 'Promo', href: '/admin/promos', icon: 'promo' },
      { label: 'Laporan', href: '/admin/reports', icon: 'reports' },
    ],
  },
  {
    title: 'Manajemen',
    items: [
      { label: 'Meja & QR', href: '/admin/tables', icon: 'tables' },
      { label: 'Pengguna', href: '/admin/users', icon: 'users' },
      { label: 'Pengaturan', href: '/admin/settings', icon: 'settings' },
    ],
  },
]

const nav = navGroups.flatMap((group) => group.items)
const titles: Record<string, string> = Object.fromEntries(nav.map(({ label, href }) => [href, label]))

function Icon({ name }: { name: IconName }) {
  const common = { className: 'h-4 w-4', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24' }
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><path d="M4 13h6V4H4v9Z" /><path d="M14 20h6v-9h-6v9Z" /><path d="M4 20h6v-3H4v3Z" /><path d="M14 7h6V4h-6v3Z" /></>,
    categories: <><path d="M4 5h7v7H4z" /><path d="M13 5h7v7h-7z" /><path d="M4 14h7v5H4z" /><path d="M13 14h7v5h-7z" /></>,
    menu: <><path d="M5 6h14" /><path d="M5 12h14" /><path d="M5 18h10" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    promo: <><path d="M20.6 13.3 13.3 20.6a2 2 0 0 1-2.8 0L3 13.1V4h9.1l8.5 8.5a2 2 0 0 1 0 .8Z" /><circle cx="7.5" cy="8" r="1.5" /></>,
    reports: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-3" /></>,
    tables: <><path d="M4 8h16" /><path d="M6 8v10" /><path d="M18 8v10" /><path d="M8 18h8" /><path d="M7 5h10l3 3H4l3-3Z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
    cashier: <><path d="M4 7h16v12H4z" /><path d="M8 7V5h8v2" /><path d="M8 13h.01" /><path d="M12 13h4" /></>,
    kitchen: <><path d="M6 3v7" /><path d="M10 3v7" /><path d="M8 10v11" /><path d="M17 3v18" /><path d="M14 3h6" /></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

function NavLink({ label, href, icon, active, onClick }: { label: string; href: string; icon: IconName; active?: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition duration-200 ${active ? 'bg-white text-slate-950 shadow-[0_14px_34px_rgba(0,0,0,0.22)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl border transition duration-200 ${active ? 'border-amber-200 bg-amber-400 text-slate-950' : 'border-white/10 bg-white/[0.03] text-slate-500 group-hover:border-white/15 group-hover:text-amber-300'}`}><Icon name={icon} /></span>
      {label}
      {active ? <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" /> : null}
    </Link>
  )
}

export function AdminShell({ children, user, cafeName }: { children: ReactNode; user: { name?: string | null; email?: string | null }; cafeName: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const currentTitle = titles[pathname] ?? nav.find(({ href }) => href !== '/admin' && pathname.startsWith(href))?.label ?? 'Dashboard'

  const sidebar = (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#050914] text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_90%_30%,rgba(59,130,246,0.12),transparent_24%)]" />
      <div className="relative flex h-24 items-center gap-3 border-b border-white/10 px-5">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-lg font-black text-slate-950 shadow-[0_16px_36px_rgba(245,158,11,0.28)]">Q</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-[-0.02em] text-white">{cafeName}</p>
          <p className="text-xs font-semibold text-slate-500">Professional POS workspace</p>
        </div>
      </div>
      <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 py-5 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.href === '/admin' ? pathname === item.href || pathname === '/admin/dashboard' : pathname.startsWith(item.href)
                return <NavLink key={item.href} {...item} active={active} onClick={() => setOpen(false)} />
              })}
            </div>
          </div>
        ))}
        <div className="my-4 border-t border-slate-800" />
        <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Operasional</p>
        <NavLink href="/cashier" label="Kasir" icon="cashier" onClick={() => setOpen(false)} />
        <NavLink href="/kitchen/display" label="Kitchen" icon="kitchen" onClick={() => setOpen(false)} />
      </nav>
      <div className="relative border-t border-white/10 p-4">
        <div className="mb-3 rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-inner">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500 text-sm font-black text-slate-950">{user.name?.slice(0, 1).toUpperCase() ?? 'A'}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div></div>
        </div>
        <LogoutButton className="w-full rounded-2xl border border-white/10 px-3 py-2.5 text-left text-xs font-bold text-slate-400 transition duration-200 hover:bg-white/5 hover:text-white" label="Keluar" />
      </div>
    </div>
  )

  return (
    <div className="surface-grid min-h-screen text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">{sidebar}</aside>
      {open ? <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/60" /><aside className="relative h-full w-72 shadow-2xl">{sidebar}</aside></div> : null}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setOpen(true)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden" aria-label="Buka menu"><span className="block h-0.5 w-5 bg-current" /><span className="mt-1.5 block h-0.5 w-5 bg-current" /></button><div><p className="text-base font-black tracking-[-0.02em] text-slate-950">{currentTitle}</p><p className="hidden text-xs font-semibold text-slate-500 sm:block">Kelola operasional cafe dari satu tempat</p></div></div>
          <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:inline-flex"><i className="h-2 w-2 rounded-full bg-emerald-500" />Sistem aktif</span><Link href="/menu/meja-1" target="_blank" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50">Lihat storefront</Link></div>
        </header>
        <main className="mx-auto max-w-[1480px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
