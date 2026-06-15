'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { formatRupiah } from '@/lib/menu-data'
import type { Order } from '@/types'

const methods: Record<string, string> = { CASH: 'Tunai', QRIS: 'QRIS', TRANSFER: 'Transfer bank', DEBIT_EDC: 'Debit / EDC' }
const steps = ['QUEUED', 'PREPARING', 'READY', 'COMPLETED'] as const
const stepLabels = ['Diterima', 'Disiapkan', 'Siap diambil', 'Selesai']

export default function OrderStatusPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        localStorage.setItem('lastOrder', JSON.stringify(data))
        return
      }
      const cached = localStorage.getItem('lastOrder')
      if (cached) {
        const data = JSON.parse(cached) as Order
        if (data.id === orderId) return setOrder(data)
      }
      const data = await response.json().catch(() => ({}))
      setError(data.error || 'Pesanan tidak ditemukan.')
    } catch {
      setError('Gagal terhubung ke server.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
    const interval = window.setInterval(fetchOrder, 5000)
    return () => window.clearInterval(interval)
  }, [fetchOrder])

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500">Memuat status pesanan...</div>
  if (!order || error) return <div className="grid min-h-screen place-items-center bg-slate-100 px-4"><div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><h1 className="font-bold text-slate-950">Pesanan tidak tersedia</h1><p className="mt-2 text-sm text-slate-500">{error}</p><Link href="/menu/meja-1" className="mt-5 inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950">Kembali ke menu</Link></div></div>

  const paid = order.paymentStatus === 'PAID'
  const activeStep = paid ? Math.max(0, steps.indexOf(order.status as typeof steps[number])) : -1

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-800 bg-[#0f1f33] text-white"><div className="mx-auto max-w-2xl px-4 py-5 sm:px-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Status pesanan</p><div className="mt-1 flex items-end justify-between gap-4"><div><h1 className="text-xl font-extrabold">{order.orderNumber}</h1><p className="mt-1 text-sm text-slate-400">{order.customerName} · {order.tableId.replace(/-/g, ' ')}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${paid ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>{paid ? 'Lunas' : 'Belum dibayar'}</span></div></div></header>
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
        <section className={`rounded-3xl border p-6 text-center shadow-sm ${paid ? 'border-emerald-200 bg-white' : 'border-amber-200 bg-amber-50'}`}>
          {paid ? <><p className="text-sm font-semibold text-slate-500">Nomor antrean Anda</p><p className="mt-2 text-6xl font-black tracking-tight text-amber-600">#{order.queueNumber}</p><p className="mt-3 text-sm text-slate-600">Pantau progres pesanan pada halaman ini.</p></> : <><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500 font-black text-slate-950">Rp</div><h2 className="mt-4 text-xl font-extrabold text-slate-950">Menunggu konfirmasi pembayaran</h2><p className="mt-2 text-sm text-slate-600">Tunjukkan nomor order kepada kasir. Metode: <strong>{methods[order.paymentMethod]}</strong>.</p></>}
        </section>

        {paid ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-950">Progres dapur</h2><div className="mt-5 grid grid-cols-4 gap-2">{stepLabels.map((label, index) => <div key={label} className="text-center"><div className={`mx-auto grid h-10 w-10 place-items-center rounded-full border-4 text-xs font-black ${index <= activeStep ? 'border-amber-500 bg-[#0f1f33] text-white' : 'border-slate-200 bg-white text-slate-400'}`}>{index + 1}</div><p className={`mt-2 text-[11px] font-semibold sm:text-xs ${index <= activeStep ? 'text-slate-950' : 'text-slate-400'}`}>{label}</p></div>)}</div></section> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-950">Ringkasan pesanan</h2><span className="text-xs text-slate-500">{methods[order.paymentMethod]}</span></div><div className="mt-4 space-y-3">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><div><p className="font-semibold text-slate-700">{item.quantity} x {item.nameSnapshot}</p>{item.note ? <p className="mt-0.5 text-xs text-slate-400">Catatan: {item.note}</p> : null}</div><span className="font-semibold text-slate-950">{formatRupiah(item.lineTotal)}</span></div>)}</div><div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>{(order.discountAmount ?? 0) > 0 ? <div className="flex justify-between text-emerald-700"><span>Diskon {order.discountName}</span><span>-{formatRupiah(order.discountAmount ?? 0)}</span></div> : null}<div className="flex justify-between text-lg font-extrabold text-slate-950"><span>Total</span><span>{formatRupiah(order.total)}</span></div></div></section>

        <div className="grid gap-3 sm:grid-cols-2">{paid ? <Link href={`/order/${orderId}/invoice`} className="rounded-xl bg-amber-500 px-5 py-3 text-center text-sm font-extrabold text-slate-950">Lihat invoice</Link> : null}<Link href={`/menu/${order.tableId || 'meja-1'}`} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700">Pesan lagi</Link></div>
      </main>
    </div>
  )
}
