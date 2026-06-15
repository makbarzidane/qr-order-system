import { prisma } from '@/lib/prisma'
import { PromoManager } from './promo-manager'

export default async function PromoPage() {
  const promos = await prisma.discount.findMany({ orderBy: { createdAt: 'desc' } })
  return <PromoManager promos={promos.map(p => ({...p, type: p.type === 'FIXED' ? 'FIXED' as const : 'PERCENTAGE' as const, startsAt:p.startsAt?.toISOString() ?? null, endsAt:p.endsAt?.toISOString() ?? null}))}/>
}
