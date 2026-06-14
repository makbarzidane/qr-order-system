'use client'
import { useEffect, useState } from 'react'
import { createCategory, updateCategory, toggleCategoryActive } from '../actions'

interface Category {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, setIsPending] = useState(false)
  const [newName, setNewName] = useState('')
  const [newOrder, setNewOrder] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editOrder, setEditOrder] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function fetchCategories() {
    setLoading(true)
    try {
      const res = await fetch('/api/menu')
      const data = await res.json()
      setCategories(data.categories ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchCategories() }, [])

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  function showErr(e: string) { setErr(e); setTimeout(() => setErr(''), 4000) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setIsPending(true)
    try {
      await createCategory({ name: newName.trim(), sortOrder: Number(newOrder) || 0 })
      setNewName(''); setNewOrder('')
      await fetchCategories()
      showMsg('Kategori berhasil ditambahkan!')
    } catch (error: unknown) {
      showErr(error instanceof Error ? error.message : 'Gagal menambahkan kategori')
    } finally { setIsPending(false) }
  }

  async function handleUpdate(id: string) {
    setIsPending(true)
    try {
      await updateCategory(id, { name: editName.trim(), sortOrder: Number(editOrder) || 0 })
      setEditId(null)
      await fetchCategories()
      showMsg('Kategori diperbarui!')
    } catch (error: unknown) {
      showErr(error instanceof Error ? error.message : 'Gagal memperbarui')
    } finally { setIsPending(false) }
  }

  async function handleToggle(id: string) {
    setIsPending(true)
    try {
      await toggleCategoryActive(id)
      await fetchCategories()
    } catch (error: unknown) {
      showErr(error instanceof Error ? error.message : 'Gagal mengubah status')
    } finally { setIsPending(false) }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">📂 Kategori Menu</h1>

      {msg && <div className="mb-4 bg-green-900 text-green-300 border border-green-700 rounded-xl px-4 py-3 text-sm">{msg}</div>}
      {err && <div className="mb-4 bg-red-900 text-red-300 border border-red-700 rounded-xl px-4 py-3 text-sm">{err}</div>}

      <form onSubmit={handleCreate} className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-sm mb-3 text-slate-300">Tambah Kategori Baru</h2>
        <div className="flex gap-2">
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nama kategori..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <input
            value={newOrder} onChange={e => setNewOrder(e.target.value)}
            placeholder="Urutan" type="number"
            className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button type="submit" disabled={isPending || !newName.trim()}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            Tambah
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">Memuat...</p>
      ) : categories.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-slate-400 text-sm">Belum ada kategori. Tambahkan di atas.</p>
          <p className="text-slate-500 text-xs mt-2">Atau jalankan <code className="text-amber-400">npm run db:seed</code> untuk data contoh.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              {editId === cat.id ? (
                <>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <input value={editOrder} onChange={e => setEditOrder(e.target.value)} type="number" placeholder="Urutan"
                    className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <button onClick={() => handleUpdate(cat.id)} disabled={isPending}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">✓ Simpan</button>
                  <button onClick={() => setEditId(null)}
                    className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition">Batal</button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <span className="font-medium text-sm">{cat.name}</span>
                    <span className="text-xs text-slate-500 ml-2">urutan: {cat.sortOrder}</span>
                  </div>
                  <button onClick={() => handleToggle(cat.id)} disabled={isPending}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition ${cat.isActive ? 'bg-green-900 text-green-300 hover:bg-green-800' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                    {cat.isActive ? 'Aktif' : 'Nonaktif'}
                  </button>
                  <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditOrder(String(cat.sortOrder)) }}
                    className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition">✏️ Edit</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
