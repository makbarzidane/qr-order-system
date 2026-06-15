'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDiscount, toggleDiscountActive, updateDiscount } from '../actions'
import { ActionButton, Badge, DataTable, EmptyState, PageHeader, SectionCard, inputClass, primaryButton, secondaryButton } from '@/components/admin/UI'
import { formatRupiah } from '@/lib/menu-data'

type DiscountType = 'PERCENTAGE' | 'FIXED'
type Promo = { id: string; name: string; code: string | null; type: DiscountType; value: number; minPurchase: number; isActive: boolean; startsAt: string | null; endsAt: string | null }

const blank = { name: '', code: '', type: 'PERCENTAGE' as DiscountType, value: 10, minPurchase: 0, startsAt: '', endsAt: '', isActive: true }

export function PromoManager({ promos }: { promos: Promo[] }) {
  const router = useRouter()
  const [form, setForm] = useState(blank)
  const [edit, setEdit] = useState<Promo | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      setEdit(null)
      setForm(blank)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan promo.')
    } finally {
      setBusy(false)
    }
  }

  const source = edit ?? form
  const payload = { ...source, code: source.code ?? '', startsAt: source.startsAt?.slice(0, 10) ?? '', endsAt: source.endsAt?.slice(0, 10) ?? '' }

  return (
    <div>
      <PageHeader title="Promo & diskon" description="Buat aturan diskon yang tetap divalidasi server saat checkout customer." />
      {error ? <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <SectionCard title={edit ? 'Edit promo' : 'Promo baru'} description="Gunakan kode singkat dan batas minimum agar promo tetap terkendali." className="h-fit">
          <div className="grid gap-4 p-5">
            <label className="text-sm font-bold text-slate-700">Nama promo<input className={`${inputClass} mt-2`} placeholder="Contoh: Diskon Launching" value={payload.name} onChange={(event) => edit ? setEdit({ ...edit, name: event.target.value }) : setForm({ ...form, name: event.target.value })} /></label>
            <label className="text-sm font-bold text-slate-700">Kode promo<input className={`${inputClass} mt-2 uppercase`} placeholder="OPSIONAL" value={payload.code} onChange={(event) => edit ? setEdit({ ...edit, code: event.target.value.toUpperCase() }) : setForm({ ...form, code: event.target.value.toUpperCase() })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold text-slate-700">Tipe<select className={`${inputClass} mt-2`} value={payload.type} onChange={(event) => edit ? setEdit({ ...edit, type: event.target.value as DiscountType }) : setForm({ ...form, type: event.target.value as DiscountType })}><option value="PERCENTAGE">Persentase</option><option value="FIXED">Nominal</option></select></label>
              <label className="text-sm font-bold text-slate-700">Nilai<input className={`${inputClass} mt-2`} type="number" min="1" value={payload.value} onChange={(event) => edit ? setEdit({ ...edit, value: Number(event.target.value) }) : setForm({ ...form, value: Number(event.target.value) })} /></label>
            </div>
            <label className="text-sm font-bold text-slate-700">Minimal pembelian<input className={`${inputClass} mt-2`} type="number" min="0" value={payload.minPurchase} onChange={(event) => edit ? setEdit({ ...edit, minPurchase: Number(event.target.value) }) : setForm({ ...form, minPurchase: Number(event.target.value) })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold text-slate-700">Mulai<input className={`${inputClass} mt-2`} type="date" value={payload.startsAt} onChange={(event) => edit ? setEdit({ ...edit, startsAt: event.target.value }) : setForm({ ...form, startsAt: event.target.value })} /></label>
              <label className="text-sm font-bold text-slate-700">Berakhir<input className={`${inputClass} mt-2`} type="date" value={payload.endsAt} onChange={(event) => edit ? setEdit({ ...edit, endsAt: event.target.value }) : setForm({ ...form, endsAt: event.target.value })} /></label>
            </div>
            <button className={`${primaryButton} w-full`} disabled={busy} onClick={() => run(() => edit ? updateDiscount(edit.id, payload) : createDiscount(payload))}>{busy ? 'Menyimpan...' : 'Simpan promo'}</button>
            {edit ? <button className={`${secondaryButton} w-full`} onClick={() => setEdit(null)}>Batal edit</button> : null}
          </div>
        </SectionCard>

        <SectionCard title="Daftar promo" description="Promo nonaktif tidak bisa dipakai customer saat checkout.">
          {promos.length === 0 ? (
            <EmptyState title="Belum ada promo" description="Buat promo pertama untuk meningkatkan repeat order." />
          ) : (
            <DataTable columns={['Promo', 'Nilai', 'Periode', 'Status', 'Aksi']} minWidth={880}>
              {promos.map((promo) => (
                <tr key={promo.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4"><p className="font-extrabold text-slate-950">{promo.name}</p>{promo.code ? <code className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{promo.code}</code> : <p className="mt-1 text-xs text-slate-400">Tanpa kode</p>}</td>
                  <td className="px-5 py-4"><p className="font-bold text-slate-800">{promo.type === 'PERCENTAGE' ? `${promo.value}%` : formatRupiah(promo.value)}</p><p className="mt-1 text-xs text-slate-500">Min. {formatRupiah(promo.minPurchase)}</p></td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-500">{promo.startsAt?.slice(0, 10) || 'Sekarang'} - {promo.endsAt?.slice(0, 10) || 'Tanpa batas'}</td>
                  <td className="px-5 py-4"><Badge tone={promo.isActive ? 'green' : 'red'}>{promo.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><ActionButton onClick={() => setEdit(promo)}>Edit</ActionButton><ActionButton onClick={() => run(() => toggleDiscountActive(promo.id))}>{promo.isActive ? 'Nonaktifkan' : 'Aktifkan'}</ActionButton></div></td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
