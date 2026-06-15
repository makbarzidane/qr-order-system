import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/LogoutButton'
import { authOptions } from '@/lib/auth'

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!['KITCHEN', 'ADMIN'].includes(session.user.role)) redirect('/login?error=unauthorized')

  return <div className="min-h-screen bg-[#071525] text-white"><header className="border-b border-white/10 bg-[#0b1b2d]"><div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-7"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-sm font-black text-amber-400">KDS</div><div><h1 className="text-lg font-extrabold">Kitchen display</h1><p className="text-xs text-slate-400">Hanya order lunas yang tampil di antrean aktif</p></div></div><LogoutButton className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10" label="Keluar" /></div></header><main className="p-4 sm:p-6">{children}</main></div>
}
