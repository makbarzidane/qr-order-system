import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/LogoutButton'
import { authOptions } from '@/lib/auth'

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!['CASHIER', 'ADMIN'].includes(session.user.role)) redirect('/login?error=unauthorized')

  return <div className="min-h-screen bg-slate-100"><header className="sticky top-0 z-30 border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f1f33] text-sm font-black text-amber-400">Rp</div><div><h1 className="font-extrabold text-slate-950">Pembayaran kasir</h1><p className="text-xs text-slate-500">{session.user.name} · {session.user.email}</p></div></div><div className="flex items-center gap-2"><Link href="/kitchen/display" target="_blank" className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 sm:block">Buka kitchen</Link><LogoutButton className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200" label="Keluar" /></div></div></header><main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main></div>
}
