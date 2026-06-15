import { prisma } from '@/lib/prisma'
import { MENU_ITEMS } from '@/lib/menu-data'
import type { Order, OrderItem, PaymentMethod } from '@/types'

const HAS_DB = Boolean(process.env.DATABASE_URL)
const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'QRIS', 'TRANSFER', 'DEBIT_EDC']
const memOrders = new Map<string, Order>()
const memQueueCounters = new Map<string, number>()

function isDatabaseUnavailable(error: unknown) {
  if (!(error instanceof Error)) return false
  return error.message.includes("Can't reach database server") || error.name === 'PrismaClientInitializationError'
}

function auditUserId(actor?: { id?: string }) {
  return actor?.id?.includes('@') ? undefined : actor?.id
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

function generateOrderNumber() {
  const compactDate = todayKey().replaceAll('-', '')
  return `ORD-${compactDate}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
}

function rowToOrder(row: {
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
  discountCode: string | null
  discountName: string | null
  discountAmount: number
  queueNumber: number | null
  createdAt: Date
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
    discountCode: row.discountCode ?? undefined,
    discountName: row.discountName ?? undefined,
    discountAmount: row.discountAmount,
    queueNumber: row.queueNumber ?? undefined,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString(),
  }
}

async function resolveDiscount(code: string | undefined, subtotal: number) {
  if (!code?.trim() || !HAS_DB) return { amount: 0 }
  const normalized = code.trim().toUpperCase()
  const now = new Date()
  let discount
  try {
    discount = await prisma.discount.findFirst({ where: { code: normalized } })
  } catch (error) {
    if (isDatabaseUnavailable(error)) return { amount: 0 }
    throw error
  }
  if (!discount || !discount.isActive) throw new Error('Kode promo tidak valid atau tidak aktif.')
  if (discount.startsAt && discount.startsAt > now) throw new Error('Promo belum dimulai.')
  if (discount.endsAt && discount.endsAt < now) throw new Error('Promo sudah berakhir.')
  if (subtotal < discount.minPurchase) throw new Error(`Minimal pembelian promo adalah Rp${discount.minPurchase.toLocaleString('id-ID')}.`)

  const raw = discount.type === 'PERCENTAGE'
    ? Math.floor(subtotal * Math.min(discount.value, 100) / 100)
    : discount.value

  return {
    code: discount.code ?? undefined,
    name: discount.name,
    amount: Math.min(Math.max(raw, 0), subtotal),
  }
}

function createMemoryOrder(input: {
  id: string
  customerName: string
  tableId: string
  paymentMethod: PaymentMethod
  items: OrderItem[]
  subtotal: number
  total: number
  discount?: { code?: string; name?: string; amount: number }
}) {
  const order: Order = {
    id: input.id,
    orderNumber: generateOrderNumber(),
    customerName: input.customerName,
    tableId: input.tableId,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'UNPAID',
    paymentMethod: input.paymentMethod,
    items: input.items,
    subtotal: input.subtotal,
    total: input.total,
    discountCode: input.discount?.code,
    discountName: input.discount?.name,
    discountAmount: input.discount?.amount ?? 0,
    createdAt: new Date().toISOString(),
  }
  memOrders.set(input.id, order)
  return order
}

function listMemoryOrders(paidOnly = false, statusFilter?: string) {
  return Array.from(memOrders.values())
    .filter((order) => !paidOnly || order.paymentStatus === 'PAID')
    .filter((order) => !statusFilter || order.status === statusFilter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function confirmMemoryPayment(id: string) {
  const order = memOrders.get(id)
  if (!order) throw new Error('Order tidak ditemukan.')
  if (order.paymentStatus === 'PAID') throw new Error('Order sudah dibayar dan tidak dapat dikonfirmasi ulang.')
  const key = todayKey()
  const queueNumber = (memQueueCounters.get(key) ?? 0) + 1
  memQueueCounters.set(key, queueNumber)
  const updated: Order = { ...order, paymentStatus: 'PAID', status: 'QUEUED', queueNumber, paidAt: new Date().toISOString() }
  memOrders.set(id, updated)
  return updated
}

function updateMemoryKitchenStatus(id: string, status: Order['status']) {
  const transitions: Partial<Record<Order['status'], Order['status']>> = { QUEUED: 'PREPARING', PREPARING: 'READY', READY: 'COMPLETED' }
  const order = memOrders.get(id)
  if (!order) throw new Error('Order tidak ditemukan.')
  if (order.paymentStatus !== 'PAID' || transitions[order.status] !== status) throw new Error('Transisi status tidak valid.')
  const updated = { ...order, status }
  memOrders.set(id, updated)
  return updated
}

export async function createOrder(input: {
  customerName: string
  tableId: string
  paymentMethod: PaymentMethod
  items: Array<{ menuItem: { id: string }; quantity: number; note?: string }>
  discountCode?: string
}): Promise<Order> {
  const customerName = input.customerName.trim()
  if (!customerName) throw new Error('Nama pelanggan wajib diisi.')
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) throw new Error('Metode pembayaran tidak valid.')
  if (!input.items.length) throw new Error('Cart tidak boleh kosong.')
  if (input.items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    throw new Error('Jumlah item tidak valid.')
  }

  const ids = Array.from(new Set(input.items.map((item) => item.menuItem.id)))
  let useMemory = !HAS_DB
  let products = MENU_ITEMS.filter((item) => ids.includes(item.id) && item.isAvailable)
  if (HAS_DB) {
    try {
      products = await prisma.menuItem.findMany({ where: { id: { in: ids }, isActive: true, isAvailable: true, category: { isActive: true } } })
    } catch (error) {
      if (!isDatabaseUnavailable(error)) throw error
      console.warn('Database unavailable, creating demo order in memory', error)
      useMemory = true
    }
  }
  const productMap = new Map(products.map((item) => [item.id, item]))
  if (productMap.size !== ids.length) throw new Error('Ada menu yang sudah tidak tersedia. Silakan perbarui keranjang.')

  const items: OrderItem[] = input.items.map((cartItem, index) => {
    const product = productMap.get(cartItem.menuItem.id)!
    return {
      id: `item-${Date.now()}-${index}`,
      menuItemId: product.id,
      nameSnapshot: product.name,
      priceSnapshot: product.price,
      quantity: cartItem.quantity,
      note: cartItem.note?.trim() ?? '',
      lineTotal: product.price * cartItem.quantity,
    }
  })
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const discount = await resolveDiscount(input.discountCode, subtotal)
  const total = Math.max(subtotal - discount.amount, 0)
  const id = crypto.randomUUID()

  if (useMemory) {
    return createMemoryOrder({
      id,
      customerName,
      tableId: input.tableId,
      paymentMethod: input.paymentMethod,
      items,
      subtotal,
      total,
      discount,
    })
  }

  try {
    const row = await prisma.order.create({
      data: {
        id,
        orderNumber: generateOrderNumber(),
        customerName,
        tableId: input.tableId.trim(),
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        paymentMethod: input.paymentMethod,
        itemsJson: JSON.stringify(items),
        subtotal,
        total,
        discountCode: discount.code,
        discountName: discount.name,
        discountAmount: discount.amount,
      },
    })
    return rowToOrder(row)
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error
    console.warn('Database unavailable, storing order in memory', error)
    return createMemoryOrder({ id, customerName, tableId: input.tableId, paymentMethod: input.paymentMethod, items, subtotal, total, discount })
  }
}

export async function getOrder(id: string) {
  if (!HAS_DB) return memOrders.get(id) ?? null
  try {
    const row = await prisma.order.findUnique({ where: { id } })
    return row ? rowToOrder(row) : memOrders.get(id) ?? null
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error
    return memOrders.get(id) ?? null
  }
}

export async function getAllOrders(paidOnly = false, statusFilter?: string) {
  if (!HAS_DB) return listMemoryOrders(paidOnly, statusFilter)
  try {
    const rows = await prisma.order.findMany({
      where: {
        ...(paidOnly ? { paymentStatus: 'PAID' } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(rowToOrder)
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error
    return listMemoryOrders(paidOnly, statusFilter)
  }
}

export async function confirmPayment(id: string, actor?: { id?: string; name?: string }) {
  if (!HAS_DB || memOrders.has(id)) return confirmMemoryPayment(id)

  try {
    const row = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id } })
      if (!existing) throw new Error('Order tidak ditemukan.')
      if (existing.paymentStatus === 'PAID') throw new Error('Order sudah dibayar dan tidak dapat dikonfirmasi ulang.')
      if (existing.paymentStatus !== 'UNPAID' || existing.status !== 'PENDING_PAYMENT') throw new Error('Status order tidak dapat dibayar.')

      const counter = await tx.queueCounter.upsert({
        where: { dateKey: todayKey() },
        update: { counter: { increment: 1 } },
        create: { dateKey: todayKey(), counter: 1 },
      })
      const updated = await tx.order.update({
        where: { id },
        data: { paymentStatus: 'PAID', status: 'QUEUED', queueNumber: counter.counter, paidAt: new Date(), confirmedById: actor?.id },
      })
      await tx.auditLog.create({
        data: { userId: auditUserId(actor), userName: actor?.name, action: 'CONFIRM_PAYMENT', entity: 'Order', entityId: id, metadata: JSON.stringify({ queueNumber: counter.counter, total: updated.total }) },
      })
      return updated
    })
    return rowToOrder(row)
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error
    return confirmMemoryPayment(id)
  }
}

export async function updateKitchenStatus(id: string, status: Order['status'], actor?: { id?: string; name?: string }) {
  const transitions: Partial<Record<Order['status'], Order['status']>> = { QUEUED: 'PREPARING', PREPARING: 'READY', READY: 'COMPLETED' }
  if (!HAS_DB || memOrders.has(id)) return updateMemoryKitchenStatus(id, status)

  try {
    const row = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id } })
      if (!existing) throw new Error('Order tidak ditemukan.')
      if (existing.paymentStatus !== 'PAID') throw new Error('Order belum dibayar.')
      if (transitions[existing.status as Order['status']] !== status) throw new Error('Transisi status tidak valid.')
      const updated = await tx.order.update({ where: { id }, data: { status } })
      await tx.auditLog.create({
        data: { userId: auditUserId(actor), userName: actor?.name, action: 'UPDATE_KITCHEN_STATUS', entity: 'Order', entityId: id, metadata: JSON.stringify({ from: existing.status, to: status }) },
      })
      return updated
    })
    return rowToOrder(row)
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error
    return updateMemoryKitchenStatus(id, status)
  }
}
