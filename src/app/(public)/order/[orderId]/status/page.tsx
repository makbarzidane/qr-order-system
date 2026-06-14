'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Order } from '@/types'
import { formatRupiah } from '@/lib/menu-data'

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  QRIS: 'QRIS',
  TRANSFER: 'Transfer Bank',
  DEBIT_EDC: 'Debit / EDC',
}

const KITCHEN_STATUS_LABEL: Record<string, string> = {
  PAID: 'Pesanan diterima, menunggu diproses',
  IN_PROGRESS: '⏳ Sedang dimasak...',
  READY: '✅ Pesanan siap! Silakan ambil.',
  DONE: '✅ Selesai',
}

export default function OrderStatusPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Order tidak ditemukan.')
        return
      }
      setOrder(await res.json())
    } catch {
      setError('Gagal memuat order.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
    // Poll every 5s to reflect kitchen updates
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [fetchOrder])

  // Demo: simulate cashier confirming payment
  async function handleDemoConfirm() {
    setConfirming(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_payment' }),
      })
      if (res.ok) {
        setOrder(await res.json())
      }
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-500">Memuat...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 px-4">
        <p className="text-5xl">😕</p>
        <p className="text-stone-600">{error || 'Order tidak ditemukan.'}</p>
        <Link href="/menu/meja-1" className="text-amber-600 font-semibold">
          Kembali ke Menu
        </Link>
      </div>
    )
  }

  const isPaid = order.paymentStatus === 'PAID'

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="font-bold text-stone-900">Status Pesanan</h1>
          <p className="text-xs text-stone-500">{order.orderNumber}</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Status badge */}
        {isPaid ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="text-5xl mb-3">✅</p>
            <p className="font-bold text-green-800 text-lg">Pembayaran Dikonfirmasi!</p>
            {order.queueNumber && (
              <div className="mt-3 bg-white rounded-xl p-4 inline-block">
                <p className="text-xs text-stone-500">Nomor Antrian</p>
                <p className="text-5xl font-black text-amber-600">{order.queueNumber}</p>
              </div>
            )}
            {order.status && KITCHEN_STATUS_LABEL[order.status] && (
              <p className="mt-3 text-sm text-green-700 font-medium">
                {KITCHEN_STATUS_LABEL[order.status]}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-5xl mb-3">⏳</p>
            <p className="font-bold text-amber-800 text-lg">Menunggu Konfirmasi Kasir</p>
            <p className="text-sm text-amber-700 mt-1">
              Tunjukkan order ini ke kasir untuk konfirmasi pembayaran.
            </p>
            <div className="mt-4 bg-white rounded-xl p-3">
              <p className="text-xs text-stone-500">Metode Bayar</p>
              <p className="font-semibold text-stone-900">{METHOD_LABELS[order.paymentMethod]}</p>
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
          <h2 className="font-semibold text-stone-900 mb-3 text-sm">Detail Pesanan</h2>
          <p className="text-xs text-stone-500 mb-2">👤 {order.customerName}</p>
          <div className="space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-stone-600">
                  {item.nameSnapshot} × {item.quantity}
                </span>
                <span className="font-medium text-stone-900">
                  {formatRupiah(item.lineTotal)}
                </span>
              </div>
            ))}
            <div className="border-t border-stone-100 pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-amber-600">{formatRupiah(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Invoice link (only after PAID) */}
        {isPaid && (
          <Link
            href={`/order/${orderId}/invoice`}
            className="flex items-center justify-center gap-2 bg-white border-2 border-amber-500 text-amber-600 font-semibold py-3 rounded-xl hover:bg-amber-50 transition"
          >
            📄 Lihat Invoice
          </Link>
        )}

        {/* DEMO: Simulasi kasir konfirmasi — only show for UNPAID */}
        {!isPaid && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-xs text-yellow-700 font-semibold mb-2">
              🧪 Demo Mode — Simulasi Kasir
            </p>
            <p className="text-xs text-yellow-600 mb-3">
              Tombol ini mensimulasikan kasir mengkonfirmasi pembayaran. Akan dihapus saat kasir panel dibangun.
            </p>
            <button
              onClick={handleDemoConfirm}
              disabled={confirming}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition"
            >
              {confirming ? 'Memproses...' : '✓ Tandai Sudah Bayar (Demo)'}
            </button>
          </div>
        )}

        <Link
          href={`/menu/${order.tableId || 'meja-1'}`}
          className="block text-center text-sm text-stone-500 hover:text-stone-700"
        >
          ← Kembali ke Menu
        </Link>
      </main>
    </div>
  )
}
