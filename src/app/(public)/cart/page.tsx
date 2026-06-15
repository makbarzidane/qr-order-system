'use client'

import Link from 'next/link'
import { MenuImage } from '@/components/MenuImage'
import { useCart } from '@/contexts/CartContext'
import { formatRupiah } from '@/lib/menu-data'

export default function CartPage() {
  const { state, updateQty, updateNote, removeItem, subtotal, isHydrated } = useCart()
  const tableId = state.tableId || 'meja-1'

  if (!isHydrated) return <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500">Memuat keranjang...</div>

  if (state.items.length === 0) {
    return <div className="grid min-h-screen place-items-center bg-slate-100 px-4"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 font-black text-slate-400">0</div><h1 className="mt-5 text-xl font-extrabold text-slate-950">Keranjang masih kosong</h1><p className="mt-2 text-sm text-slate-500">Pilih makanan atau minuman terlebih dahulu.</p><Link href={`/menu/${tableId}`} className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950">Kembali ke menu</Link></div></div>
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-32">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0f1f33] text-white"><div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6"><Link href={`/menu/${tableId}`} className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold">Kembali</Link><div><h1 className="font-extrabold">Keranjang</h1><p className="text-xs text-slate-400">{state.items.length} jenis menu · {tableId.replace(/-/g, ' ')}</p></div></div></header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="space-y-4">
          {state.items.map((cartItem) => (
            <article key={cartItem.menuItem.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex gap-4"><MenuImage src={cartItem.menuItem.imageUrl} alt={cartItem.menuItem.name} fallback={cartItem.menuItem.imageEmoji} className="h-24 w-24 shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-slate-950">{cartItem.menuItem.name}</h2><p className="mt-1 text-sm font-semibold text-amber-700">{formatRupiah(cartItem.menuItem.price * cartItem.quantity)}</p></div><button onClick={() => removeItem(cartItem.menuItem.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600">Hapus</button></div><div className="mt-4 flex items-center justify-between"><div className="flex items-center rounded-xl border border-slate-200"><button onClick={() => updateQty(cartItem.menuItem.id, cartItem.quantity - 1)} className="h-10 w-10 text-lg font-bold text-slate-600">-</button><span className="grid h-10 min-w-10 place-items-center border-x border-slate-200 font-bold">{cartItem.quantity}</span><button onClick={() => updateQty(cartItem.menuItem.id, cartItem.quantity + 1)} className="h-10 w-10 text-lg font-bold text-slate-950">+</button></div><p className="text-xs text-slate-400">{formatRupiah(cartItem.menuItem.price)} / item</p></div></div></div>
              <label className="mt-4 block text-xs font-semibold text-slate-600">Catatan untuk dapur<input value={cartItem.note} onChange={(event) => updateNote(cartItem.menuItem.id, event.target.value)} maxLength={120} placeholder="Contoh: tanpa gula, tidak pedas" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" /></label>
            </article>
          ))}
        </div>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between text-sm text-slate-500"><span>Jumlah item</span><span>{state.items.reduce((sum, item) => sum + item.quantity, 0)}</span></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-4"><span className="font-bold text-slate-950">Subtotal</span><span className="text-xl font-extrabold text-slate-950">{formatRupiah(subtotal)}</span></div></section>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-10px_30px_rgba(15,31,51,0.1)]"><div className="mx-auto flex max-w-3xl items-center gap-3"><Link href={`/menu/${tableId}`} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Tambah menu</Link><Link href="/checkout" className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-extrabold text-slate-950">Lanjut checkout · {formatRupiah(subtotal)}</Link></div></div>
    </div>
  )
}
