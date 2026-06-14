'use client'
import { useEffect, useState, useTransition } from 'react'
import { createMenuItem, updateMenuItem, toggleMenuItemAvailable } from '../actions'
import { formatRupiah } from '@/lib/menu-data'

interface Category { id: string; name: string }
interface Item { id: string; name: string; description: string; price: number; imageEmoji: string; isAvailable: boolean; categoryId: string; category?: { name: string } }

export default function MenuAdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Item>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newData, setNewData] = useState({ name: '', description: '', price: '', imageEmoji: '🍽️', categoryId: '', isAvailable: true })

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  function showErr(e: string) { setErr(e); setTimeout(() => setErr(''), 4000) }

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/menu')
      const data = await res.json()
      setCategories(data.categories ?? [])
      setItems(data.items ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newData.name.trim() || !newData.categoryId) return
    startTransition(async () => {
      try {
        await createMenuItem({
          name: newData.name.trim(),
          description: newData.description,
          price: Number(newData.price) || 0,
          imageEmoji: newData.imageEmoji || '🍽️',
          categoryId: newData.categoryId,
          isAvailable: newData.isAvailable,
        })
        setNewData({ name: '', description: '', price: '', imageEmoji: '🍽️', categoryId: '', isAvailable: true })
        setShowAdd(false)
        await fetchData()
        showMsg('Item berhasil ditambahkan!')
      } catch (error: unknown) {
        showErr(error instanceof Error ? error.message : 'Gagal menambahkan')
      }
    })
  }

  async function handleUpdate(id: string) {
    startTransition(async () => {
      try {
        await updateMenuItem(id, { name: editData.name, description: editData.description, price: typeof editData.price === 'string' ? Number(editData.price) : editData.price, imageEmoji: editData.imageEmoji, categoryId: editData.categoryId })
        setEditId(null)
        await fetchData()
        showMsg('Item diperbarui!')
      } catch (error: unknown) {
        showErr(error instanceof Error ? error.message : 'Gagal memperbarui')
      }
    })
  }

  async function handleToggle(id: string) {
    startTransition(async () => {
      try { await toggleMenuItemAvailable(id); await fetchData() }
      catch (error: unknown) { showErr(error instanceof Error ? error.message : 'Gagal') }
    })
  }

  const filtered = filterCat === 'all' ? items : items.filter(i => i.categoryId === filterCat)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">🍽️ Menu</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          {showAdd ? 'Batal' : '+ Tambah Item'}
        </button>
      </div>

      {msg && <div className="mb-4 bg-green-900 text-green-300 border border-green-700 rounded-xl px-4 py-3 text-sm">{msg}</div>}
      {err && <div className="mb-4 bg-red-900 text-red-300 border border-red-700 rounded-xl px-4 py-3 text-sm">{err}</div>}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleCreate} className="bg-slate-800 border border-amber-500/30 rounded-xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-sm text-amber-400 mb-2">Tambah Item Baru</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Nama *</label>
              <input value={newData.name} onChange={e => setNewData(p => ({...p, name: e.target.value}))}
                placeholder="Nama item..." required
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Deskripsi</label>
              <input value={newData.description} onChange={e => setNewData(p => ({...p, description: e.target.value}))}
                placeholder="Deskripsi singkat..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Harga (Rp) *</label>
              <input value={newData.price} onChange={e => setNewData(p => ({...p, price: e.target.value}))}
                placeholder="18000" type="number" required min="0"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Emoji</label>
              <input value={newData.imageEmoji} onChange={e => setNewData(p => ({...p, imageEmoji: e.target.value}))}
                placeholder="🍽️" maxLength={4}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Kategori *</label>
              <select value={newData.categoryId} onChange={e => setNewData(p => ({...p, categoryId: e.target.value}))} required
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500">
                <option value="">Pilih kategori...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="avail" checked={newData.isAvailable} onChange={e => setNewData(p => ({...p, isAvailable: e.target.checked}))} className="rounded" />
              <label htmlFor="avail" className="text-sm text-slate-300">Tersedia</label>
            </div>
          </div>
          <button type="submit" disabled={isPending || !newData.name.trim() || !newData.categoryId}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-semibold transition">
            {isPending ? 'Menyimpan...' : 'Simpan Item'}
          </button>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterCat('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition ${filterCat === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Semua</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setFilterCat(c.id)} className={`px-3 py-1 rounded-full text-xs font-medium transition ${filterCat === c.id ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{c.name}</button>
        ))}
      </div>

      {/* Items list */}
      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">Memuat...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-slate-400 text-sm">Belum ada item menu.</p>
          <p className="text-slate-500 text-xs mt-2">Tambahkan item di atas atau jalankan <code className="text-amber-400">npm run db:seed</code></p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              {editId === item.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editData.name ?? ''} onChange={e => setEditData(p => ({...p, name: e.target.value}))}
                      placeholder="Nama" className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    <input value={editData.price ?? ''} onChange={e => setEditData(p => ({...p, price: e.target.value as unknown as number}))}
                      type="number" placeholder="Harga" className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    <input value={editData.imageEmoji ?? ''} onChange={e => setEditData(p => ({...p, imageEmoji: e.target.value}))}
                      placeholder="Emoji" maxLength={4} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    <select value={editData.categoryId ?? ''} onChange={e => setEditData(p => ({...p, categoryId: e.target.value}))}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input value={editData.description ?? ''} onChange={e => setEditData(p => ({...p, description: e.target.value}))}
                      placeholder="Deskripsi" className="col-span-2 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(item.id)} disabled={isPending}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">✓ Simpan</button>
                    <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition">Batal</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.imageEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.category?.name} · {formatRupiah(item.price)}</p>
                  </div>
                  <button onClick={() => handleToggle(item.id)} disabled={isPending}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${item.isAvailable ? 'bg-green-900 text-green-300 hover:bg-green-800' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                    {item.isAvailable ? 'Tersedia' : 'Nonaktif'}
                  </button>
                  <button onClick={() => { setEditId(item.id); setEditData({ name: item.name, description: item.description, price: item.price, imageEmoji: item.imageEmoji, categoryId: item.categoryId }) }}
                    className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition">✏️ Edit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
