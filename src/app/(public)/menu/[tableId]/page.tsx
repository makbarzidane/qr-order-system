'use client'

import { useEffect, useRef, useState } from 'react'
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
  const headerRef = useRef<HTMLElement>(null)

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

  // Switch category WITHOUT scrolling to top
  function handleCategoryChange(catId: string) {
    const scrollY = window.scrollY
    setActiveCategory(catId)
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo({ top: scrollY }))
    })
  }

  const tableName = tableId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header ref={headerRef} className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900 leading-tight">☕ Menu</h1>
            <p className="text-xs text-stone-500">{tableName}</p>
          </div>

          {/* Cart button — always visible, shows count badge */}
          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-4 py-2 rounded-full text-sm font-semibold transition"
          >
            🛒 Cart
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ── Category tabs ────────────────────────────────────────────
           Use overflow-x-auto with -scrollbar hidden to prevent layout shift.
           Height is fixed with py-2 to avoid reflow. ──────────────── */}
      <div className="sticky top-[57px] z-10 bg-white border-b border-stone-100 shadow-sm">
        <div
          className="max-w-md mx-auto px-4 overflow-x-auto"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          <div className="flex gap-2 py-2 w-max min-w-full">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
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

      {/* ── Menu items ───────────────────────────────────────────────
           min-h-[60vh] prevents layout shift when switching to a small category ── */}
      <main className="max-w-md mx-auto px-4 py-4 pb-32 min-h-[60vh]">
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl shadow-sm border border-stone-100 p-4 flex items-start gap-3 ${
                !item.isAvailable ? 'opacity-50' : ''
              }`}
            >
              <div className="text-4xl select-none w-10 text-center flex-shrink-0">
                {item.imageEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-900 text-sm leading-tight">{item.name}</p>
                <p className="text-xs text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
                {!item.isAvailable && (
                  <span className="text-xs text-red-500 font-medium mt-1 block">
                    Tidak tersedia
                  </span>
                )}
                <div className="flex items-center justify-between mt-2.5">
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
        </div>
      </main>

      {/* ── Sticky bottom nav ────────────────────────────────────────
           Slide in from bottom when first item is added ───────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-20 transition-transform duration-300 ${
          totalItems > 0 ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white border-t border-stone-200 shadow-lg p-3">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-500 leading-none">{totalItems} item</p>
              <p className="font-bold text-stone-900 text-sm mt-0.5 truncate">
                {formatRupiah(subtotal)}
              </p>
            </div>
            <Link
              href="/cart"
              className="flex-shrink-0 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 px-3 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              🛒 Cart
            </Link>
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
