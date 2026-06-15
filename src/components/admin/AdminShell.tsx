'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LogoutButton } from '@/components/LogoutButton'

const nav = [
  ['Dashboard', '/admin', 'D'], ['Kategori', '/admin/categories', 'K'], ['Menu', '/admin/menu', 'M'],
  ['Pengguna', '/admin/users', 'U'], ['Promo', '/admin/promos', 'P'], ['Laporan', '/admin/reports', 'L'],
  ['Meja & QR', '/admin/tables', 'Q'], ['Pengaturan', '/admin/settings', 'S'],
] as const

const titles: Record<string, string> = Object.fromEntries(nav.map(([label, href]) => [href, label]))

export function AdminShell({ children, user, cafeName }: { children: React.ReactNode; user: { name?: string | null; email?: string | null }; cafeName: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const currentTitle = titles[pathname] ?? nav.find(([, href]) => href !== '/admin' && pathname.startsWith(href))?.[0] ?? 'Dashboard'
  const sidebar = <div className="flex h-full flex-col bg-slate-950 text-slate-200">
    <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-lg font-black text-slate-950">Q</div><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{cafeName}</p><p className="text-xs text-slate-500">Order Management</p></div></div>
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Workspace</p>
      {nav.map(([label, href, icon]) => { const active = href === '/admin' ? pathname === href || pathname === '/admin/dashboard' : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}><span className="grid h-6 w-6 place-items-center rounded-md border border-current/20 text-[10px] font-black">{icon}</span>{label}</Link> })}
      <div className="my-4 border-t border-slate-800"/><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Operasional</p>
      <Link href="/cashier" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"><span className="grid h-6 w-6 place-items-center text-xs font-bold">Rp</span>Kasir</Link>
      <Link href="/kitchen/display" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"><span className="grid h-6 w-6 place-items-center text-xs font-bold">K</span>Kitchen</Link>
    </nav>
    <div className="border-t border-slate-800 p-4"><div className="mb-3 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-sm font-bold text-amber-400">{user.name?.slice(0, 1).toUpperCase() ?? 'A'}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div></div><LogoutButton className="w-full rounded-lg border border-slate-800 px-3 py-2 text-left text-xs font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white" label="Keluar"/></div>
  </div>

  return <div className="min-h-screen bg-slate-100 text-slate-900"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>{open ? <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/60"/><aside className="relative h-full w-72 shadow-2xl">{sidebar}</aside></div> : null}<div className="lg:pl-64"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button onClick={() => setOpen(true)} className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="Buka menu"><span className="block text-lg leading-none">=</span></button><div><p className="text-base font-extrabold text-slate-950">{currentTitle}</p><p className="hidden text-xs text-slate-500 sm:block">Kelola operasional cafe dari satu tempat</p></div></div><div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex"><i className="h-2 w-2 rounded-full bg-emerald-500"/>Sistem aktif</span><Link href="/menu/meja-1" target="_blank" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Lihat storefront</Link></div></header><main className="mx-auto max-w-[1480px] p-4 sm:p-6 lg:p-8">{children}</main></div></div>
}
