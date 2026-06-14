'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Order } from '@/types'
import { formatRupiah } from '@/lib/menu-data'

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', QRIS: 'QRIS', TRANSFER: 'Transfer Bank', DEBIT_EDC: 'Debit / EDC',
}

const KITCHEN_STATUS_LABEL: Record<string, { text: string; icon: string }> = {
  QUEUED:    { icon: '⏳', text: 'Pesanan diterima, menunggu diproses' },
  PREPARING: { icon: '👨‍🍳', text: 'Sedang dimasak...' },
  READY:     { icon: '🔔', text: 'Pesanan siap! Silakan ambil.' },
  COMPLETED: { icon: '✅', text: 'Selesai' },
}

export default function OrderStatusPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const data: Order = await res.json()
        setOrder(data)
        try { localStorage.setItem('lastOrder', JSON.stringify(data)) } catch { /* ignore */ }
        return
      }
      const fallback = localStorage.getItem('lastOrder')
      if (fallback) {
        const cached: Order = JSON.parse(fallback)
        if (cached.id === orderId) { setOrder(cached); return }
      }
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Order tidak ditemukan di server.')
    } catch {
      try {
        const fallback = localStorage.getItem('lastOrder')
        if (fallback) {
          const cached: Order = JSON.parse(fallback)
          if (cached.id === orderId) { setOrder(cached); return }
        }
      } catch { /* ignore */ }
      setError('Gagal terhubung ke server.')
    } finally { setLoading(false) }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [fetchOrder])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">⏳</div><p className="text-stone-400 text-sm">Memuat status pesanan...</p></div>
    </div>
  )

  if (error || !order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 px-4">
      <p className="text-5xl">😕</p>
      <p className="text-stone-600 text-center text-sm">{error || 'Order tidak ditemukan.'}</p>
      <Link href="/menu/meja-1" className="bg-amber-500 text-white px-5 py-2 rounded-full font-semibold text-sm">Pesan Lagi</Link>
    </div>
  )

  const isPaid = order.paymentStatus === 'PAID'
  const kitchenStatus = KITCHEN_STATUS_LABEL[order.status]

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-stone-900 leading-tight">Status Pesanan</h1>
            <p className="text-xs text-stone-500">{order.orderNumber}</p>
          </div>
          {isPaid && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">✅ Lunas</span>}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        {isPaid ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 text-center">
            <p className="text-5xl mb-3">✅</p>
            <p className="font-bold text-green-800 text-lg">Pembayaran Dikonfirmasi!</p>
            {order.queueNumber != null && (
              <div className="mt-4 bg-white rounded-2xl p-4 inline-block shadow-sm">
                <p className="text-xs text-stone-500 mb-1">Nomor Antrian</p>
                <p className="text-5xl font-black text-amber-600 leading-none">{order.queueNumber}</p>
                <p className="text-xs text-stone-400 mt-1">Simpan nomor ini</p>
              </div>
            )}
            {kitchenStatus && (
              <div className="mt-3 text-sm text-green-700 font-medium">
                {kitchenStatus.icon} {kitchenStatus.text}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-5xl mb-3">⏳</p>
            <p className="font-bold text-amber-800 text-lg">Menunggu Konfirmasi Pembayaran</p>
            <p className="text-sm text-amber-700 mt-2 leading-relaxed">Tunjukkan halaman ini ke kasir.</p>
            <div className="mt-4 bg-white rounded-xl px-4 py-2.5 inline-flex items-center gap-2 shadow-sm">
              <span className="text-xl">{order.paymentMethod === 'CASH' ? '💵' : order.paymentMethod === 'QRIS' ? '📱' : order.paymentMethod === 'TRANSFER' ? '🏦' : '💳'}</span>
              <div className="text-left">
                <p className="text-xs text-stone-400">Metode Bayar</p>
                <p className="font-semibold text-stone-900 text-sm">{METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-900 text-sm">Detail Pesanan</h2>
            <span className="text-xs text-stone-400">👤 {order.customerName}</span>
          </div>
          <div className="space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-stone-600">{item.nameSnapshot}<span className="text-stone-400 ml-1">×{item.quantity}</span></span>
                <span className="font-medium text-stone-900 tabular-nums">{formatRupiah(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 pt-2.5 mt-2.5 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-amber-600 tabular-nums">{formatRupiah(order.total)}</span>
          </div>
        </div>

        {isPaid && (
          <Link href={`/order/${orderId}/invoice`}
            className="flex items-center justify-center gap-2 bg-white border-2 border-amber-500 text-amber-600 font-semibold py-3 rounded-xl hover:bg-amber-50 transition">
            📄 Lihat &amp; Download Invoice
          </Link>
        )}

        <Link href={`/menu/${order.tableId || 'meja-1'}`}
          className="block text-center text-sm text-stone-400 hover:text-stone-600 py-2">
          ← Pesan lagi
        </Link>
      </main>
    </div>
  )
}
