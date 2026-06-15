'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Order } from '@/types'
import { formatRupiah } from '@/lib/menu-data'

type KitchenStatus = 'QUEUED' | 'PREPARING' | 'READY'
type NextStatus = 'PREPARING' | 'READY' | 'COMPLETED'

const activeStatuses = new Set<string>(['QUEUED', 'PREPARING', 'READY'])
const methodLabels: Record<string, string> = { CASH: 'Cash', QRIS: 'QRIS', TRANSFER: 'Transfer', DEBIT_EDC: 'Debit' }

const statusConfig: Record<KitchenStatus, { label: string; next: NextStatus; action: string; badge: string; button: string; ring: string }> = {
  QUEUED: {
    label: 'Antrean baru',
    next: 'PREPARING',
    action: 'Mulai siapkan',
    badge: 'border-amber-300/50 bg-amber-300/10 text-amber-200',
    button: 'border-amber-300/45 bg-amber-300 text-slate-950 hover:bg-amber-200',
    ring: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(251,191,36,0.10)]',
  },
  PREPARING: {
    label: 'Sedang disiapkan',
    next: 'READY',
    action: 'Tandai siap',
    badge: 'border-blue-300/50 bg-blue-300/10 text-blue-200',
    button: 'border-blue-300/45 bg-blue-500 text-white hover:bg-blue-400',
    ring: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(96,165,250,0.12)]',
  },
  READY: {
    label: 'Siap diambil',
    next: 'COMPLETED',
    action: 'Selesaikan',
    badge: 'border-emerald-300/50 bg-emerald-300/10 text-emerald-200',
    button: 'border-emerald-300/45 bg-emerald-500 text-white hover:bg-emerald-400',
    ring: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(52,211,153,0.12)]',
  },
}

function elapsedMinutes(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
}

function statusRank(status: string) {
  if (status === 'QUEUED') return 0
  if (status === 'PREPARING') return 1
  if (status === 'READY') return 2
  return 99
}

function normalizeOrders(data: unknown): Order[] {
  if (!Array.isArray(data)) return []
  return data
    .filter((order): order is Order => Boolean(order) && order.paymentStatus === 'PAID' && activeStatuses.has(order.status))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || (a.queueNumber ?? 9999) - (b.queueNumber ?? 9999) || a.createdAt.localeCompare(b.createdAt))
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [error, setError] = useState('')
  const updatingRef = useRef<string | null>(null)

  const fetchOrders = useCallback(async (mode: 'manual' | 'poll' = 'manual') => {
    if (mode === 'poll' && updatingRef.current) return
    try {
      const response = await fetch('/api/orders?paid=true', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui antrean kitchen.')
      setOrders(normalizeOrders(data))
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
    const interval = window.setInterval(() => fetchOrders('poll'), 4000)
    return () => window.clearInterval(interval)
  }, [fetchOrders])

  const summary = useMemo(() => ({
    active: orders.length,
    queued: orders.filter((order) => order.status === 'QUEUED').length,
    preparing: orders.filter((order) => order.status === 'PREPARING').length,
    ready: orders.filter((order) => order.status === 'READY').length,
    items: orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
  }), [orders])

  async function updateStatus(orderId: string, status: NextStatus) {
    setUpdating(orderId)
    updatingRef.current = orderId
    setError('')
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Status gagal diperbarui.')
      setOrders((current) => normalizeOrders(current.map((order) => order.id === orderId ? data : order)))
      await fetchOrders()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Status gagal diperbarui.')
    } finally {
      setUpdating(null)
      updatingRef.current = null
    }
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.20)]">
        <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Kitchen active queue</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">Order aktif</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-400">Hanya menampilkan order PAID dengan status QUEUED, PREPARING, atau READY. Order completed otomatis hilang.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ['Aktif', summary.active, 'text-amber-300'],
              ['Item', summary.items, 'text-white'],
              ['Queued', summary.queued, 'text-amber-200'],
              ['Preparing', summary.preparing, 'text-blue-200'],
              ['Ready', summary.ready, 'text-emerald-200'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
                <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-slate-500">Auto-refresh 4 detik. Terakhir {lastRefresh.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
          <button onClick={() => fetchOrders()} disabled={Boolean(updating)} className="min-h-11 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Refresh sekarang</button>
        </div>
      </header>

      {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm font-bold text-rose-200">{error}</p> : null}

      {loading ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] py-24 text-center text-sm font-bold text-slate-500">Memuat antrean kitchen...</div>
      ) : orders.length === 0 ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] px-6 py-24 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/5 font-black text-slate-500">KDS</div>
          <h2 className="mt-5 text-xl font-black text-white">Belum ada order aktif</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">Order yang sudah dibayar akan muncul otomatis. Order unpaid dan completed tidak ditampilkan.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {orders.map((order) => {
            const status = order.status as KitchenStatus
            const config = statusConfig[status]
            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
            return (
              <article key={order.id} className={`flex min-h-[350px] flex-col rounded-[1.35rem] border border-white/10 bg-[#0b1b2d] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 ${config.ring}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-5xl font-black leading-none tracking-[-0.06em] text-amber-300">#{order.queueNumber ?? '-'}</p>
                    <p className="mt-3 text-lg font-black tracking-[-0.02em] text-white">{order.customerName}</p>
                    <p className="mt-1 text-xs font-bold capitalize text-slate-500">{order.tableId.replace(/-/g, ' ') || 'Take away'} - {elapsedMinutes(order.createdAt)} menit</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${config.badge}`}>{config.label}</span>
                    <p className="mt-2 text-xs font-bold text-slate-500">{new Date(order.createdAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold">
                  <div className="rounded-2xl bg-white/[0.04] px-3 py-2 text-slate-400">Metode<span className="block pt-1 text-sm text-white">{methodLabels[order.paymentMethod] ?? order.paymentMethod}</span></div>
                  <div className="rounded-2xl bg-white/[0.04] px-3 py-2 text-slate-400">Total item<span className="block pt-1 text-sm text-white">{totalItems} item</span></div>
                </div>

                <div className="mt-4 flex-1 space-y-2 border-y border-white/10 py-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white/[0.045] px-3 py-2">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-black text-slate-100">{item.nameSnapshot}</span>
                        <span className="font-black text-white">x{item.quantity}</span>
                      </div>
                      {item.note ? <p className="mt-1 rounded-lg bg-amber-300/10 px-2 py-1 text-xs font-bold text-amber-200">Catatan: {item.note}</p> : null}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-500">{formatRupiah(order.total)}</p>
                  <button onClick={() => updateStatus(order.id, config.next)} disabled={updating === order.id} className={`min-h-12 flex-1 rounded-2xl border px-4 py-3 text-sm font-black shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${config.button}`}>
                    {updating === order.id ? 'Memperbarui...' : config.action}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
