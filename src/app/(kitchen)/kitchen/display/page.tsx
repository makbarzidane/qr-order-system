'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Order } from '@/types'

type KitchenStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'COMPLETED'
const columns: { status: KitchenStatus; label: string; action: string; next: KitchenStatus; accent: string }[] = [
  { status: 'QUEUED', label: 'Antrean baru', action: 'Mulai siapkan', next: 'PREPARING', accent: 'amber' },
  { status: 'PREPARING', label: 'Sedang disiapkan', action: 'Tandai siap', next: 'READY', accent: 'blue' },
  { status: 'READY', label: 'Siap diambil', action: 'Selesaikan', next: 'COMPLETED', accent: 'green' },
]

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [error, setError] = useState('')

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders?paid=true')
      if (!response.ok) throw new Error('Gagal memperbarui antrean kitchen.')
      const data = await response.json()
      setOrders(Array.isArray(data) ? data.filter((order) => order.paymentStatus === 'PAID' && order.status !== 'COMPLETED') : [])
      setLastRefresh(new Date())
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memperbarui antrean.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = window.setInterval(fetchOrders, 4000)
    return () => window.clearInterval(interval)
  }, [fetchOrders])

  const grouped = useMemo(() => Object.fromEntries(columns.map((column) => [column.status, orders.filter((order) => order.status === column.status)])) as Record<KitchenStatus, Order[]>, [orders])

  async function updateStatus(orderId: string, status: KitchenStatus) {
    setUpdating(orderId)
    try {
      const response = await fetch(`/api/orders/${orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_status', status }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Status gagal diperbarui.')
      await fetchOrders()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Status gagal diperbarui.')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Order aktif</p><p className="mt-1 text-3xl font-black text-amber-400">{orders.length}</p></div><div className="h-12 w-px bg-white/10" /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Terakhir diperbarui</p><p className="mt-1 text-lg font-bold text-white">{lastRefresh.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}</p></div></div><button onClick={fetchOrders} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10">Refresh sekarang</button></div>
      {error ? <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm font-semibold text-red-200">{error}</p> : null}
      {loading ? <div className="py-24 text-center text-sm text-slate-500">Memuat antrean kitchen...</div> : orders.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-24 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5 font-black text-slate-500">KDS</div><h2 className="mt-5 text-xl font-bold text-white">Belum ada order aktif</h2><p className="mt-2 text-sm text-slate-500">Order lunas akan muncul otomatis dalam beberapa detik.</p></div> : (
        <div className="grid gap-4 xl:grid-cols-3">
          {columns.map((column) => <section key={column.status} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025]"><header className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${column.accent === 'green' ? 'bg-emerald-400' : column.accent === 'blue' ? 'bg-blue-400' : 'bg-amber-400'}`} /><h2 className="font-extrabold text-white">{column.label}</h2></div><span className="grid h-8 min-w-8 place-items-center rounded-lg bg-white/10 px-2 text-sm font-black text-white">{grouped[column.status].length}</span></header><div className="space-y-3 p-3">{grouped[column.status].length ? grouped[column.status].map((order) => { const elapsed = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)); return <article key={order.id} className="rounded-xl border border-white/10 bg-[#0d2034] p-4 shadow-lg"><div className="flex items-start justify-between gap-4"><div><p className="text-3xl font-black text-amber-400">#{order.queueNumber}</p><p className="mt-1 font-bold text-white">{order.customerName}</p><p className="mt-1 text-xs capitalize text-slate-500">{order.tableId.replace(/-/g, ' ')} · {elapsed} menit</p></div><p className="text-xs font-semibold text-slate-500">{new Date(order.createdAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}</p></div><div className="mt-4 space-y-2 border-y border-white/10 py-4">{order.items.map((item) => <div key={item.id}><div className="flex justify-between gap-3 text-sm"><span className="font-semibold text-slate-100">{item.nameSnapshot}</span><span className="font-black text-white">x{item.quantity}</span></div>{item.note ? <p className="mt-1 text-xs font-medium text-amber-300">Catatan: {item.note}</p> : null}</div>)}</div><button onClick={() => updateStatus(order.id, column.next)} disabled={updating === order.id} className={`mt-4 w-full rounded-xl border px-4 py-3 text-sm font-extrabold transition disabled:opacity-50 ${column.accent === 'green' ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20' : column.accent === 'blue' ? 'border-blue-400/50 bg-blue-400/10 text-blue-300 hover:bg-blue-400/20' : 'border-amber-400/50 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'}`}>{updating === order.id ? 'Memperbarui...' : column.action}</button></article> }) : <p className="py-12 text-center text-sm text-slate-600">Tidak ada order</p>}</div></section>)}
        </div>
      )}
    </div>
  )
}
