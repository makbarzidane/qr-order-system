import { NextRequest, NextResponse } from 'next/server'
import { getOrder, confirmPayment, updateKitchenStatus } from '@/lib/order-store'
import { Order } from '@/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = await getOrder(params.id)
  if (!order) {
    return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 })
  }
  return NextResponse.json(order)
}

interface PatchBody {
  action: 'confirm_payment' | 'update_status'
  status?: Order['status']
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body: PatchBody = await req.json()

    if (body.action === 'confirm_payment') {
      if (!['ADMIN', 'CASHIER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const order = await confirmPayment(params.id, { id: session.user.id, name: session.user.name ?? undefined })
      return NextResponse.json(order)
    }

    if (body.action === 'update_status') {
      if (!body.status) {
        return NextResponse.json({ error: 'Status wajib diisi.' }, { status: 400 })
      }
      if (!['ADMIN', 'KITCHEN'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const order = await updateKitchenStatus(params.id, body.status, { id: session.user.id, name: session.user.name ?? undefined })
      return NextResponse.json(order)
    }

    return NextResponse.json({ error: 'Action tidak dikenali.' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
