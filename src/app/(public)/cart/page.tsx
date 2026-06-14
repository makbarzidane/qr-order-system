'use client'

import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { formatRupiah } from '@/lib/menu-data'

export default function CartPage() {
  const { state, updateQty, removeItem, subtotal } = useCart()
  const tableId = state.tableId || 'meja-1'

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

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/menu/${tableId}`} className="text-stone-500 hover:text-stone-700">
            ← Menu
          </Link>
          <h1 className="font-bold text-stone-900">Keranjang</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-3 pb-40">
        {state.items.map((ci) => (
          <div
            key={ci.menuItem.id}
            className="bg-white rounded-xl shadow-sm border border-stone-100 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{ci.menuItem.imageEmoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-stone-900 text-sm">{ci.menuItem.name}</p>
                <p className="text-amber-600 font-bold text-sm mt-0.5">
                  {formatRupiah(ci.menuItem.price * ci.quantity)}
                </p>
              </div>
              <button
                onClick={() => removeItem(ci.menuItem.id)}
                className="text-stone-400 hover:text-red-500 transition text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(ci.menuItem.id, ci.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-lg font-bold text-stone-700 transition"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold text-stone-900">
                  {ci.quantity}
                </span>
                <button
                  onClick={() => updateQty(ci.menuItem.id, ci.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-lg font-bold text-white transition"
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

      {/* Checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-white border-t border-stone-200">
        <Link
          href="/checkout"
          className="block max-w-md mx-auto bg-amber-500 hover:bg-amber-600 text-white text-center py-3 rounded-xl font-bold transition"
        >
          Lanjut Checkout — {formatRupiah(subtotal)}
        </Link>
      </div>
    </div>
  )
}
