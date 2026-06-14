export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'DEBIT_EDC'

export type Role = 'ADMIN' | 'CASHIER' | 'KITCHEN'

export type PaymentStatus = 'UNPAID' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED'

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'QUEUED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'

export interface MenuCategory {
  id: string
  name: string
  sortOrder: number
}

export interface Category {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  imageEmoji: string
  isAvailable: boolean
  categoryId: string
  category?: Category | { id: string; name: string; sortOrder: number }
}

export interface CartItem {
  menuItem: MenuItem
  quantity: number
  note: string
}

export interface OrderItem {
  id: string
  menuItemId: string
  nameSnapshot: string
  priceSnapshot: number
  quantity: number
  note: string
  lineTotal: number
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  tableId: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  items: OrderItem[]
  subtotal: number
  total: number
  queueNumber?: number
  createdAt: string
  paidAt?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
}
