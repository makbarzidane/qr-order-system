'use client'

import { useEffect, useState, useCallback } from 'react'
import { Order } from '@/types'
import { formatRupiah } from '@/lib/menu-data'

type KitchenStatus = 'PAID' | 'IN_PROGRESS' | 'READY' | 'DONE'

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-blue-100 border-blue-300 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  READY: 'bg-green-100 border-green-300 text-green-800',
  DONE: 'bg-stone-100 border-stone-300 text-stone-600',
}

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Baru Masuk',
  IN_PROGRESS: 'Dimasak',
  READY: 'Siap',
  DONE: 'Selesai',
}

const NEXT_STATUS: Record<string, KitchenStatus> = {
  PAID: 'IN_PROGRESS',
  IN_PROGRESS: 'READY',
  READY: 'DONE',
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?paid=true')
      if (res.ok) {
        const data: Order[] = await res.json()
        // exclude DONE from active display (keep last 3 done)
        const active = data.filter((o) => o.status !== 'DONE')
        const done = data.filter((o) => o.status === 'DONE').slice(0, 3)
        setOrders([...active, ...done])
        setLastRefresh(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
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
      if (res.ok) {
        const updated: Order = await res.json()
        setOrders((prev) =>
          prev
            .map((o) => (o.id === orderId ? updated : o))
            .filter((o) => {
              if (o.status === 'DONE') return false
              return true
            })
        )
        await fetchOrders()
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const refreshTime = lastRefresh.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Memuat...</p>
      </div>
    )
  }

  const activeOrders = orders.filter((o) => o.status !== 'DONE')
  const doneOrders = orders.filter((o) => o.status === 'DONE')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">{activeOrders.length} order aktif</p>
          <p className="text-gray-600 text-xs">Refresh otomatis setiap 5 detik · {refreshTime}</p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          🔄 Refresh
        </button>
      </div>

      {activeOrders.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium">Tidak ada order aktif</p>
          <p className="text-sm text-gray-600 mt-1">
            Hanya order dengan status PAID yang ditampilkan
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeOrders.map((order) => {
          const statusKey = order.status as KitchenStatus
          const next = NEXT_STATUS[order.status]
          const elapsed = Math.floor(
            (Date.now() - new Date(order.createdAt).getTime()) / 60000
          )

          return (
            <div
              key={order.id}
              className={`border-2 rounded-2xl overflow-hidden ${STATUS_COLORS[statusKey] ?? 'bg-white border-stone-200'}`}
            >
              {/* Card header */}
              <div className="px-4 py-3 flex items-start justify-between">
                <div>
                  <p className="text-2xl font-black">#{order.queueNumber ?? '—'}</p>
                  <p className="font-semibold text-sm">{order.customerName}</p>
                  <p className="text-xs opacity-70">{elapsed} menit lalu</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/60">
                  {STATUS_LABELS[statusKey] ?? order.status}
                </span>
              </div>

              {/* Items */}
              <div className="px-4 pb-3 space-y-1">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="font-medium">{item.nameSnapshot}</span>
                    <span className="font-bold">×{item.quantity}</span>
                  </div>
                ))}
                <p className="text-xs opacity-60 pt-1 font-medium">
                  {formatRupiah(order.total)}
                </p>
              </div>

              {/* Action button */}
              {next && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleStatusUpdate(order.id, next)}
                    disabled={updatingId === order.id}
                    className="w-full bg-white/80 hover:bg-white disabled:opacity-60 text-current font-bold py-2.5 rounded-xl text-sm transition border border-current/20"
                  >
                    {updatingId === order.id
                      ? 'Memproses...'
                      : `→ ${STATUS_LABELS[next]}`}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Done orders */}
      {doneOrders.length > 0 && (
        <div className="mt-8">
          <h2 className="text-gray-500 text-sm font-semibold mb-3">Selesai</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {doneOrders.map((order) => (
              <div
                key={order.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center opacity-60"
              >
                <p className="text-xl font-black text-gray-400">#{order.queueNumber}</p>
                <p className="text-xs text-gray-500">{order.customerName}</p>
                <p className="text-xs text-green-500 font-semibold mt-1">✓ Selesai</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
