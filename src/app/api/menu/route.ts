import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const HAS_DB = !!"placeholder"

export async function GET() {
  if (!HAS_DB) {
    return NextResponse.json({ categories: [], items: [], fallback: true })
  }
  try {
    const [categories, items] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.menuItem.findMany({
        where: { category: { isActive: true } },
        include: { category: { select: { id: true, name: true, sortOrder: true } } },
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      }),
    ])
    return NextResponse.json({ categories, items })
  } catch (err) {
    console.error('Menu fetch error:', err)
    return NextResponse.json({ categories: [], items: [], error: 'DB error' }, { status: 500 })
  }
}
