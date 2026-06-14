'use client'

import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { formatRupiah } from '@/lib/menu-data'

export default function CartPage() {
  const { state, updateQty, removeItem, subtotal, isHydrated } = useCart()
  const tableId = state.tableId || 'meja-1'

  // ── Loading skeleton — don't flash "empty cart" before localStorage is read ──
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <span className="text-stone-500">← Menu</span>
            <h1 className="font-bold text-stone-900">Keranjang</h1>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-100 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-stone-100 rounded w-2/3" />
                  <div className="h-3 bg-stone-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>
    )
  }

  // ── Empty cart ───────────────────────────────────────────────────────────────
  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-5xl">🛒</p>
        <p className="text-stone-600 font-medium">Cart kamu kosong</p>
        <Link
          href={`/menu/${tableId}`}
          className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-full font-semibold transition"
        >
          Kembali ke Menu
        </Link>
      </div>
    )
  }

  // ── Cart with items ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/menu/${tableId}`} className="text-stone-500 hover:text-stone-700 text-sm">
            ← Menu
          </Link>
          <h1 className="font-bold text-stone-900">Keranjang</h1>
          <span className="ml-auto text-xs text-stone-400 font-medium">
            {state.items.reduce((s, i) => s + i.quantity, 0)} item
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-3 pb-40">
        {state.items.map((ci) => (
          <div
            key={ci.menuItem.id}
            className="bg-white rounded-xl shadow-sm border border-stone-100 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl select-none">{ci.menuItem.imageEmoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-900 text-sm">{ci.menuItem.name}</p>
                <p className="text-amber-600 font-bold text-sm mt-0.5">
                  {formatRupiah(ci.menuItem.price * ci.quantity)}
                </p>
              </div>
              <button
                onClick={() => removeItem(ci.menuItem.id)}
                className="text-stone-300 hover:text-red-400 transition text-xl leading-none p-1"
                aria-label="Hapus"
              >
                ×
              </button>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(ci.menuItem.id, ci.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 flex items-center justify-center text-lg font-bold text-stone-700 transition"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold text-stone-900 tabular-nums">
                  {ci.quantity}
                </span>
                <button
                  onClick={() => updateQty(ci.menuItem.id, ci.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 flex items-center justify-center text-lg font-bold text-white transition"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-stone-400">
                {formatRupiah(ci.menuItem.price)} / pcs
              </p>
            </div>
          </div>
        ))}

        {/* Subtotal */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
          <div className="flex justify-between items-center">
            <span className="text-stone-600 font-medium">Subtotal</span>
            <span className="font-bold text-stone-900 text-lg">{formatRupiah(subtotal)}</span>
          </div>
        </div>
      </main>

      {/* ── Sticky bottom nav ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-stone-200 shadow-lg p-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link
            href={`/menu/${tableId}`}
            className="flex-shrink-0 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            ← Menu
          </Link>
          <Link
            href="/checkout"
            className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-center py-2.5 rounded-xl font-bold text-sm transition"
          >
            Checkout — {formatRupiah(subtotal)}
          </Link>
        </div>
      </div>
    </div>
  )
}
