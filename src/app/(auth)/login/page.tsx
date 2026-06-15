'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

const demoAccounts = [
  { role: 'Admin', email: 'admin@qrorder.app', password: 'admin123' },
  { role: 'Kasir', email: 'cashier@qrorder.app', password: 'cashier123' },
  { role: 'Kitchen', email: 'kitchen@qrorder.app', password: 'kitchen123' },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('Email atau password salah, atau akun sedang nonaktif.')
      setLoading(false)
      return
    }
    const session = await fetch('/api/auth/session').then((response) => response.json())
    if (session?.user?.role === 'ADMIN') router.push('/admin')
    else if (session?.user?.role === 'CASHIER') router.push('/cashier')
    else if (session?.user?.role === 'KITCHEN') router.push('/kitchen/display')
    else router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:grid sm:place-items-center sm:p-8">
      <section className="mx-auto grid min-h-[680px] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[0.9fr_1.2fr]">
        <div className="flex flex-col justify-between bg-[#0f1f33] p-8 text-white sm:p-12"><div><div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500 text-2xl font-black text-slate-950">Q</div><p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-amber-400">QR Order System</p><h1 className="mt-4 max-w-md text-4xl font-black leading-tight tracking-[-0.035em]">Operasional cafe dalam satu sistem.</h1><p className="mt-5 max-w-sm text-base leading-7 text-slate-300">Kelola menu, pembayaran, dapur, laporan, dan akses staf dengan alur yang jelas.</p></div><div className="mt-12 border-t border-white/10 pt-6"><p className="text-sm font-semibold">Akses berdasarkan peran</p><p className="mt-2 text-sm text-slate-400">Admin · Kasir · Kitchen</p></div></div>
        <div className="flex items-center p-6 sm:p-12 lg:p-16"><div className="w-full"><h2 className="text-3xl font-black tracking-tight text-slate-950">Masuk ke akun</h2><p className="mt-2 text-sm leading-6 text-slate-500">Gunakan akun staf yang aktif untuk melanjutkan.</p>{searchParams.get('error') === 'unauthorized' ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">Akses ditolak untuk peran akun ini.</p> : null}<form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm font-bold text-slate-700">Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@cafe.id" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" /></label><label className="block text-sm font-bold text-slate-700">Kata sandi<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" /></label>{error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<button disabled={loading} className="w-full rounded-xl bg-amber-500 px-5 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60">{loading ? 'Memeriksa akun...' : 'Masuk'}</button></form><div className="mt-8 border-t border-slate-200 pt-6"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Akun demo</p><div className="mt-3 grid gap-2">{demoAccounts.map((account) => <button key={account.role} type="button" onClick={() => { setEmail(account.email); setPassword(account.password); setError('') }} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-amber-300 hover:bg-amber-50"><span className="text-xs font-bold text-slate-950">{account.role}</span><span className="text-xs text-slate-500">{account.email}</span></button>)}</div></div></div></div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500">Memuat halaman login...</div>}><LoginForm /></Suspense>
}
