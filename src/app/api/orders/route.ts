import { NextRequest, NextResponse } from 'next/server'
import { createOrder, getAllOrders } from '@/lib/order-store'
import { PaymentMethod } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const paidOnly = searchParams.get('paid') === 'true'
  const statusFilter = searchParams.get('status') ?? undefined
  const orders = await getAllOrders(paidOnly, statusFilter)
  return NextResponse.json(orders)
}

interface CreateOrderBody {
  customerName: string
  tableId: string
  paymentMethod: PaymentMethod
  items: Array<{ menuItem: { id: string }; quantity: number; note?: string }>
  discountCode?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateOrderBody = await req.json()
    const { customerName, tableId, paymentMethod, items, discountCode } = body

    if (!customerName?.trim()) {
      return NextResponse.json({ error: 'Nama pelanggan wajib diisi.' }, { status: 400 })
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart tidak boleh kosong.' }, { status: 400 })
    }
    if (!paymentMethod) {
      return NextResponse.json({ error: 'Metode pembayaran wajib dipilih.' }, { status: 400 })
    }

    const order = await createOrder({
      customerName: customerName.trim(),
      tableId: tableId || '',
      paymentMethod,
      items,
      discountCode,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
