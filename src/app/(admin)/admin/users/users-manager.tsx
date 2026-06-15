'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@prisma/client'
import { createUser, resetUserPassword, toggleUserActive, updateUser } from '../actions'
import { ActionButton, Badge, DataTable, EmptyState, PageHeader, SectionCard, inputClass, primaryButton, secondaryButton } from '@/components/admin/UI'

type UserRow = { id: string; name: string; email: string; role: Role; isActive: boolean }
const empty = { name: '', email: '', role: 'CASHIER' as Role, password: '' }
const roleTone: Record<Role, 'amber' | 'blue' | 'green'> = { ADMIN: 'amber', CASHIER: 'blue', KITCHEN: 'green' }

export function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter()
  const [form, setForm] = useState(empty)
  const [edit, setEdit] = useState<UserRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      setForm(empty)
      setEdit(null)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan pengguna.')
    } finally {
      setBusy(false)
    }
  }

  const source = edit ?? form

  return (
    <div>
      <PageHeader title="Pengguna" description="Kelola akun staf, role akses, status aktif, dan reset password secara aman." />
      {error ? <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <SectionCard title={edit ? 'Edit pengguna' : 'Tambah pengguna'} description="Pastikan role sesuai area kerja staf." className="h-fit">
          <div className="space-y-4 p-5">
            <label className="block text-sm font-bold text-slate-700">Nama lengkap<input className={`${inputClass} mt-2`} placeholder="Nama staf" value={source.name} onChange={(event) => edit ? setEdit({ ...edit, name: event.target.value }) : setForm({ ...form, name: event.target.value })} /></label>
            <label className="block text-sm font-bold text-slate-700">Email<input className={`${inputClass} mt-2`} type="email" placeholder="staff@cafe.id" value={source.email} onChange={(event) => edit ? setEdit({ ...edit, email: event.target.value }) : setForm({ ...form, email: event.target.value })} /></label>
            <label className="block text-sm font-bold text-slate-700">Role<select className={`${inputClass} mt-2`} value={source.role} onChange={(event) => edit ? setEdit({ ...edit, role: event.target.value as Role }) : setForm({ ...form, role: event.target.value as Role })}>{['ADMIN', 'CASHIER', 'KITCHEN'].map((role) => <option key={role}>{role}</option>)}</select></label>
            {!edit ? <label className="block text-sm font-bold text-slate-700">Password awal<input className={`${inputClass} mt-2`} type="password" placeholder="Minimal 8 karakter" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label> : null}
            <button disabled={busy} className={`${primaryButton} w-full`} onClick={() => run(() => edit ? updateUser(edit.id, edit) : createUser(form))}>
              {busy ? 'Menyimpan...' : edit ? 'Simpan perubahan' : 'Tambah pengguna'}
            </button>
            {edit ? <button className={`${secondaryButton} w-full`} onClick={() => setEdit(null)}>Batal edit</button> : null}
          </div>
        </SectionCard>

        <SectionCard title="Daftar pengguna" description="Status nonaktif langsung memblokir login akun database.">
          {users.length === 0 ? (
            <EmptyState title="Belum ada pengguna" description="Tambahkan akun staf pertama untuk mengamankan akses operasional." />
          ) : (
            <DataTable columns={['Staf', 'Role', 'Status', 'Aksi']} minWidth={820}>
              {users.map((user) => (
                <tr key={user.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">{user.name.slice(0, 1).toUpperCase()}</span>
                      <div><p className="font-extrabold text-slate-950">{user.name}</p><p className="mt-1 text-xs font-medium text-slate-500">{user.email}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Badge tone={roleTone[user.role]}>{user.role}</Badge></td>
                  <td className="px-5 py-4"><Badge tone={user.isActive ? 'green' : 'red'}>{user.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton onClick={() => setEdit(user)}>Edit</ActionButton>
                      <ActionButton onClick={() => { const password = prompt('Password baru (minimal 8 karakter)'); if (password) run(() => resetUserPassword(user.id, password)) }}>Reset password</ActionButton>
                      <ActionButton onClick={() => run(() => toggleUserActive(user.id))}>{user.isActive ? 'Nonaktifkan' : 'Aktifkan'}</ActionButton>
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
