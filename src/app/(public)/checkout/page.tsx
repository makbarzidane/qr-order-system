'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { formatRupiah } from '@/lib/menu-data'
import { PaymentMethod } from '@/types'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { value: 'CASH', label: 'Cash', icon: '💵', desc: 'Bayar tunai di kasir' },
  { value: 'QRIS', label: 'QRIS', icon: '📱', desc: 'Scan QR code pembayaran' },
  { value: 'TRANSFER', label: 'Transfer Bank', icon: '🏦', desc: 'Transfer manual dikonfirmasi kasir' },
  { value: 'DEBIT_EDC', label: 'Debit / EDC', icon: '💳', desc: 'Kartu debit via mesin EDC' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { state, subtotal, clearCart, isHydrated } = useCart()
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [nameError, setNameError] = useState('')
  const [methodError, setMethodError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Guard: only redirect AFTER localStorage is hydrated ─────────────────────
  // Doing this in render (the old code) caused immediate redirect because
  // state.items is empty before useEffect hydration runs.
  useEffect(() => {
    if (!isHydrated) return
    if (state.items.length === 0) {
      router.replace('/cart')
    }
  }, [isHydrated, state.items.length, router])

  // ── Loading state ────────────────────────────────────────────────────────────
  if (!isHydrated || state.items.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-3xl mb-3">🛒</p>
          <p className="text-stone-500 text-sm">
            {isHydrated ? 'Cart kosong. Mengarahkan ke Cart...' : 'Memuat...'}
          </p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNameError('')
    setMethodError('')

    let valid = true
    if (!customerName.trim()) {
      setNameError('Nama pelanggan wajib diisi sebelum memilih pembayaran.')
      valid = false
    }
    if (!paymentMethod) {
      setMethodError('Pilih metode pembayaran.')
      valid = false
    }
    if (!valid) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          tableId: state.tableId,
          paymentMethod,
          items: state.items,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal membuat order.')
      }

      const order = await res.json()
      clearCart()
      router.push(`/order/${order.id}/status`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.'
      setNameError(msg)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/cart" className="text-stone-500 hover:text-stone-700 text-sm">
            ← Keranjang
          </Link>
          <h1 className="font-bold text-stone-900">Checkout</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <main className="max-w-md mx-auto px-4 py-4 space-y-4 pb-32">
          {/* Order summary */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
            <h2 className="font-semibold text-stone-900 mb-3 text-sm">Ringkasan Order</h2>
            <div className="space-y-2">
              {state.items.map((ci) => (
                <div key={ci.menuItem.id} className="flex justify-between text-sm">
                  <span className="text-stone-600">
                    {ci.menuItem.name} × {ci.quantity}
                  </span>
                  <span className="font-medium text-stone-900">
                    {formatRupiah(ci.menuItem.price * ci.quantity)}
                  </span>
                </div>
              ))}
              <div className="border-t border-stone-100 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-amber-600">{formatRupiah(subtotal)}</span>
              </div>
            </div>
          </div>

          {/* Customer name — WAJIB */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
            <label className="block">
              <span className="font-semibold text-stone-900 text-sm">
                Nama Pelanggan <span className="text-red-500">*</span>
              </span>
              <p className="text-xs text-stone-500 mt-0.5">
                Nama untuk dipanggil saat pesanan siap.
              </p>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  if (nameError) setNameError('')
                }}
                placeholder="Masukkan nama kamu..."
                autoFocus
                className="mt-2 w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </label>
            {nameError && <p className="mt-1.5 text-xs text-red-500">{nameError}</p>}
          </div>

          {/* Payment method */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
            <h2 className="font-semibold text-stone-900 mb-3 text-sm">
              Metode Pembayaran <span className="text-red-500">*</span>
            </h2>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    paymentMethod === m.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-stone-100 hover:border-stone-200 active:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.value}
                    checked={paymentMethod === m.value}
                    onChange={() => {
                      setPaymentMethod(m.value)
                      if (methodError) setMethodError('')
                    }}
                    className="sr-only"
                  />
                  <span className="text-2xl">{m.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-stone-900 text-sm">{m.label}</p>
                    <p className="text-xs text-stone-500">{m.desc}</p>
                  </div>
                  {paymentMethod === m.value && (
                    <span className="text-amber-500 font-bold text-lg">✓</span>
                  )}
                </label>
              ))}
            </div>
            {methodError && <p className="mt-1.5 text-xs text-red-500">{methodError}</p>}
          </div>
        </main>

        {/* Sticky submit */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-stone-200 shadow-lg p-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full max-w-md mx-auto block bg-amber-500 hover:bg-amber-600 active:scale-[.98] disabled:opacity-60 text-white text-center py-3 rounded-xl font-bold transition"
          >
            {isSubmitting ? 'Memproses...' : `Pesan Sekarang — ${formatRupiah(subtotal)}`}
          </button>
        </div>
      </form>
    </div>
  )
}
