'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { formatRupiah } from '@/lib/menu-data'
import type { PaymentMethod } from '@/types'

const methods: { value: PaymentMethod; label: string; description: string; code: string }[] = [
  { value: 'CASH', label: 'Tunai', description: 'Bayar langsung di kasir', code: 'Rp' },
  { value: 'QRIS', label: 'QRIS', description: 'Scan pembayaran di kasir', code: 'QR' },
  { value: 'TRANSFER', label: 'Transfer bank', description: 'Dikonfirmasi oleh kasir', code: 'TR' },
  { value: 'DEBIT_EDC', label: 'Debit / EDC', description: 'Bayar menggunakan kartu', code: 'DC' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { state, subtotal, clearCart, isHydrated } = useCart()
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [discountCode, setDiscountCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const checked = useRef(false)

  useEffect(() => {
    if (!isHydrated || checked.current) return
    checked.current = true
    if (state.items.length === 0) router.replace('/cart')
  }, [isHydrated, router, state.items.length])

  if (!isHydrated || state.items.length === 0) return <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500">Menyiapkan checkout...</div>

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!customerName.trim()) return setError('Nama pelanggan wajib diisi.')
    if (!paymentMethod) return setError('Pilih metode pembayaran.')

    setSubmitting(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          tableId: state.tableId,
          paymentMethod,
          discountCode: discountCode.trim() || undefined,
          items: state.items,
        }),
      })
      const order = await response.json()
      if (!response.ok) throw new Error(order.error || 'Gagal membuat order.')
      localStorage.setItem('lastOrderId', order.id)
      localStorage.setItem('lastOrder', JSON.stringify(order))
      clearCart()
      await new Promise((resolve) => setTimeout(resolve, 50))
      router.push(`/order/${order.id}/status`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0f1f33] text-white"><div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6"><Link href="/cart" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold">Kembali</Link><div><h1 className="font-extrabold">Checkout</h1><p className="text-xs text-slate-400">Lengkapi informasi pemesan</p></div></div></header>
      <form onSubmit={submit}>
        <main className="mx-auto grid max-w-3xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-950">Informasi pemesan</h2><label className="mt-4 block text-sm font-semibold text-slate-700">Nama pelanggan<input autoFocus value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nama untuk dipanggil" className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" /></label><div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Meja</span><span className="float-right font-bold capitalize text-slate-950">{state.tableId.replace(/-/g, ' ')}</span></div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-950">Metode pembayaran</h2><div className="mt-4 grid gap-3">{methods.map((method) => <label key={method.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${paymentMethod === method.value ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}><input type="radio" name="paymentMethod" className="sr-only" checked={paymentMethod === method.value} onChange={() => setPaymentMethod(method.value)} /><span className={`grid h-10 w-10 place-items-center rounded-lg text-xs font-black ${paymentMethod === method.value ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>{method.code}</span><span className="flex-1"><span className="block text-sm font-bold text-slate-950">{method.label}</span><span className="block text-xs text-slate-500">{method.description}</span></span><span className={`h-4 w-4 rounded-full border-4 ${paymentMethod === method.value ? 'border-amber-500 bg-white' : 'border-slate-300'}`} /></label>)}</div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><label className="text-sm font-bold text-slate-950">Kode promo opsional<input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} placeholder="Contoh: HEMAT10" className="mt-3 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm uppercase outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" /></label><p className="mt-2 text-xs text-slate-500">Promo divalidasi dan dihitung ulang oleh server.</p></section>
          </div>
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24"><h2 className="font-bold text-slate-950">Ringkasan pesanan</h2><div className="mt-4 space-y-3">{state.items.map((item) => <div key={item.menuItem.id} className="flex justify-between gap-4 text-sm"><span className="text-slate-600">{item.quantity} x {item.menuItem.name}</span><span className="font-semibold text-slate-950">{formatRupiah(item.menuItem.price * item.quantity)}</span></div>)}</div><div className="mt-5 flex justify-between border-t border-slate-100 pt-4"><span className="font-bold text-slate-950">Subtotal</span><span className="text-xl font-extrabold text-amber-700">{formatRupiah(subtotal)}</span></div>{error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}</section>
        </main>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-10px_30px_rgba(15,31,51,0.1)]"><button type="submit" disabled={submitting} className="mx-auto block w-full max-w-3xl rounded-xl bg-amber-500 px-5 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60">{submitting ? 'Memproses pesanan...' : `Buat pesanan · ${formatRupiah(subtotal)}`}</button></div>
      </form>
    </div>
  )
}
