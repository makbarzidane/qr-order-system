import { NextRequest, NextResponse } from 'next/server'
import { createOrder, getAllOrders } from '@/lib/order-store'
import { CartItem, PaymentMethod } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const paidOnly = searchParams.get('paid') === 'true'
  const orders = getAllOrders().filter((o) =>
    paidOnly ? o.paymentStatus === 'PAID' : true
  )
  // newest first
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
      return NextResponse.json(
        { error: 'Nama pelanggan wajib diisi.' },
        { status: 400 }
      )
    }
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart tidak boleh kosong.' },
        { status: 400 }
      )
    }
    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Metode pembayaran wajib dipilih.' },
        { status: 400 }
      )
    }

    const orderItems = items.map((ci) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      menuItemId: ci.menuItem.id,
      nameSnapshot: ci.menuItem.name,
      priceSnapshot: ci.menuItem.price,
      quantity: ci.quantity,
      note: ci.note,
      lineTotal: ci.menuItem.price * ci.quantity,
    }))

    const subtotal = orderItems.reduce((s, i) => s + i.lineTotal, 0)

    const order = createOrder({
      customerName: customerName.trim(),
      tableId: tableId || 'unknown',
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
