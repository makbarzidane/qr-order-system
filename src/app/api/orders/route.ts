import { NextRequest, NextResponse } from 'next/server'
import { createOrder, getAllOrders } from '@/lib/order-store'
import { CartItem, PaymentMethod } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const paidOnly = searchParams.get('paid') === 'true'
  const orders = await getAllOrders(paidOnly)
  return NextResponse.json(orders)
}

interface CreateOrderBody {
  customerName: string
  tableId: string
  paymentMethod: PaymentMethod
  items: CartItem[]
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateOrderBody = await req.json()
    const { customerName, tableId, paymentMethod, items } = body

    if (!customerName?.trim()) {
      return NextResponse.json({ error: 'Nama pelanggan wajib diisi.' }, { status: 400 })
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart tidak boleh kosong.' }, { status: 400 })
    }
    if (!paymentMethod) {
      return NextResponse.json({ error: 'Metode pembayaran wajib dipilih.' }, { status: 400 })
    }

    const orderItems = items.map((ci, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      menuItemId: ci.menuItem.id,
      nameSnapshot: ci.menuItem.name,
      priceSnapshot: ci.menuItem.price,
      quantity: ci.quantity,
      note: ci.note || '',
      lineTotal: ci.menuItem.price * ci.quantity,
    }))

    const subtotal = orderItems.reduce((s, i) => s + i.lineTotal, 0)

    const order = await createOrder({
      customerName: customerName.trim(),
      tableId: tableId || '',
      paymentMethod,
      items: orderItems,
      subtotal,
      total: subtotal,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
