/**
 * Phase 1: In-memory order store.
 * NOTE: Resets on server restart / cold start. Replace with Prisma + PostgreSQL in Phase 2.
 */
import { Order } from '@/types'

// Module-level store — persists across requests within same Node.js process
const orders = new Map<string, Order>()

// Queue counter per date (resets daily in real impl)
const queueCounters = new Map<string, number>()

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

function nextQueueNumber(): number {
  const key = getTodayKey()
  const current = queueCounters.get(key) ?? 0
  const next = current + 1
  queueCounters.set(key, next)
  return next
}

function generateOrderNumber(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `ORD-${date}-${rand}`
}

export function createOrder(data: Omit<Order, 'id' | 'orderNumber' | 'status' | 'paymentStatus' | 'createdAt' | 'queueNumber'>): Order {
  if (!data.customerName?.trim()) {
    throw new Error('Nama pelanggan wajib diisi.')
  }

  const id = `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const order: Order = {
    ...data,
    id,
    orderNumber: generateOrderNumber(),
    status: 'PENDING_PAYMENT',
    paymentStatus: 'UNPAID',
    createdAt: new Date().toISOString(),
  }
  orders.set(id, order)
  return order
}

export function getOrder(id: string): Order | undefined {
  return orders.get(id)
}

export function getAllOrders(): Order[] {
  return Array.from(orders.values())
}

export function getPaidOrders(): Order[] {
  return Array.from(orders.values()).filter((o) => o.paymentStatus === 'PAID')
}

export function confirmPayment(id: string): Order {
  const order = orders.get(id)
  if (!order) throw new Error('Order tidak ditemukan.')
  if (order.paymentStatus === 'PAID') return order // idempotent

  const queueNumber = nextQueueNumber()
  const updated: Order = {
    ...order,
    paymentStatus: 'PAID',
    status: 'PAID',
    queueNumber,
    paidAt: new Date().toISOString(),
  }
  orders.set(id, updated)
  return updated
}

export function updateKitchenStatus(id: string, status: Order['status']): Order {
  const order = orders.get(id)
  if (!order) throw new Error('Order tidak ditemukan.')
  if (order.paymentStatus !== 'PAID') {
    throw new Error('Order belum PAID. Kitchen tidak boleh memproses order ini.')
  }
  const allowed: Order['status'][] = ['PAID', 'IN_PROGRESS', 'READY', 'DONE']
  if (!allowed.includes(status)) throw new Error('Status tidak valid.')

  const updated: Order = { ...order, status }
  orders.set(id, updated)
  return updated
}
