'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MenuImage } from '@/components/MenuImage'
import { useCart } from '@/contexts/CartContext'
import { formatRupiah } from '@/lib/menu-data'
import type { Category, MenuItem } from '@/types'

interface MenuData {
  categories: Category[]
  items: MenuItem[]
  settings?: { name?: string; isOpen?: boolean } | null
  fallback?: boolean
}

export default function MenuPage() {
  const params = useParams()
  const tableId = params.tableId as string
  const { addItem, totalItems, subtotal, setTable } = useCart()
  const [activeCategory, setActiveCategory] = useState('all')
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({})
  const [menuData, setMenuData] = useState<MenuData>({ categories: [], items: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const scrollPosition = useRef(0)

  useEffect(() => setTable(tableId), [setTable, tableId])

  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await fetch('/api/menu')
        if (!response.ok) throw new Error('Menu belum dapat dimuat.')
        setMenuData(await response.json())
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Menu belum dapat dimuat.')
      } finally {
        setLoading(false)
      }
    }
    loadMenu()
  }, [])

  const filtered = useMemo(() => activeCategory === 'all'
    ? menuData.items
    : menuData.items.filter((item) => item.categoryId === activeCategory), [activeCategory, menuData.items])

  function add(item: MenuItem) {
    if (!item.isAvailable) return
    addItem(item)
    setAddedMap((current) => ({ ...current, [item.id]: true }))
    window.setTimeout(() => setAddedMap((current) => ({ ...current, [item.id]: false })), 800)
  }

  function changeCategory(categoryId: string) {
    scrollPosition.current = window.scrollY
    setActiveCategory(categoryId)
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: scrollPosition.current })))
  }

  const tableName = tableId.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  const cafeName = menuData.settings?.name || 'QR Order Cafe'

  return (
    <div className="min-h-screen bg-slate-100 pb-32">
      <header className="bg-[#0f1f33] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">{cafeName}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">Menu digital</h1><p className="mt-1 text-sm text-slate-300">Pesanan untuk {tableName}</p></div>
          <Link href="/cart" className="relative rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/15">Keranjang{totalItems > 0 ? <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-amber-500 px-1 text-xs text-slate-950">{totalItems}</span> : null}</Link>
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <button onClick={() => changeCategory('all')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${activeCategory === 'all' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Semua</button>
          {menuData.categories.map((category) => <button key={category.id} onClick={() => changeCategory(category.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${activeCategory === category.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{category.name}</button>)}
        </div>
      </div>

      <main className="mx-auto min-h-[65vh] max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-end justify-between"><div><h2 className="text-xl font-extrabold text-slate-950">Pilih menu favorit</h2><p className="mt-1 text-sm text-slate-500">Harga sudah diperbarui langsung dari katalog.</p></div><p className="hidden text-sm font-semibold text-slate-500 sm:block">{filtered.length} menu</p></div>

        {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div> : null}
        {!loading && (error || menuData.fallback || filtered.length === 0) ? <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 font-black text-slate-400">MENU</div><p className="mt-4 font-bold text-slate-800">{error || 'Menu belum tersedia'}</p><p className="mt-1 text-sm text-slate-500">Silakan hubungi staf cafe untuk bantuan.</p></div> : null}

        {!loading && !error && filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, index) => (
              <article key={item.id} className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${!item.isAvailable ? 'opacity-60' : ''}`}>
                <MenuImage src={item.imageUrl} alt={item.name} fallback={item.imageEmoji} className="aspect-[4/3] w-full" priority={index < 3} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{item.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{item.description || 'Menu pilihan cafe.'}</p></div></div>
                  <div className="mt-4 flex items-center justify-between gap-3"><div><p className="font-extrabold text-amber-700">{formatRupiah(item.price)}</p><p className={`mt-1 text-xs font-semibold ${item.isAvailable ? 'text-emerald-600' : 'text-red-600'}`}>{item.isAvailable ? 'Tersedia' : 'Tidak tersedia'}</p></div><button onClick={() => add(item)} disabled={!item.isAvailable} className={`min-h-11 rounded-xl px-4 text-sm font-bold transition ${!item.isAvailable ? 'cursor-not-allowed bg-slate-100 text-slate-400' : addedMap[item.id] ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95'}`}>{addedMap[item.id] ? 'Ditambahkan' : 'Tambah'}</button></div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </main>

      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-10px_30px_rgba(15,31,51,0.1)] transition-transform ${totalItems > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto flex max-w-xl items-center gap-4"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-500">{totalItems} item dalam keranjang</p><p className="mt-0.5 truncate font-extrabold text-slate-950">{formatRupiah(subtotal)}</p></div><Link href="/cart" className="rounded-xl bg-[#0f1f33] px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Lihat keranjang</Link></div>
      </div>
    </div>
  )
}
