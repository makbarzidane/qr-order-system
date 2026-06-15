'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Order } from '@/types'

type KitchenStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'COMPLETED'

const statusConfig: Record<KitchenStatus, { label: string; next?: KitchenStatus; action?: string; badge: string; button: string }> = {
  QUEUED: {
    label: 'Antrean baru',
    next: 'PREPARING',
    action: 'Mulai siapkan',
    badge: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    button: 'border-amber-400/50 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20',
  },
  PREPARING: {
    label: 'Sedang disiapkan',
    next: 'READY',
    action: 'Tandai siap',
    badge: 'border-blue-400/40 bg-blue-400/10 text-blue-300',
    button: 'border-blue-400/50 bg-blue-400/10 text-blue-200 hover:bg-blue-400/20',
  },
  READY: {
    label: 'Siap diambil',
    next: 'COMPLETED',
    action: 'Selesaikan',
    badge: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
    button: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20',
  },
  COMPLETED: {
    label: 'Selesai',
    badge: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
    button: 'border-slate-500/50 bg-slate-500/10 text-slate-300',
  },
}

function elapsedMinutes(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
}

function statusRank(status: string) {
  if (status === 'QUEUED') return 0
  if (status === 'PREPARING') return 1
  if (status === 'READY') return 2
  return 3
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [error, setError] = useState('')

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders?paid=true', { cache: 'no-store' })
      if (!response.ok) throw new Error('Gagal memperbarui antrean kitchen.')
      const data = await response.json()
      const active = Array.isArray(data)
        ? data
            .filter((order: Order) => order.paymentStatus === 'PAID' && order.status !== 'COMPLETED')
            .sort((a: Order, b: Order) => statusRank(a.status) - statusRank(b.status) || (a.queueNumber ?? 9999) - (b.queueNumber ?? 9999))
        : []
      setOrders(active)
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

  const summary = useMemo(() => ({
    queued: orders.filter((order) => order.status === 'QUEUED').length,
    preparing: orders.filter((order) => order.status === 'PREPARING').length,
    ready: orders.filter((order) => order.status === 'READY').length,
  }), [orders])

  async function updateStatus(orderId: string, status: KitchenStatus) {
    setUpdating(orderId)
    setError('')
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', status }),
      })
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
    <div className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Kitchen active queue</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Order aktif</h2>
            <p className="mt-1 text-sm text-slate-400">Satu grid sederhana. Order completed otomatis hilang dari daftar aktif.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"><p className="text-[11px] font-bold uppercase text-slate-500">Aktif</p><p className="text-xl font-black text-amber-300">{orders.length}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"><p className="text-[11px] font-bold uppercase text-slate-500">Queued</p><p className="text-xl font-black text-white">{summary.queued}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"><p className="text-[11px] font-bold uppercase text-slate-500">Preparing</p><p className="text-xl font-black text-white">{summary.preparing}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"><p className="text-[11px] font-bold uppercase text-slate-500">Ready</p><p className="text-xl font-black text-white">{summary.ready}</p></div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">Auto-refresh 4 detik. Terakhir {lastRefresh.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
          <button onClick={fetchOrders} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10">Refresh sekarang</button>
        </div>
      </header>

      {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm font-semibold text-red-200">{error}</p> : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-24 text-center text-sm text-slate-500">Memuat antrean kitchen...</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-24 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5 font-black text-slate-500">KDS</div>
          <h2 className="mt-5 text-xl font-bold text-white">Belum ada order aktif</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Order yang sudah dibayar akan muncul otomatis. Order selesai tidak ditampilkan di papan aktif.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {orders.map((order) => {
            const config = statusConfig[order.status as KitchenStatus] ?? statusConfig.QUEUED
            const next = config.next
            return (
              <article key={order.id} className="flex min-h-[310px] flex-col rounded-2xl border border-white/10 bg-[#0d2034] p-4 shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-4xl font-black leading-none text-amber-400">#{order.queueNumber ?? '-'}</p>
                    <p className="mt-2 font-bold text-white">{order.customerName}</p>
                    <p className="mt-1 text-xs capitalize text-slate-500">{order.tableId.replace(/-/g, ' ') || 'Take away'} · {elapsedMinutes(order.createdAt)} menit</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${config.badge}`}>{config.label}</span>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{new Date(order.createdAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="mt-4 flex-1 space-y-2 border-y border-white/10 py-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-xl bg-white/[0.035] px-3 py-2">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold text-slate-100">{item.nameSnapshot}</span>
                        <span className="font-black text-white">x{item.quantity}</span>
                      </div>
                      {item.note ? <p className="mt-1 text-xs font-medium text-amber-300">Catatan: {item.note}</p> : null}
                    </div>
                  ))}
                </div>

                {next && config.action ? (
                  <button onClick={() => updateStatus(order.id, next)} disabled={updating === order.id} className={`mt-4 min-h-12 w-full rounded-xl border px-4 py-3 text-sm font-extrabold transition disabled:opacity-50 ${config.button}`}>
                    {updating === order.id ? 'Memperbarui...' : config.action}
                  </button>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
