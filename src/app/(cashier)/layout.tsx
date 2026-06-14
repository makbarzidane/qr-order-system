import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { LogoutButton } from '@/components/LogoutButton'

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const role = session.user?.role
  if (role !== 'CASHIER' && role !== 'ADMIN') redirect('/login?error=unauthorized')

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-stone-900">💵 Kasir Dashboard</h1>
            <p className="text-xs text-stone-500">{session.user?.name} · {session.user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/kitchen/display" target="_blank" className="text-xs text-slate-500 hover:text-slate-700 transition">🍳 Kitchen ↗</a>
            <LogoutButton className="text-sm text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition" label="Logout" />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
