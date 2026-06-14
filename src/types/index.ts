export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'DEBIT_EDC'

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'READY'
  | 'DONE'
  | 'CANCELLED'

export type PaymentStatus = 'UNPAID' | 'PAID'

export interface MenuCategory {
  id: string
  name: string
  sortOrder: number
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  categoryId: string
  imageEmoji: string
  isAvailable: boolean
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
