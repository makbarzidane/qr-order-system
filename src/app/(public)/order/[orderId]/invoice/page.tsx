'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatRupiah } from '@/lib/menu-data'
import type { Order } from '@/types'

const labels: Record<string, string> = { CASH: 'Tunai', QRIS: 'QRIS', TRANSFER: 'Transfer bank', DEBIT_EDC: 'Debit / EDC' }

export default function InvoicePage() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/orders/${orderId}`).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal memuat invoice.')
      setOrder(data)
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Gagal memuat invoice.'))
  }, [orderId])

  if (error) return <main className="grid min-h-screen place-items-center bg-slate-100"><p className="text-sm text-red-600">{error}</p></main>
  if (!order) return <main className="grid min-h-screen place-items-center bg-slate-100"><p className="text-sm text-slate-500">Memuat invoice...</p></main>

  const paid = order.paymentStatus === 'PAID'
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <section className="print-sheet mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex flex-col gap-5 border-b-4 border-amber-500 bg-[#0f1f33] px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-400">QR Order Cafe</p><h1 className="mt-2 text-2xl font-black">Invoice pembayaran</h1><p className="mt-1 text-sm text-slate-400">Bukti transaksi digital</p></div><div className="text-left sm:text-right"><span className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-bold ${paid ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>{paid ? 'PAID' : 'UNPAID'}</span><p className="mt-3 text-lg font-black">{order.orderNumber}</p></div></header>
        <div className="p-6 sm:p-8">
          <div className="grid gap-5 border-b border-slate-200 pb-6 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pelanggan</p><p className="mt-1 font-bold text-slate-950">{order.customerName}</p><p className="mt-1 text-sm capitalize text-slate-500">{order.tableId.replace(/-/g, ' ') || '-'}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Waktu transaksi</p><p className="mt-1 text-sm font-semibold text-slate-950">Order: {new Date(order.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p><p className="mt-1 text-sm text-slate-500">Bayar: {order.paidAt ? new Date(order.paidAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'Belum dibayar'}</p></div><div className="sm:text-right"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Nomor antrean</p><p className="mt-1 text-4xl font-black text-amber-600">{order.queueNumber ? `#${order.queueNumber}` : '-'}</p><p className="mt-1 text-sm text-slate-500">{labels[order.paymentMethod] || order.paymentMethod}</p></div></div>
          <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-slate-950 text-left text-xs uppercase tracking-wide text-white"><tr><th className="px-4 py-3">Menu</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 text-right">Harga</th><th className="px-4 py-3 text-right">Jumlah</th></tr></thead><tbody className="divide-y divide-slate-100">{order.items.map((item) => <tr key={item.id}><td className="px-4 py-4"><p className="font-semibold text-slate-950">{item.nameSnapshot}</p>{item.note ? <p className="mt-1 text-xs text-slate-400">{item.note}</p> : null}</td><td className="px-4 py-4 text-center text-slate-600">{item.quantity}</td><td className="px-4 py-4 text-right text-slate-600">{formatRupiah(item.priceSnapshot)}</td><td className="px-4 py-4 text-right font-semibold text-slate-950">{formatRupiah(item.lineTotal)}</td></tr>)}</tbody></table></div>
          <div className="mt-6 ml-auto max-w-sm rounded-2xl border border-slate-200 p-5"><div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>{(order.discountAmount ?? 0) > 0 ? <div className="mt-2 flex justify-between text-sm text-emerald-700"><span>Diskon {order.discountName}</span><span>-{formatRupiah(order.discountAmount ?? 0)}</span></div> : null}<div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-xl font-black text-slate-950"><span>Total</span><span>{formatRupiah(order.total)}</span></div></div>
          <p className="mt-8 text-center text-sm text-slate-500">Terima kasih atas kunjungan Anda. Simpan invoice ini sebagai bukti pembayaran.</p>
        </div>
        <footer className="no-print flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row"><button onClick={() => window.print()} disabled={!paid} className="flex-1 rounded-xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">Print / Simpan PDF</button><Link href={`/order/${orderId}/status`} className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700">Kembali ke status</Link></footer>
      </section>
    </main>
  )
}
