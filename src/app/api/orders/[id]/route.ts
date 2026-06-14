import { NextRequest, NextResponse } from 'next/server'
import { getOrder, confirmPayment, updateKitchenStatus } from '@/lib/order-store'
import { Order } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = getOrder(params.id)
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
    const body: PatchBody = await req.json()

    if (body.action === 'confirm_payment') {
      const order = confirmPayment(params.id)
      return NextResponse.json(order)
    }

    if (body.action === 'update_status') {
      if (!body.status) {
        return NextResponse.json({ error: 'Status wajib diisi.' }, { status: 400 })
      }
      const order = updateKitchenStatus(params.id, body.status)
      return NextResponse.json(order)
    }

    return NextResponse.json({ error: 'Action tidak dikenali.' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
