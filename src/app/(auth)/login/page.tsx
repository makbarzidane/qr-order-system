'use client'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  const errorParam = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('Email atau password salah.')
      setLoading(false)
    } else {
      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()
      const role = session?.user?.role
      if (role === 'ADMIN') router.push('/admin')
      else if (role === 'CASHIER') router.push('/cashier')
      else if (role === 'KITCHEN') router.push('/kitchen/display')
      else router.push('/')
    }
  }

  function fillDemo(e: string, p: string) {
    setEmail(e)
    setPassword(p)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">☕</div>
          <h1 className="text-2xl font-bold text-stone-900">QR Order System</h1>
          <p className="text-stone-500 text-sm mt-1">Masuk ke dasbor staff</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          {errorParam === 'unauthorized' && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              Akses ditolak. Anda tidak memiliki izin untuk halaman tersebut.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@qrorder.app"
                required
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[.98] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition"
            >
              {loading ? '⏳ Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-4">
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="w-full text-center text-xs text-stone-400 hover:text-stone-600 py-2 transition"
          >
            {showDemo ? '▲ Sembunyikan' : '▼ Lihat akun demo'}
          </button>
          {showDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-800 mb-3">🧪 Akun Demo</p>
              {[
                { role: 'Admin', email: 'admin@qrorder.app', password: 'admin123', color: 'bg-purple-100 text-purple-800' },
                { role: 'Kasir', email: 'cashier@qrorder.app', password: 'cashier123', color: 'bg-blue-100 text-blue-800' },
                { role: 'Dapur', email: 'kitchen@qrorder.app', password: 'kitchen123', color: 'bg-green-100 text-green-800' },
              ].map(acc => (
                <button
                  key={acc.role}
                  onClick={() => fillDemo(acc.email, acc.password)}
                  className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 text-left hover:bg-amber-100 transition"
                >
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${acc.color}`}>{acc.role}</span>
                  <span className="text-xs text-stone-500 font-mono">{acc.email}</span>
                </button>
              ))}
              <p className="text-xs text-amber-700 mt-2">Klik akun untuk mengisi form otomatis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-stone-400">Memuat...</p></div>}>
      <LoginForm />
    </Suspense>
  )
}
