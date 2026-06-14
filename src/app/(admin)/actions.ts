'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const HAS_DB = !!"placeholder"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') throw new Error('Unauthorized')
}

// Categories
export async function createCategory(data: { name: string; sortOrder?: number }) {
  await requireAdmin()
  if (!HAS_DB) throw new Error('Database not configured')
  const cat = await prisma.category.create({ data: { name: data.name, sortOrder: data.sortOrder ?? 0 } })
  revalidatePath('/admin/categories')
  revalidatePath('/api/menu')
  return cat
}

export async function updateCategory(id: string, data: { name?: string; sortOrder?: number }) {
  await requireAdmin()
  if (!HAS_DB) throw new Error('Database not configured')
  const cat = await prisma.category.update({ where: { id }, data })
  revalidatePath('/admin/categories')
  revalidatePath('/api/menu')
  return cat
}

export async function toggleCategoryActive(id: string) {
  await requireAdmin()
  if (!HAS_DB) throw new Error('Database not configured')
  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) throw new Error('Category not found')
  const cat = await prisma.category.update({ where: { id }, data: { isActive: !existing.isActive } })
  revalidatePath('/admin/categories')
  revalidatePath('/api/menu')
  return cat
}

// Menu items
export async function createMenuItem(data: { name: string; description?: string; price: number; imageEmoji?: string; categoryId: string; isAvailable?: boolean }) {
  await requireAdmin()
  if (!HAS_DB) throw new Error('Database not configured')
  const item = await prisma.menuItem.create({ data: { ...data, description: data.description ?? '', imageEmoji: data.imageEmoji ?? '🍽️' } })
  revalidatePath('/admin/menu')
  revalidatePath('/api/menu')
  return item
}

export async function updateMenuItem(id: string, data: Partial<{ name: string; description: string; price: number; imageEmoji: string; categoryId: string; isAvailable: boolean }>) {
  await requireAdmin()
  if (!HAS_DB) throw new Error('Database not configured')
  const item = await prisma.menuItem.update({ where: { id }, data })
  revalidatePath('/admin/menu')
  revalidatePath('/api/menu')
  return item
}

export async function toggleMenuItemAvailable(id: string) {
  await requireAdmin()
  if (!HAS_DB) throw new Error('Database not configured')
  const existing = await prisma.menuItem.findUnique({ where: { id } })
  if (!existing) throw new Error('MenuItem not found')
  const item = await prisma.menuItem.update({ where: { id }, data: { isAvailable: !existing.isAvailable } })
  revalidatePath('/admin/menu')
  revalidatePath('/api/menu')
  return item
}
