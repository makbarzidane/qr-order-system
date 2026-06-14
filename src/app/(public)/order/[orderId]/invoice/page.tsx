'use client'

import { useEffect, useState } from 'react'
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

export default function InvoicePage() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else if (data.paymentStatus !== 'PAID') {
          setError('Invoice hanya tersedia setelah pembayaran dikonfirmasi.')
        } else {
          setOrder(data)
        }
      })
      .catch(() => setError('Gagal memuat invoice.'))
      .finally(() => setLoading(false))
  }, [orderId])

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
        <p className="text-5xl">🔒</p>
        <p className="text-stone-600 text-center">{error || 'Invoice tidak tersedia.'}</p>
        <Link href={`/order/${orderId}/status`} className="text-amber-600 font-semibold">
          Lihat Status Order
        </Link>
      </div>
    )
  }

  const paidDate = order.paidAt
    ? new Date(order.paidAt).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '-'

  return (
    <div className="min-h-screen bg-stone-100 flex items-start justify-center py-8 px-4">
      <div
        id="invoice"
        className="bg-white w-full max-w-sm rounded-2xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-amber-500 px-6 py-5 text-white text-center">
          <p className="text-2xl font-black tracking-tight">☕ QR Order</p>
          <p className="text-xs opacity-80 mt-0.5">Terima kasih sudah memesan!</p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Invoice meta */}
          <div className="flex justify-between text-xs text-stone-500 border-b border-dashed border-stone-200 pb-3">
            <div>
              <p className="font-semibold text-stone-700">{order.orderNumber}</p>
              <p>{paidDate}</p>
            </div>
            <div className="text-right">
              {order.queueNumber && (
                <div>
                  <p>Antrian</p>
                  <p className="text-2xl font-black text-amber-500 leading-none">
                    {order.queueNumber}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer */}
          <div className="text-sm">
            <p className="text-stone-500 text-xs">Pelanggan</p>
            <p className="font-semibold text-stone-900">{order.customerName}</p>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs text-stone-500 mb-2">Pesanan</p>
            <div className="space-y-1.5">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <span className="text-stone-800">{item.nameSnapshot}</span>
                    <span className="text-stone-400 ml-1">× {item.quantity}</span>
                  </div>
                  <span className="font-medium text-stone-900">
                    {formatRupiah(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-dashed border-stone-200 pt-3">
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-amber-600">{formatRupiah(order.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>Pembayaran</span>
              <span>{METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
            </div>
          </div>

          {/* Status */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
            <p className="text-green-700 font-semibold text-sm">✅ Lunas</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 text-center">
          <p className="text-xs text-stone-400">
            Simpan struk ini sebagai bukti pembayaran.
          </p>
          <button
            onClick={() => window.print()}
            className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-semibold text-sm transition"
          >
            🖨️ Print / Simpan PDF
          </button>
        </div>
      </div>

      <div className="fixed bottom-4 left-0 right-0 text-center">
        <Link
          href={`/order/${orderId}/status`}
          className="text-sm text-stone-500 hover:text-stone-700 bg-white px-4 py-2 rounded-full shadow"
        >
          ← Kembali ke Status
        </Link>
      </div>
    </div>
  )
}
