/**
 * Order store — Phase 2
 *
 * Strategy:
 *   · DATABASE_URL set  → use Prisma (PostgreSQL). Persistent across Vercel lambdas.
 *   · No DATABASE_URL   → fall back to module-level Map (in-memory, resets on cold start).
 */
import { Order, OrderItem, PaymentMethod } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function generateOrderNumber(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `ORD-${date}-${rand}`
}

function generateId(): string {
  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── In-memory fallback (no DATABASE_URL) ────────────────────────────────────

const memOrders = new Map<string, Order>()
const memQueueCounters = new Map<string, number>()

function memNextQueue(): number {
  const key = getTodayKey()
  const next = (memQueueCounters.get(key) ?? 0) + 1
  memQueueCounters.set(key, next)
  return next
}

// ─── Prisma helpers ───────────────────────────────────────────────────────────

function dbRowToOrder(row: {
  id: string
  orderNumber: string
  customerName: string
  tableId: string
  status: string
  paymentStatus: string
  paymentMethod: string
  itemsJson: string
  subtotal: number
  total: number
  queueNumber: number | null
  createdAt: Date
  updatedAt: Date
  paidAt: Date | null
}): Order {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    tableId: row.tableId,
    status: row.status as Order['status'],
    paymentStatus: row.paymentStatus as Order['paymentStatus'],
    paymentMethod: row.paymentMethod as PaymentMethod,
    items: JSON.parse(row.itemsJson) as OrderItem[],
    subtotal: row.subtotal,
    total: row.total,
    queueNumber: row.queueNumber ?? undefined,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString(),
  }
}

// ─── Feature flag ─────────────────────────────────────────────────────────────
const HAS_DB = !!"placeholder"

// ─── Public API (all async) ───────────────────────────────────────────────────

export type CreateOrderInput = Omit<
  Order,
  'id' | 'orderNumber' | 'status' | 'paymentStatus' | 'createdAt' | 'queueNumber' | 'paidAt'
>

export async function createOrder(data: CreateOrderInput): Promise<Order> {
  if (!data.customerName?.trim()) {
    throw new Error('Nama pelanggan wajib diisi.')
  }

  const id = generateId()
  const orderNumber = generateOrderNumber()

  if (HAS_DB) {
    const { prisma } = await import('./prisma')
    const row = await prisma.order.create({
      data: {
        id,
        orderNumber,
        customerName: data.customerName.trim(),
        tableId: data.tableId || '',
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        paymentMethod: data.paymentMethod,
        itemsJson: JSON.stringify(data.items),
        subtotal: data.subtotal,
        total: data.total,
      },
    })
    return dbRowToOrder(row)
  }

  // Fallback: in-memory
  const order: Order = {
    ...data,
    id,
    orderNumber,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'UNPAID',
    createdAt: new Date().toISOString(),
  }
  memOrders.set(id, order)
  return order
}

export async function getOrder(id: string): Promise<Order | null> {
  if (HAS_DB) {
    const { prisma } = await import('./prisma')
    const row = await prisma.order.findUnique({ where: { id } })
    return row ? dbRowToOrder(row) : null
  }
  return memOrders.get(id) ?? null
}

export async function getAllOrders(paidOnly = false, statusFilter?: string): Promise<Order[]> {
  if (HAS_DB) {
    const { prisma } = await import('./prisma')
    const where: Record<string, unknown> = {}
    if (paidOnly) where.paymentStatus = 'PAID'
    if (statusFilter) where.status = statusFilter
    const rows = await prisma.order.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(dbRowToOrder)
  }

  let orders = Array.from(memOrders.values())
  if (paidOnly) orders = orders.filter((o) => o.paymentStatus === 'PAID')
  if (statusFilter) orders = orders.filter((o) => o.status === statusFilter)
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function confirmPayment(id: string): Promise<Order> {
  if (HAS_DB) {
    const { prisma } = await import('./prisma')

    // Idempotent: if already PAID, return as-is
    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) throw new Error('Order tidak ditemukan.')
    if (existing.paymentStatus === 'PAID') return dbRowToOrder(existing)

    // Get next queue number atomically
    const dateKey = getTodayKey()
    const counter = await prisma.queueCounter.upsert({
      where: { dateKey },
      update: { counter: { increment: 1 } },
      create: { dateKey, counter: 1 },
    })

    const row = await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        status: 'QUEUED',
        queueNumber: counter.counter,
        paidAt: new Date(),
      },
    })
    return dbRowToOrder(row)
  }

  // Fallback: in-memory
  const order = memOrders.get(id)
  if (!order) throw new Error('Order tidak ditemukan.')
  if (order.paymentStatus === 'PAID') return order
  const queueNumber = memNextQueue()
  const updated: Order = {
    ...order,
    paymentStatus: 'PAID',
    status: 'QUEUED',
    queueNumber,
    paidAt: new Date().toISOString(),
  }
  memOrders.set(id, updated)
  return updated
}

export async function updateKitchenStatus(
  id: string,
  status: Order['status']
): Promise<Order> {
  const allowed: Order['status'][] = ['QUEUED', 'PREPARING', 'READY', 'COMPLETED']
  if (!allowed.includes(status)) throw new Error('Status tidak valid.')

  if (HAS_DB) {
    const { prisma } = await import('./prisma')
    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) throw new Error('Order tidak ditemukan.')
    if (existing.paymentStatus !== 'PAID') {
      throw new Error('Order belum PAID. Kitchen tidak boleh memproses order ini.')
    }
    const row = await prisma.order.update({ where: { id }, data: { status } })
    return dbRowToOrder(row)
  }

  const order = memOrders.get(id)
  if (!order) throw new Error('Order tidak ditemukan.')
  if (order.paymentStatus !== 'PAID') {
    throw new Error('Order belum PAID. Kitchen tidak boleh memproses order ini.')
  }
  const updated: Order = { ...order, status }
  memOrders.set(id, updated)
  return updated
}
