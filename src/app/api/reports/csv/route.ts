import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withDatabaseRetry } from '@/lib/db-retry'
import type { PaymentMethod } from '@/types'

const paymentMethods: PaymentMethod[] = ['CASH', 'QRIS', 'TRANSFER', 'DEBIT_EDC']
const methods = new Set(paymentMethods)
const periods = ['day', 'week', 'month', 'year'] as const
type Period = typeof periods[number]

const periodLabels: Record<Period, string> = {
  day: 'Harian',
  week: 'Mingguan',
  month: 'Bulanan',
  year: 'Tahunan',
}

const methodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  QRIS: 'QRIS',
  TRANSFER: 'Transfer',
  DEBIT_EDC: 'Debit / EDC',
}

function parseDate(value: string | null, fallback: Date, end = false) {
  if (!value) return fallback
  const parsed = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function startOfDay(date = new Date()) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function startOfWeek(date = new Date()) {
  const value = startOfDay(date)
  const day = value.getDay() || 7
  value.setDate(value.getDate() - day + 1)
  return value
}

function endOfWeek(date = new Date()) {
  const value = startOfWeek(date)
  value.setDate(value.getDate() + 6)
  value.setHours(23, 59, 59, 999)
  return value
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function resolvePeriod(value: string | null): Period {
  return periods.includes(value as Period) ? value as Period : 'day'
}

function groupLabel(date: Date, period: Period) {
  if (period === 'year') return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(date)
  if (period === 'month') return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', month: 'long', year: 'numeric' }).format(date)
  if (period === 'week') {
    const start = startOfWeek(date)
    const end = endOfWeek(date)
    const fmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short' })
    return `${fmt.format(start)} - ${fmt.format(end)}`
  }
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function groupKey(date: Date, period: Period) {
  if (period === 'year') return `${date.getFullYear()}`
  if (period === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  if (period === 'week') return dateInputValue(startOfWeek(date))
  return dateInputValue(date)
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function toCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const query = req.nextUrl.searchParams
  const from = parseDate(query.get('from'), new Date(0))
  const to = parseDate(query.get('to'), new Date(), true)
  const period = resolvePeriod(query.get('period'))
  const method = query.get('method')
  const paymentMethod = method && methods.has(method as PaymentMethod) ? method as PaymentMethod : undefined

  let orders: Awaited<ReturnType<typeof prisma.order.findMany>>
  try {
    orders = await withDatabaseRetry(() => prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        paidAt: { gte: from, lte: to },
        ...(paymentMethod ? { paymentMethod } : {}),
      },
      orderBy: { paidAt: 'desc' },
    }))
  } catch {
    const csv = toCsv([['Error'], ['Database belum bisa dihubungi. Periksa DATABASE_URL/Neon lalu coba export ulang.']])

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-order-error-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const grouped = new Map<string, { label: string; count: number; total: number; methods: Record<PaymentMethod, number> }>()
  const breakdown: Record<PaymentMethod, { count: number; total: number }> = {
    CASH: { count: 0, total: 0 },
    QRIS: { count: 0, total: 0 },
    TRANSFER: { count: 0, total: 0 },
    DEBIT_EDC: { count: 0, total: 0 },
  }
  let grandSubtotal = 0
  let grandDiscount = 0
  let grandTotal = 0

  orders.forEach((order) => {
    if (!order.paidAt) return
    const key = groupKey(order.paidAt, period)
    const current = grouped.get(key) ?? { label: groupLabel(order.paidAt, period), count: 0, total: 0, methods: { CASH: 0, QRIS: 0, TRANSFER: 0, DEBIT_EDC: 0 } }
    current.count += 1
    current.total += order.total
    current.methods[order.paymentMethod as PaymentMethod] += order.total
    grouped.set(key, current)

    breakdown[order.paymentMethod as PaymentMethod].count += 1
    breakdown[order.paymentMethod as PaymentMethod].total += order.total
    grandSubtotal += order.subtotal
    grandDiscount += order.discountAmount
    grandTotal += order.total
  })

  const groupedRows = Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([, value]) => value)
  const rows = [
    ['Laporan QR Order System'],
    ['Periode Rekap', periodLabels[period]],
    ['Tanggal Dari', dateInputValue(from)],
    ['Tanggal Sampai', dateInputValue(to)],
    ['Metode Filter', paymentMethod ? methodLabels[paymentMethod] : 'Semua metode'],
    [],
    ['Ringkasan Metode Pembayaran'],
    ['Metode', 'Transaksi', 'Total'],
    ...paymentMethods.map((item) => [methodLabels[item], breakdown[item].count, breakdown[item].total]),
    ['TOTAL KESELURUHAN', orders.length, grandTotal],
    [],
    [`Rekap ${periodLabels[period]}`],
    ['Periode', 'Transaksi', 'Cash', 'QRIS', 'Transfer', 'Debit / EDC', 'Total'],
    ...groupedRows.map((row) => [
      row.label,
      row.count,
      row.methods.CASH,
      row.methods.QRIS,
      row.methods.TRANSFER,
      row.methods.DEBIT_EDC,
      row.total,
    ]),
    ['TOTAL KESELURUHAN', orders.length, ...paymentMethods.map((item) => breakdown[item].total), grandTotal],
    [],
    ['Detail Transaksi'],
    ['Tanggal Bayar', 'Order', 'Customer', 'Meja', 'Metode', 'Subtotal', 'Diskon', 'Total'],
    ...orders.map((order) => [
      order.paidAt?.toISOString(),
      order.orderNumber,
      order.customerName,
      order.tableId,
      methodLabels[order.paymentMethod as PaymentMethod] ?? order.paymentMethod,
      order.subtotal,
      order.discountAmount,
      order.total,
    ]),
    ['TOTAL KESELURUHAN', '', '', '', '', grandSubtotal, grandDiscount, grandTotal],
  ]
  const csv = toCsv(rows)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="laporan-order-${period}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
