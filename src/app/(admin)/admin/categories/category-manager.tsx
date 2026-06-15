'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, deleteCategory, toggleCategoryActive, updateCategory } from '../actions'
import { ActionButton, Badge, DataTable, EmptyState, PageHeader, SectionCard, inputClass, primaryButton, secondaryButton } from '@/components/admin/UI'

type Category = { id: string; name: string; sortOrder: number; isActive: boolean; itemCount: number }

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [sort, setSort] = useState(0)
  const [edit, setEdit] = useState<Category | null>(null)
  const [error, setError] = useState('')
  const activeCount = categories.filter((category) => category.isActive).length

  async function run(action: () => Promise<void>) {
    setError('')
    try {
      await action()
      setName('')
      setSort(0)
      setEdit(null)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan kategori.')
    }
  }

  const currentName = edit?.name ?? name
  const currentSort = edit?.sortOrder ?? sort

  return (
    <div>
      <PageHeader
        title="Kategori menu"
        description="Susun katalog menu dengan urutan yang jelas agar customer cepat menemukan produk."
      />

      {error ? <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SectionCard title="Total kategori" description="Semua kategori yang pernah dibuat">
          <div className="px-5 py-6 text-3xl font-black text-slate-950">{categories.length}</div>
        </SectionCard>
        <SectionCard title="Kategori aktif" description="Tampil di storefront">
          <div className="px-5 py-6 text-3xl font-black text-emerald-600">{activeCount}</div>
        </SectionCard>
        <SectionCard title="Menu tertaut" description="Jumlah item yang memakai kategori">
          <div className="px-5 py-6 text-3xl font-black text-amber-600">{categories.reduce((sum, category) => sum + category.itemCount, 0)}</div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <SectionCard title={edit ? 'Edit kategori' : 'Kategori baru'} description="Nama dan urutan tampil di katalog customer." className="h-fit">
          <div className="space-y-4 p-5">
            <label className="block text-sm font-bold text-slate-700">
              Nama kategori
              <input className={`${inputClass} mt-2`} placeholder="Contoh: Kopi Signature" value={currentName} onChange={(event) => edit ? setEdit({ ...edit, name: event.target.value }) : setName(event.target.value)} />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Urutan
              <input className={`${inputClass} mt-2`} type="number" min="0" value={currentSort} onChange={(event) => edit ? setEdit({ ...edit, sortOrder: Number(event.target.value) }) : setSort(Number(event.target.value))} />
            </label>
            <button className={`${primaryButton} w-full`} onClick={() => run(() => edit ? updateCategory(edit.id, { name: edit.name, sortOrder: edit.sortOrder }) : createCategory({ name, sortOrder: sort }))}>
              {edit ? 'Simpan perubahan' : 'Tambah kategori'}
            </button>
            {edit ? <button className={`${secondaryButton} w-full`} onClick={() => setEdit(null)}>Batal edit</button> : null}
          </div>
        </SectionCard>

        <SectionCard title="Daftar kategori" description="Kelola status kategori tanpa menghapus menu yang sudah terhubung.">
          {categories.length === 0 ? (
            <EmptyState title="Belum ada kategori" description="Tambahkan kategori pertama untuk mulai menyusun menu." />
          ) : (
            <DataTable columns={['Urutan', 'Kategori', 'Menu', 'Status', 'Aksi']} minWidth={760}>
              {categories.map((category) => (
                <tr key={category.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-sm font-black text-slate-600">{category.sortOrder}</span></td>
                  <td className="px-5 py-4"><p className="font-extrabold text-slate-950">{category.name}</p><p className="mt-1 text-xs font-medium text-slate-500">ID: {category.id}</p></td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">{category.itemCount} menu</td>
                  <td className="px-5 py-4"><Badge tone={category.isActive ? 'green' : 'red'}>{category.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton onClick={() => setEdit(category)}>Edit</ActionButton>
                      <ActionButton onClick={() => run(() => toggleCategoryActive(category.id))}>{category.isActive ? 'Nonaktifkan' : 'Aktifkan'}</ActionButton>
                      <ActionButton className="text-rose-600" disabled={category.itemCount > 0} onClick={() => run(() => deleteCategory(category.id))}>Hapus</ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
