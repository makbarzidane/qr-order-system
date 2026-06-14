'use server'

import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') throw new Error('Unauthorized')
  return session
}

function required(value: string, label: string) {
  const clean = value.trim()
  if (!clean) throw new Error(`${label} wajib diisi.`)
  return clean
}

async function audit(session: Awaited<ReturnType<typeof requireAdmin>>, action: string, entity: string, entityId?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      userId: session.user.id || undefined,
      userName: session.user.name ?? session.user.email ?? 'Admin',
      action,
      entity,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  })
}

function refresh(...paths: string[]) {
  paths.forEach((path) => revalidatePath(path))
}

export async function createCategory(data: { name: string; sortOrder?: number }) {
  const session = await requireAdmin()
  const category = await prisma.category.create({ data: { name: required(data.name, 'Nama kategori'), sortOrder: Math.max(0, data.sortOrder ?? 0) } })
  await audit(session, 'CREATE', 'Category', category.id, { name: category.name })
  refresh('/admin/categories', '/admin/menu', '/api/menu')
}

export async function updateCategory(id: string, data: { name: string; sortOrder?: number }) {
  const session = await requireAdmin()
  const category = await prisma.category.update({ where: { id }, data: { name: required(data.name, 'Nama kategori'), sortOrder: Math.max(0, data.sortOrder ?? 0) } })
  await audit(session, 'UPDATE', 'Category', id, { name: category.name })
  refresh('/admin/categories', '/admin/menu', '/api/menu')
}

export async function toggleCategoryActive(id: string) {
  const session = await requireAdmin()
  const current = await prisma.category.findUnique({ where: { id } })
  if (!current) throw new Error('Kategori tidak ditemukan.')
  await prisma.category.update({ where: { id }, data: { isActive: !current.isActive } })
  await audit(session, 'TOGGLE_ACTIVE', 'Category', id, { isActive: !current.isActive })
  refresh('/admin/categories', '/admin/menu', '/api/menu')
}

export async function deleteCategory(id: string) {
  const session = await requireAdmin()
  const used = await prisma.menuItem.count({ where: { categoryId: id } })
  if (used > 0) throw new Error('Kategori masih dipakai menu. Nonaktifkan kategori atau pindahkan menu terlebih dahulu.')
  await prisma.category.delete({ where: { id } })
  await audit(session, 'DELETE', 'Category', id)
  refresh('/admin/categories', '/admin/menu', '/api/menu')
}

type MenuInput = { name: string; description?: string; price: number; imageEmoji?: string; imageUrl?: string; categoryId: string; isActive?: boolean; isAvailable?: boolean }

function normalizeMenu(data: MenuInput) {
  if (!Number.isInteger(data.price) || data.price < 0) throw new Error('Harga harus berupa rupiah bulat dan tidak boleh minus.')
  return {
    name: required(data.name, 'Nama menu'),
    description: data.description?.trim() ?? '',
    price: data.price,
    imageEmoji: data.imageEmoji?.trim() || 'MENU',
    imageUrl: data.imageUrl?.trim() || null,
    categoryId: required(data.categoryId, 'Kategori'),
    isActive: data.isActive ?? true,
    isAvailable: data.isAvailable ?? true,
  }
}

export async function createMenuItem(data: MenuInput) {
  const session = await requireAdmin()
  const item = await prisma.menuItem.create({ data: normalizeMenu(data) })
  await audit(session, 'CREATE', 'MenuItem', item.id, { name: item.name, price: item.price })
  refresh('/admin/menu', '/admin/dashboard', '/api/menu')
}

export async function updateMenuItem(id: string, data: MenuInput) {
  const session = await requireAdmin()
  const item = await prisma.menuItem.update({ where: { id }, data: normalizeMenu(data) })
  await audit(session, 'UPDATE', 'MenuItem', id, { name: item.name, price: item.price })
  refresh('/admin/menu', '/admin/dashboard', '/api/menu')
}

export async function setMenuStatus(id: string, field: 'isActive' | 'isAvailable', value: boolean) {
  const session = await requireAdmin()
  await prisma.menuItem.update({ where: { id }, data: { [field]: value } })
  await audit(session, 'SET_STATUS', 'MenuItem', id, { field, value })
  refresh('/admin/menu', '/admin/dashboard', '/api/menu')
}

export async function toggleMenuItemAvailable(id: string) {
  const current = await prisma.menuItem.findUnique({ where: { id } })
  if (!current) throw new Error('Menu tidak ditemukan.')
  return setMenuStatus(id, 'isAvailable', !current.isAvailable)
}

type UserInput = { name: string; email: string; role: Role; password?: string }

export async function createUser(data: UserInput) {
  const session = await requireAdmin()
  const email = required(data.email, 'Email').toLowerCase()
  const passwordText = required(data.password ?? '', 'Password')
  if (passwordText.length < 8) throw new Error('Password minimal 8 karakter.')
  const user = await prisma.user.create({ data: { name: required(data.name, 'Nama'), email, role: data.role, password: await bcrypt.hash(passwordText, 10) } })
  await audit(session, 'CREATE', 'User', user.id, { email, role: data.role })
  refresh('/admin/users')
}

export async function updateUser(id: string, data: Omit<UserInput, 'password'>) {
  const session = await requireAdmin()
  const user = await prisma.user.update({ where: { id }, data: { name: required(data.name, 'Nama'), email: required(data.email, 'Email').toLowerCase(), role: data.role } })
  await audit(session, 'UPDATE', 'User', id, { email: user.email, role: user.role })
  refresh('/admin/users')
}

export async function resetUserPassword(id: string, passwordText: string) {
  const session = await requireAdmin()
  if (passwordText.length < 8) throw new Error('Password minimal 8 karakter.')
  await prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(passwordText, 10) } })
  await audit(session, 'RESET_PASSWORD', 'User', id)
  refresh('/admin/users')
}

export async function toggleUserActive(id: string) {
  const session = await requireAdmin()
  if (id === session.user.id) throw new Error('Anda tidak dapat menonaktifkan akun sendiri.')
  const current = await prisma.user.findUnique({ where: { id } })
  if (!current) throw new Error('Pengguna tidak ditemukan.')
  await prisma.user.update({ where: { id }, data: { isActive: !current.isActive } })
  await audit(session, 'TOGGLE_ACTIVE', 'User', id, { isActive: !current.isActive })
  refresh('/admin/users')
}

type DiscountInput = { name: string; code?: string; type: 'PERCENTAGE' | 'FIXED'; value: number; minPurchase?: number; startsAt?: string; endsAt?: string; isActive?: boolean }

function normalizeDiscount(data: DiscountInput) {
  if (!Number.isInteger(data.value) || data.value <= 0) throw new Error('Nilai diskon harus lebih dari nol.')
  if (data.type === 'PERCENTAGE' && data.value > 100) throw new Error('Persentase diskon maksimal 100%.')
  const startsAt = data.startsAt ? new Date(data.startsAt) : null
  const endsAt = data.endsAt ? new Date(data.endsAt) : null
  if (startsAt && endsAt && startsAt > endsAt) throw new Error('Tanggal berakhir harus setelah tanggal mulai.')
  return {
    name: required(data.name, 'Nama promo'),
    code: data.code?.trim().toUpperCase() || null,
    type: data.type,
    value: data.value,
    minPurchase: Math.max(0, data.minPurchase ?? 0),
    startsAt,
    endsAt,
    isActive: data.isActive ?? true,
  }
}

export async function createDiscount(data: DiscountInput) {
  const session = await requireAdmin()
  const normalized = normalizeDiscount(data)
  if (normalized.code && await prisma.discount.findFirst({ where: { code: normalized.code } })) throw new Error('Kode promo sudah digunakan.')
  const discount = await prisma.discount.create({ data: normalized })
  await audit(session, 'CREATE', 'Discount', discount.id, { name: discount.name, code: discount.code })
  refresh('/admin/promos')
}

export async function updateDiscount(id: string, data: DiscountInput) {
  const session = await requireAdmin()
  const normalized = normalizeDiscount(data)
  if (normalized.code && await prisma.discount.findFirst({ where: { code: normalized.code, NOT: { id } } })) throw new Error('Kode promo sudah digunakan.')
  const discount = await prisma.discount.update({ where: { id }, data: normalized })
  await audit(session, 'UPDATE', 'Discount', id, { name: discount.name, code: discount.code })
  refresh('/admin/promos')
}

export async function toggleDiscountActive(id: string) {
  const session = await requireAdmin()
  const current = await prisma.discount.findUnique({ where: { id } })
  if (!current) throw new Error('Promo tidak ditemukan.')
  await prisma.discount.update({ where: { id }, data: { isActive: !current.isActive } })
  await audit(session, 'TOGGLE_ACTIVE', 'Discount', id, { isActive: !current.isActive })
  refresh('/admin/promos')
}

export async function createTable(data: { id: string; label: string }) {
  const session = await requireAdmin()
  const id = required(data.id, 'Table ID').toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const table = await prisma.cafeTable.create({ data: { id, label: required(data.label, 'Nama meja') } })
  await audit(session, 'CREATE', 'CafeTable', table.id, { label: table.label })
  refresh('/admin/tables')
}

export async function toggleTableActive(id: string) {
  const session = await requireAdmin()
  const current = await prisma.cafeTable.findUnique({ where: { id } })
  if (!current) throw new Error('Meja tidak ditemukan.')
  await prisma.cafeTable.update({ where: { id }, data: { isActive: !current.isActive } })
  await audit(session, 'TOGGLE_ACTIVE', 'CafeTable', id, { isActive: !current.isActive })
  refresh('/admin/tables')
}

export async function updateSettings(data: { name: string; address: string; whatsapp: string; invoiceNote: string; isOpen: boolean }) {
  const session = await requireAdmin()
  await prisma.cafeSettings.upsert({
    where: { id: 'default' },
    update: { ...data, name: required(data.name, 'Nama cafe') },
    create: { id: 'default', ...data, name: required(data.name, 'Nama cafe') },
  })
  await audit(session, 'UPDATE', 'CafeSettings', 'default')
  refresh('/admin/settings', '/api/menu')
}
