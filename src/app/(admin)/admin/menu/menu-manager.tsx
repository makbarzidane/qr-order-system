'use client'

import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MenuImage } from '@/components/MenuImage'
import { Badge, Card, EmptyState, PageHeader, inputClass, primaryButton, secondaryButton } from '@/components/admin/UI'
import { compressMenuImage } from '@/lib/image-upload'
import { formatRupiah } from '@/lib/menu-data'
import { createMenuItem, setMenuStatus, updateMenuItem } from '../actions'

type Category = { id: string; name: string; isActive: boolean }
type Item = {
  id: string
  name: string
  description: string
  price: number
  imageEmoji: string
  imageUrl: string | null
  isActive: boolean
  isAvailable: boolean
  categoryId: string
  category: { id: string; name: string }
}

type MenuForm = Omit<Item, 'id' | 'category'>

const blank: MenuForm = {
  name: '',
  description: '',
  price: 0,
  imageEmoji: 'MENU',
  imageUrl: null,
  categoryId: '',
  isActive: true,
  isAvailable: true,
}

export function MenuManager({ categories, items }: { categories: Category[]; items: Item[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<MenuForm>(blank)
  const [edit, setEdit] = useState<Item | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)

  const source = edit ?? form
  const filtered = useMemo(() => items.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !category || item.categoryId === category
    const matchesStatus = !status
      || (status === 'active' && item.isActive)
      || (status === 'inactive' && !item.isActive)
      || (status === 'available' && item.isAvailable)
      || (status === 'soldout' && !item.isAvailable)
    return matchesSearch && matchesCategory && matchesStatus
  }), [category, items, search, status])

  function update<K extends keyof MenuForm>(key: K, value: MenuForm[K]) {
    if (edit) setEdit({ ...edit, [key]: value })
    else setForm({ ...form, [key]: value })
  }

  function resetForm() {
    setEdit(null)
    setForm(blank)
    setShowForm(false)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      resetForm()
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan menu.')
    } finally {
      setBusy(false)
    }
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setProcessingImage(true)
    setError('')
    try {
      const dataUrl = await compressMenuImage(file)
      update('imageUrl', dataUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memproses gambar.')
      event.target.value = ''
    } finally {
      setProcessingImage(false)
    }
  }

  const payload = {
    name: source.name,
    description: source.description,
    price: source.price,
    imageEmoji: source.imageEmoji,
    imageUrl: source.imageUrl ?? undefined,
    categoryId: source.categoryId,
    isActive: source.isActive,
    isAvailable: source.isAvailable,
  }

  return (
    <div>
      <PageHeader
        title="Menu makanan & minuman"
        description="Kelola katalog, harga, foto, kategori, dan ketersediaan dari satu tempat."
        action={<button className={primaryButton} onClick={() => { resetForm(); setShowForm(true) }}>Tambah menu</button>}
      />

      {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

      {(showForm || edit) ? (
        <Card className="mb-6 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-950">{edit ? 'Edit menu' : 'Menu baru'}</h2>
            <p className="mt-1 text-sm text-slate-500">Foto otomatis dikompresi agar ringan dan tersimpan secara persisten.</p>
          </div>
          <div className="grid gap-6 p-5 lg:grid-cols-[280px_1fr]">
            <div>
              <MenuImage src={source.imageUrl} alt={source.name || 'Preview menu'} fallback={source.imageEmoji} className="aspect-[4/3] w-full rounded-2xl border border-slate-200" />
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImage} />
              <button type="button" className={`${secondaryButton} mt-3 w-full`} disabled={processingImage} onClick={() => fileRef.current?.click()}>
                {processingImage ? 'Mengompresi gambar...' : 'Pilih gambar dari perangkat'}
              </button>
              {source.imageUrl ? (
                <button type="button" className="mt-2 w-full text-center text-xs font-semibold text-red-600" onClick={() => update('imageUrl', null)}>
                  Hapus gambar
                </button>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-slate-500">JPG, PNG, atau WebP. Maksimal 8 MB sebelum kompresi.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Nama menu<input className={`${inputClass} mt-2`} placeholder="Contoh: Es Kopi Susu" value={source.name} onChange={(event) => update('name', event.target.value)} /></label>
              <label className="text-sm font-semibold text-slate-700">Kategori<select className={`${inputClass} mt-2`} value={source.categoryId} onChange={(event) => update('categoryId', event.target.value)}><option value="">Pilih kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? '' : ' (nonaktif)'}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-700">Harga rupiah<input className={`${inputClass} mt-2`} type="number" min="0" step="1" value={source.price || ''} onChange={(event) => update('price', Number(event.target.value))} /></label>
              <label className="text-sm font-semibold text-slate-700">Label gambar cadangan<input className={`${inputClass} mt-2`} value={source.imageEmoji} onChange={(event) => update('imageEmoji', event.target.value)} /></label>
              <label className="text-sm font-semibold text-slate-700 md:col-span-2">URL gambar alternatif<input className={`${inputClass} mt-2`} placeholder="https://... (opsional)" value={source.imageUrl?.startsWith('data:') ? '' : source.imageUrl ?? ''} onChange={(event) => update('imageUrl', event.target.value || null)} /></label>
              <label className="text-sm font-semibold text-slate-700 md:col-span-2">Deskripsi<textarea className={`${inputClass} mt-2 min-h-24 resize-y`} placeholder="Deskripsi singkat menu" value={source.description} onChange={(event) => update('description', event.target.value)} /></label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={source.isActive} onChange={(event) => update('isActive', event.target.checked)} className="h-4 w-4 accent-amber-500" />Aktif di katalog</label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={source.isAvailable} onChange={(event) => update('isAvailable', event.target.checked)} className="h-4 w-4 accent-amber-500" />Tersedia untuk dipesan</label>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button className={primaryButton} disabled={busy || processingImage} onClick={() => run(() => edit ? updateMenuItem(edit.id, payload) : createMenuItem(payload))}>{busy ? 'Menyimpan...' : 'Simpan menu'}</button>
                <button className={secondaryButton} onClick={resetForm}>Batal</button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input className={inputClass} placeholder="Cari nama menu..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="available">Tersedia</option><option value="soldout">Habis</option></select>
        </div>
      </Card>

      {filtered.length === 0 ? <Card><EmptyState title="Menu tidak ditemukan" description="Ubah filter atau tambahkan menu baru." /></Card> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
              <MenuImage src={item.imageUrl} alt={item.name} fallback={item.imageEmoji} className="aspect-[16/9] w-full" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4"><div><p className="font-bold text-slate-950">{item.name}</p><p className="mt-1 text-sm text-slate-500">{item.category.name}</p></div><p className="whitespace-nowrap font-bold text-amber-700">{formatRupiah(item.price)}</p></div>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{item.description || 'Tanpa deskripsi'}</p>
                <div className="mt-4 flex flex-wrap gap-2"><Badge tone={item.isActive ? 'green' : 'red'}>{item.isActive ? 'Aktif' : 'Nonaktif'}</Badge><Badge tone={item.isAvailable ? 'blue' : 'amber'}>{item.isAvailable ? 'Tersedia' : 'Habis'}</Badge>{item.imageUrl ? <Badge>Foto tersedia</Badge> : null}</div>
                <div className="mt-5 grid grid-cols-3 gap-2"><button className={secondaryButton} onClick={() => { setEdit(item); setShowForm(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button><button className={secondaryButton} onClick={() => run(() => setMenuStatus(item.id, 'isActive', !item.isActive))}>{item.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button><button className={secondaryButton} onClick={() => run(() => setMenuStatus(item.id, 'isAvailable', !item.isAvailable))}>{item.isAvailable ? 'Habis' : 'Tersedia'}</button></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
