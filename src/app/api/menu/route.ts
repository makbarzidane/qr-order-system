import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CATEGORIES, MENU_ITEMS } from '@/lib/menu-data'

export const dynamic = 'force-dynamic'

const HAS_DB = Boolean(process.env.DATABASE_URL)
const fallbackSettings = { name: 'QR Order Cafe', isOpen: true }
const fallbackImages = new Map(MENU_ITEMS.map((item) => [item.id, item.imageUrl]))

function fallbackMenu() {
  return {
    categories: CATEGORIES.map((category) => ({ ...category, isActive: true })),
    items: MENU_ITEMS.filter((item) => item.isAvailable).map((item) => ({ ...item, isActive: true })),
    settings: fallbackSettings,
    fallback: true,
  }
}

export async function GET(req: NextRequest) {
  if (!HAS_DB) {
    return NextResponse.json(fallbackMenu())
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
    const itemsWithFallbackImages = items.map((item) => ({
      ...item,
      imageUrl: item.imageUrl ?? fallbackImages.get(item.id) ?? null,
    }))
    return NextResponse.json({ categories, items: itemsWithFallbackImages, settings })
  } catch (err) {
    console.warn('Menu fetch error:', err)
    return NextResponse.json({ ...fallbackMenu(), error: 'Menu database belum bisa dihubungi. Menampilkan menu demo.' })
  }
}
