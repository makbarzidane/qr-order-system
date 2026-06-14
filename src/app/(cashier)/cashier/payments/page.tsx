'use client'
import { useEffect, useState, useCallback } from 'react'
import { Order } from '@/types'
import { formatRupiah } from '@/lib/menu-data'

export default function CashierPaymentsPage() {
  const [pending, setPending] = useState<Order[]>([])
  const [recent, setRecent] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchOrders = useCallback(async () => {
    try {
      const [pendingRes, recentRes] = await Promise.all([
        fetch('/api/orders?status=PENDING_PAYMENT'),
        fetch('/api/orders?paid=true'),
      ])
      const [pendingData, recentData] = await Promise.all([pendingRes.json(), recentRes.json()])
      setPending(Array.isArray(pendingData) ? pendingData : [])
      setRecent(Array.isArray(recentData) ? recentData.slice(0, 8) : [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  async function handleConfirm(orderId: string) {
    setConfirming(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_payment' }),
      })
      if (res.ok) {
        const order: Order = await res.json()
        setSuccessMsg(`✅ Pembayaran #${order.queueNumber} (${order.customerName}) dikonfirmasi!`)
        setTimeout(() => setSuccessMsg(''), 4000)
        await fetchOrders()
      }
    } finally { setConfirming(null) }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
  }

  const METHOD_ICON: Record<string, string> = { CASH: '💵', QRIS: '📱', TRANSFER: '🏦', DEBIT_EDC: '💳' }
  const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', QRIS: 'QRIS', TRANSFER: 'Transfer', DEBIT_EDC: 'Debit/EDC' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-stone-900">
          Konfirmasi Pembayaran
          {pending.length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span className="text-xs text-stone-500">Auto-refresh 5s</span>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Pending payments */}
      {loading ? (
        <p className="text-stone-400 text-sm animate-pulse">Memuat...</p>
      ) : pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 text-center mb-8">
          <p className="text-4xl mb-3">💵</p>
          <p className="font-semibold text-stone-700">Tidak ada order menunggu bayar</p>
          <p className="text-sm text-stone-400 mt-1">Order baru akan muncul otomatis di sini</p>
        </div>
      ) : (
        <div className="space-y-4 mb-10">
          {pending.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-stone-900">{order.orderNumber}</p>
                  <p className="text-sm text-stone-600 mt-0.5">👤 {order.customerName}</p>
                  {order.tableId && <p className="text-xs text-stone-400">📍 {order.tableId}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-400">{formatTime(order.createdAt)}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-base">{METHOD_ICON[order.paymentMethod] ?? '💰'}</span>
                    <span className="text-sm font-semibold text-stone-700">{METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-stone-50 rounded-xl p-3 mb-3 space-y-1">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-stone-600">{item.nameSnapshot} <span className="text-stone-400">×{item.quantity}</span></span>
                    <span className="font-medium tabular-nums">{formatRupiah(item.lineTotal)}</span>
                  </div>
                ))}
                <div className="border-t border-stone-200 pt-2 mt-1 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-amber-600">{formatRupiah(order.total)}</span>
                </div>
              </div>

              <button
                onClick={() => handleConfirm(order.id)}
                disabled={confirming === order.id}
                className="w-full bg-green-500 hover:bg-green-600 active:scale-[.98] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition">
                {confirming === order.id ? '⏳ Memproses...' : '✓ Konfirmasi Pembayaran'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recent paid */}
      {recent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Sudah Lunas (terakhir)</h3>
          <div className="space-y-2">
            {recent.map(order => (
              <div key={order.id} className="bg-white rounded-xl border border-stone-100 px-4 py-3 flex items-center gap-3">
                <span className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700">{order.queueNumber ?? '-'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900">{order.customerName}</p>
                  <p className="text-xs text-stone-400">{order.orderNumber} · {formatTime(order.createdAt)}</p>
                </div>
                <span className="text-sm font-semibold text-stone-700 tabular-nums">{formatRupiah(order.total)}</span>
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">✅ Lunas</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
