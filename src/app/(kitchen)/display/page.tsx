'use client'

import { useEffect, useState, useCallback } from 'react'
import { Order } from '@/types'
import { formatRupiah } from '@/lib/menu-data'

type KitchenStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'COMPLETED'

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  QUEUED:    { bg: 'bg-blue-950',   border: 'border-blue-700',   text: 'text-blue-100',   label: 'Antrian Baru' },
  PREPARING: { bg: 'bg-yellow-900', border: 'border-yellow-500', text: 'text-yellow-100', label: 'Sedang Dimasak' },
  READY:     { bg: 'bg-green-900',  border: 'border-green-500',  text: 'text-green-100',  label: 'Siap Diambil' },
  COMPLETED: { bg: 'bg-gray-800',   border: 'border-gray-600',   text: 'text-gray-400',   label: 'Selesai' },
}

const NEXT_STATUS: Partial<Record<KitchenStatus, KitchenStatus>> = {
  QUEUED:    'PREPARING',
  PREPARING: 'READY',
  READY:     'COMPLETED',
}

const NEXT_LABEL: Partial<Record<KitchenStatus, string>> = {
  QUEUED:    '▶ Mulai Masak',
  PREPARING: '✓ Siap Diambil',
  READY:     '✓ Selesai',
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [pollCount, setPollCount] = useState(0)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?paid=true')
      if (res.ok) {
        const data: Order[] = await res.json()
        setOrders(data)
        setLastRefresh(new Date())
        setPollCount((n) => n + 1)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 4000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  async function handleStatusUpdate(orderId: string, nextStatus: KitchenStatus) {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', status: nextStatus }),
      })
      if (res.ok) await fetchOrders()
    } finally {
      setUpdatingId(null)
    }
  }

  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED')
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED')

  const refreshTime = lastRefresh.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-200">{activeOrders.length} order aktif</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Refresh setiap 4 detik · terakhir {refreshTime} · #{pollCount}</p>
        </div>
        <button onClick={fetchOrders}
          className="bg-gray-700 hover:bg-gray-600 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          🔄 Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm animate-pulse">Memuat...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && activeOrders.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🍽️</p>
          <p className="font-semibold text-gray-300 text-lg mb-2">Belum ada order masuk</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            Order akan muncul di sini setelah kasir mengkonfirmasi pembayaran (status QUEUED).
          </p>
          <div className="mt-6 bg-gray-800 rounded-xl p-4 inline-block text-left max-w-sm">
            <p className="text-xs text-gray-400 font-semibold mb-2">Cara test demo:</p>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>Buka <code className="text-blue-400">/menu/meja-1</code> di tab lain</li>
              <li>Pilih item → Checkout</li>
              <li>Konfirmasi pembayaran di <code className="text-blue-400">/cashier</code></li>
              <li>Order akan muncul di sini dalam ~4 detik</li>
            </ol>
          </div>
        </div>
      )}

      {/* Active orders grid */}
      {!loading && activeOrders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {activeOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.QUEUED
            const next = NEXT_STATUS[order.status as KitchenStatus]
            const nextLabel = NEXT_LABEL[order.status as KitchenStatus]
            const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)

            return (
              <div key={order.id} className={`rounded-2xl border-2 overflow-hidden ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                <div className="px-4 pt-4 pb-2 flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-black leading-none">#{order.queueNumber ?? '—'}</p>
                    <p className="font-semibold text-sm mt-1">{order.customerName}</p>
                    <p className="text-xs opacity-60">{elapsed} menit lalu</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-black/20 border ${cfg.border}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="px-4 pb-3 mt-1 space-y-1 border-t border-white/10 pt-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="font-medium truncate">{item.nameSnapshot}</span>
                      <span className="font-bold ml-2 flex-shrink-0">×{item.quantity}</span>
                    </div>
                  ))}
                  <p className="text-xs opacity-50 pt-1">{formatRupiah(order.total)}</p>
                </div>
                {next && nextLabel && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handleStatusUpdate(order.id, next)}
                      disabled={updatingId === order.id}
                      className="w-full bg-white/10 hover:bg-white/20 active:scale-[.98] disabled:opacity-50 font-bold py-2.5 rounded-xl text-sm transition border border-white/20"
                    >
                      {updatingId === order.id ? '⏳ ...' : nextLabel}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Completed orders */}
      {!loading && completedOrders.length > 0 && (
        <div>
          <h2 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3">Selesai hari ini</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {completedOrders.map((order) => (
              <div key={order.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-gray-500">#{order.queueNumber}</p>
                <p className="text-xs text-gray-600 truncate">{order.customerName}</p>
                <p className="text-xs text-green-600 font-semibold mt-1">✓ Selesai</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
