'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateSettings } from '../actions'
import { Badge, PageHeader, SectionCard, inputClass, primaryButton } from '@/components/admin/UI'

type Settings = { name: string; address: string; whatsapp: string; invoiceNote: string; isOpen: boolean }

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter()
  const [form, setForm] = useState(settings)
  const [message, setMessage] = useState('')

  async function save() {
    await updateSettings(form)
    setMessage('Pengaturan tersimpan.')
    router.refresh()
  }

  return (
    <div>
      <PageHeader title="Pengaturan cafe" description="Atur identitas cafe, informasi invoice, dan status penerimaan order customer." />
      {message ? <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard title="Profil bisnis" description="Informasi ini tampil pada storefront dan invoice customer.">
          <div className="grid gap-5 p-5">
            <label className="text-sm font-bold text-slate-700">Nama cafe<input className={`${inputClass} mt-2`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="text-sm font-bold text-slate-700">Alamat<textarea className={`${inputClass} mt-2 min-h-24`} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            <label className="text-sm font-bold text-slate-700">Nomor WhatsApp<input className={`${inputClass} mt-2`} value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></label>
            <label className="text-sm font-bold text-slate-700">Catatan invoice<textarea className={`${inputClass} mt-2 min-h-28`} value={form.invoiceNote} onChange={(event) => setForm({ ...form, invoiceNote: event.target.value })} /></label>
            <button className={`${primaryButton} w-fit`} onClick={save}>Simpan pengaturan</button>
          </div>
        </SectionCard>

        <SectionCard title="Status operasional" description="Kontrol cepat apakah customer bisa membuat order.">
          <div className="p-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-slate-950">Sistem menerima order</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">Matikan saat cafe tutup atau sedang maintenance.</p>
                </div>
                <Badge tone={form.isOpen ? 'green' : 'red'}>{form.isOpen ? 'Buka' : 'Tutup'}</Badge>
              </div>
              <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl bg-white p-4 text-sm font-bold text-slate-700 shadow-sm">
                Terima order baru
                <input type="checkbox" checked={form.isOpen} onChange={(event) => setForm({ ...form, isOpen: event.target.checked })} className="h-5 w-5 accent-amber-500" />
              </label>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
