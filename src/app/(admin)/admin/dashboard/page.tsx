import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

const HAS_DB = Boolean(process.env.DATABASE_URL)

async function getStats() {
  if (!HAS_DB) return { menuItems: 0, categories: 0, ordersToday: 0, pendingPayment: 0 }
  const { prisma } = await import('@/lib/prisma')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [menuItems, categories, ordersToday, pendingPayment] = await Promise.all([
    prisma.menuItem.count({ where: { isAvailable: true } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
  ])
  return { menuItems, categories, ordersToday, pendingPayment }
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)
  const stats = await getStats()

  const statCards = [
    { label: 'Menu Aktif',     value: stats.menuItems,     icon: '🍽️', color: 'bg-amber-500' },
    { label: 'Kategori',       value: stats.categories,    icon: '📂', color: 'bg-blue-500' },
    { label: 'Order Hari Ini', value: stats.ordersToday,   icon: '📋', color: 'bg-green-500' },
    { label: 'Menunggu Bayar', value: stats.pendingPayment,icon: '⏳', color: 'bg-yellow-500' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Selamat datang, {session?.user?.name} 👋</h1>
        <p className="text-slate-400 text-sm mt-1">Admin Panel · QR Order System Phase 2</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className={`w-8 h-8 ${card.color} rounded-lg flex items-center justify-center text-sm mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">🧪 Akun Seed (default)</h2>
        <div className="space-y-2">
          {[
            { role: 'ADMIN',   email: 'admin@qrorder.app',   password: 'admin123',   badge: 'bg-purple-900 text-purple-300' },
            { role: 'CASHIER', email: 'cashier@qrorder.app', password: 'cashier123', badge: 'bg-blue-900 text-blue-300' },
            { role: 'KITCHEN', email: 'kitchen@qrorder.app', password: 'kitchen123', badge: 'bg-green-900 text-green-300' },
          ].map(acc => (
            <div key={acc.role} className="flex items-center gap-3 text-sm">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${acc.badge}`}>{acc.role}</span>
              <span className="text-slate-300 font-mono">{acc.email}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400 font-mono">{acc.password}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">Jalankan <code className="text-amber-400 bg-slate-900 px-1 rounded">npm run db:seed</code> untuk membuat akun-akun ini.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/categories" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition">
          <p className="font-semibold text-sm">📂 Kelola Kategori</p>
          <p className="text-xs text-slate-400 mt-1">Tambah &amp; atur kategori menu</p>
        </Link>
        <Link href="/admin/menu" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition">
          <p className="font-semibold text-sm">🍽️ Kelola Menu</p>
          <p className="text-xs text-slate-400 mt-1">Tambah &amp; edit item menu</p>
        </Link>
        <a href="/cashier" target="_blank" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition">
          <p className="font-semibold text-sm">💵 Halaman Kasir</p>
          <p className="text-xs text-slate-400 mt-1">Konfirmasi pembayaran</p>
        </a>
        <a href="/kitchen/display" target="_blank" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition">
          <p className="font-semibold text-sm">🍳 Kitchen Display</p>
          <p className="text-xs text-slate-400 mt-1">Monitor order dapur</p>
        </a>
      </div>
    </div>
  )
}
