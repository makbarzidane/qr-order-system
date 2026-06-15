import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const methods = new Set(['CASH', 'QRIS', 'TRANSFER', 'DEBIT_EDC'])

function parseDate(value: string | null, fallback: Date, end = false) {
  if (!value) return fallback
  const parsed = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const query = req.nextUrl.searchParams
  const from = parseDate(query.get('from'), new Date(0))
  const to = parseDate(query.get('to'), new Date(), true)
  const method = query.get('method')
  const paymentMethod = method && methods.has(method) ? method : undefined

  let orders: Awaited<ReturnType<typeof prisma.order.findMany>>
  try {
    orders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        paidAt: { gte: from, lte: to },
        ...(paymentMethod ? { paymentMethod } : {}),
      },
      orderBy: { paidAt: 'desc' },
    })
  } catch {
    const csv = [['Error'], ['Database belum bisa dihubungi. Periksa DATABASE_URL/Neon lalu coba export ulang.']]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-order-error-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const rows = [
    ['Tanggal Bayar', 'Order', 'Customer', 'Meja', 'Metode', 'Subtotal', 'Diskon', 'Total'],
    ...orders.map((order) => [
      order.paidAt?.toISOString(),
      order.orderNumber,
      order.customerName,
      order.tableId,
      order.paymentMethod,
      order.subtotal,
      order.discountAmount,
      order.total,
    ]),
  ]
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="laporan-order-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
