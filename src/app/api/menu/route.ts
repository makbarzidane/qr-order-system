import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const HAS_DB = Boolean(process.env.DATABASE_URL)

export async function GET(req: NextRequest) {
  if (!HAS_DB) {
    return NextResponse.json({ categories: [], items: [], fallback: true })
  }
  try {
    const adminMode = req.nextUrl.searchParams.get('admin') === '1' && (await getServerSession(authOptions))?.user.role === 'ADMIN'
    const { prisma } = await import('@/lib/prisma')
    const [categories, items, settings] = await Promise.all([
      prisma.category.findMany({
        where: adminMode ? undefined : { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.menuItem.findMany({
        where: adminMode ? undefined : { isActive: true, isAvailable: true, category: { isActive: true } },
        include: { category: { select: { id: true, name: true, sortOrder: true } } },
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      }),
      prisma.cafeSettings.findUnique({ where: { id: 'default' } }),
    ])
    return NextResponse.json({ categories, items, settings })
  } catch (err) {
    console.error('Menu fetch error:', err)
    return NextResponse.json({ categories: [], items: [], error: 'DB error' }, { status: 500 })
  }
}
