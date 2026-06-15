'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatRupiah } from '@/lib/menu-data'
import type { Order } from '@/types'

const methodLabels: Record<string, string> = { CASH: 'Tunai', QRIS: 'QRIS', TRANSFER: 'Transfer', DEBIT_EDC: 'Debit / EDC' }

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
}

export default function CashierPaymentsPage() {
  const [pending, setPending] = useState<Order[]>([])
  const [recent, setRecent] = useState<Order[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchOrders = useCallback(async () => {
    try {
      const [pendingResponse, recentResponse] = await Promise.all([fetch('/api/orders?status=PENDING_PAYMENT'), fetch('/api/orders?paid=true')])
      if (!pendingResponse.ok || !recentResponse.ok) throw new Error('Gagal memperbarui daftar pembayaran.')
      const [pendingData, recentData] = await Promise.all([pendingResponse.json(), recentResponse.json()])
      const nextPending = Array.isArray(pendingData) ? pendingData : []
      setPending(nextPending)
      setRecent(Array.isArray(recentData) ? recentData.slice(0, 8) : [])
      setSelectedId((current) => current && nextPending.some((order) => order.id === current) ? current : nextPending[0]?.id ?? null)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memperbarui data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = window.setInterval(fetchOrders, 5000)
    return () => window.clearInterval(interval)
  }, [fetchOrders])

  const selected = useMemo(() => pending.find((order) => order.id === selectedId) ?? null, [pending, selectedId])

  async function confirmPayment(orderId: string) {
    setConfirming(orderId)
    setError('')
    try {
      const response = await fetch(`/api/orders/${orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirm_payment' }) })
      const order = await response.json()
      if (!response.ok) throw new Error(order.error || 'Pembayaran gagal dikonfirmasi.')
      setMessage(`Pembayaran dikonfirmasi. Nomor antrean #${order.queueNumber}.`)
      window.setTimeout(() => setMessage(''), 4000)
      await fetchOrders()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pembayaran gagal dikonfirmasi.')
    } finally {
      setConfirming(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black tracking-tight text-slate-950">Konfirmasi pembayaran</h2><p className="mt-1 text-sm text-slate-500">Pilih order, periksa detail, lalu konfirmasi satu kali.</p></div><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Auto-refresh 5 detik</div></div>
      {message ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Memuat pembayaran...</div> : pending.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 font-black text-emerald-600">OK</div><h3 className="mt-4 font-bold text-slate-950">Tidak ada pembayaran tertunda</h3><p className="mt-1 text-sm text-slate-500">Order baru akan muncul otomatis.</p></div> : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h3 className="font-bold text-slate-950">Antrean pembayaran</h3><p className="mt-1 text-xs text-slate-500">{pending.length} order menunggu konfirmasi</p></div><div className="divide-y divide-slate-100">{pending.map((order) => <button key={order.id} onClick={() => setSelectedId(order.id)} className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 ${selectedId === order.id ? 'bg-amber-50 ring-1 ring-inset ring-amber-400' : ''}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">{pending.indexOf(order) + 1}</span><span className="min-w-0"><span className="block truncate font-bold text-slate-950">{order.customerName}</span><span className="mt-1 block text-xs text-slate-500">{order.orderNumber} · {order.tableId || 'Take away'} · {formatTime(order.createdAt)}</span></span><span className="text-right"><span className="block font-extrabold text-slate-950">{formatRupiah(order.total)}</span><span className="mt-1 block text-xs font-semibold text-amber-700">{methodLabels[order.paymentMethod]}</span></span></button>)}</div></section>
          {selected ? <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Detail pembayaran</p><h3 className="mt-1 text-xl font-black text-slate-950">{selected.orderNumber}</h3></div><span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{methodLabels[selected.paymentMethod]}</span></div><dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm"><div><dt className="text-xs text-slate-500">Pelanggan</dt><dd className="mt-1 font-bold text-slate-950">{selected.customerName}</dd></div><div><dt className="text-xs text-slate-500">Meja</dt><dd className="mt-1 font-bold capitalize text-slate-950">{selected.tableId.replace(/-/g, ' ') || '-'}</dd></div></dl><div className="mt-5 space-y-3">{selected.items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><div><p className="font-semibold text-slate-700">{item.quantity} x {item.nameSnapshot}</p>{item.note ? <p className="mt-0.5 text-xs text-slate-400">{item.note}</p> : null}</div><span className="font-semibold text-slate-950">{formatRupiah(item.lineTotal)}</span></div>)}</div><div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4"><span className="font-bold text-slate-950">Total</span><span className="text-2xl font-black text-emerald-700">{formatRupiah(selected.total)}</span></div><button onClick={() => confirmPayment(selected.id)} disabled={confirming === selected.id} className="mt-5 w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-emerald-500 disabled:opacity-60">{confirming === selected.id ? 'Memproses...' : 'Konfirmasi pembayaran'}</button><p className="mt-3 text-center text-xs leading-5 text-slate-400">Konfirmasi akan membuat nomor antrean dan mengirim order ke kitchen.</p></aside> : null}
        </div>
      )}

      {recent.length ? <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h3 className="font-bold text-slate-950">Transaksi lunas terbaru</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Antrean</th><th className="px-5 py-3">Order</th><th className="px-5 py-3">Pelanggan</th><th className="px-5 py-3">Metode</th><th className="px-5 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{recent.map((order) => <tr key={order.id}><td className="px-5 py-4 font-black text-emerald-700">#{order.queueNumber}</td><td className="px-5 py-4 font-semibold text-slate-950">{order.orderNumber}</td><td className="px-5 py-4 text-slate-600">{order.customerName}</td><td className="px-5 py-4 text-slate-600">{methodLabels[order.paymentMethod]}</td><td className="px-5 py-4 text-right font-semibold text-slate-950">{formatRupiah(order.total)}</td></tr>)}</tbody></table></div></section> : null}
    </div>
  )
}
