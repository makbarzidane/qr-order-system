import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const HAS_DB = !!"placeholder"

const ROLE_BADGE: Record<string, string> = {
  ADMIN:   'bg-purple-900 text-purple-300',
  CASHIER: 'bg-blue-900 text-blue-300',
  KITCHEN: 'bg-green-900 text-green-300',
}

async function getUsers() {
  if (!HAS_DB) return []
  const { prisma } = await import('@/lib/prisma')
  return prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  })
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  const users = await getUsers()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">👥 Pengguna</h1>
        <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
          {users.length} pengguna
        </span>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 mb-6 text-sm text-amber-300">
        📝 User management (create/edit/delete) tersedia di <strong>Phase 3</strong>. Halaman ini read-only.
      </div>

      {!HAS_DB ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">🗄️</p>
          <p className="text-slate-400 text-sm">Database tidak terkonfigurasi.</p>
          <p className="text-slate-500 text-xs mt-2">Set DATABASE_URL dan jalankan <code className="text-amber-400">npm run db:seed</code></p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-400 text-sm">Belum ada user.</p>
          <p className="text-slate-500 text-xs mt-2">Jalankan <code className="text-amber-400">npm run db:seed</code> untuk membuat akun demo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div key={user.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-slate-300">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ROLE_BADGE[user.role] ?? 'bg-slate-700 text-slate-300'}`}>
                {user.role}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${user.isActive ? 'text-green-400' : 'text-slate-500'}`}>
                {user.isActive ? '● Aktif' : '○ Nonaktif'}
              </span>
              {session?.user?.email === user.email && (
                <span className="text-xs text-amber-400 font-semibold">(kamu)</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
