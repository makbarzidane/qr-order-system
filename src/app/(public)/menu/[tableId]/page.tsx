'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { MENU_ITEMS, CATEGORIES, formatRupiah } from '@/lib/menu-data'
import { MenuItem } from '@/types'

export default function MenuPage() {
  const params = useParams()
  const tableId = params.tableId as string
  const { addItem, totalItems, subtotal, setTable } = useCart()
  const [activeCategory, setActiveCategory] = useState('all')
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({})

  // setTable is now stable (useCallback) — no infinite loop
  useEffect(() => {
    setTable(tableId)
  }, [tableId, setTable])

  const filtered =
    activeCategory === 'all'
      ? MENU_ITEMS
      : MENU_ITEMS.filter((m) => m.categoryId === activeCategory)

  function handleAdd(item: MenuItem) {
    if (!item.isAvailable) return
    addItem(item)
    setAddedMap((prev) => ({ ...prev, [item.id]: true }))
    setTimeout(() => setAddedMap((prev) => ({ ...prev, [item.id]: false })), 800)
  }

  const tableName = tableId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900">☕ Menu</h1>
            <p className="text-xs text-stone-500">{tableName}</p>
          </div>

          {/* Cart icon button — always visible */}
          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-4 py-2 rounded-full text-sm font-semibold transition"
          >
            🛒
            <span>Cart</span>
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ── Category tabs ──────────────────────────────────────────── */}
      <div className="sticky top-[57px] z-10 bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-md mx-auto px-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2 py-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                activeCategory === 'all'
                  ? 'bg-amber-500 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Semua
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Menu items ─────────────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-3 pb-32">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-xl shadow-sm border border-stone-100 p-4 flex items-start gap-3 ${
              !item.isAvailable ? 'opacity-50' : ''
            }`}
          >
            <div className="text-4xl select-none">{item.imageEmoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-900 text-sm">{item.name}</p>
              <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{item.description}</p>
              {!item.isAvailable && (
                <span className="text-xs text-red-500 font-medium mt-1 block">
                  Tidak tersedia
                </span>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="font-bold text-amber-600 text-sm">{formatRupiah(item.price)}</p>
                <button
                  onClick={() => handleAdd(item)}
                  disabled={!item.isAvailable}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition select-none ${
                    !item.isAvailable
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : addedMap[item.id]
                      ? 'bg-green-500 text-white scale-95'
                      : 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-white'
                  }`}
                >
                  {addedMap[item.id] ? '✓ Ditambah' : '+ Tambah'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* ── Bottom navigation — tampil setelah item pertama ditambahkan ─ */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-20 transition-transform duration-300 ${
          totalItems > 0 ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white border-t border-stone-200 shadow-lg p-3">
          <div className="max-w-md mx-auto flex items-center gap-3">
            {/* Summary */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-500 leading-none">
                {totalItems} item
              </p>
              <p className="font-bold text-stone-900 text-sm mt-0.5">
                {formatRupiah(subtotal)}
              </p>
            </div>

            {/* Lihat Cart */}
            <Link
              href="/cart"
              className="flex-shrink-0 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              🛒 Lihat Cart
            </Link>

            {/* Checkout */}
            <Link
              href="/checkout"
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition"
            >
              Checkout →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
