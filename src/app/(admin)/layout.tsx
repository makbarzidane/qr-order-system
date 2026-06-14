import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { LogoutButton } from '@/components/LogoutButton'

const NAV = [
  { href: '/admin',            label: '📊 Dashboard' },
  { href: '/admin/categories', label: '📂 Kategori' },
  { href: '/admin/menu',       label: '🍽️ Menu' },
  { href: '/admin/users',      label: '👥 Pengguna' },
]

const QUICK_LINKS = [
  { href: '/cashier',          label: '💵 Kasir',    external: true },
  { href: '/kitchen/display',  label: '🍳 Kitchen',  external: true },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user?.role !== 'ADMIN') redirect('/login?error=unauthorized')

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="text-xl">☕</div>
          <p className="font-bold text-sm mt-1">QR Order</p>
          <p className="text-xs text-amber-400 font-semibold">Admin Panel</p>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              {item.label}
            </Link>
          ))}

          <div className="border-t border-slate-800 mt-2 pt-2">
            <p className="text-xs text-slate-600 px-3 py-1 uppercase tracking-wider">Akses Cepat</p>
            {QUICK_LINKS.map(item => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                {item.label} ↗️
              </a>
            ))}
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-1 truncate">{session.user?.email}</p>
          <LogoutButton className="w-full text-left text-xs text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg transition" label="🚪 Logout" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
