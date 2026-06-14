'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react'
import { CartItem, MenuItem } from '@/types'

interface CartState {
  items: CartItem[]
  tableId: string
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { menuItem: MenuItem; note?: string } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QTY'; payload: { menuItemId: string; quantity: number } }
  | { type: 'UPDATE_NOTE'; payload: { menuItemId: string; note: string } }
  | { type: 'CLEAR' }
  | { type: 'SET_TABLE'; payload: string }
  | { type: 'HYDRATE'; payload: CartState }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_TABLE':
      // Return same reference if unchanged — prevents unnecessary re-renders
      if (state.tableId === action.payload) return state
      return { ...state, tableId: action.payload }
    case 'ADD_ITEM': {
      const existing = state.items.find(
        (i) => i.menuItem.id === action.payload.menuItem.id
      )
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.menuItem.id === action.payload.menuItem.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            menuItem: action.payload.menuItem,
            quantity: 1,
            note: action.payload.note ?? '',
          },
        ],
      }
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => i.menuItem.id !== action.payload),
      }
    case 'UPDATE_QTY':
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.menuItem.id !== action.payload.menuItemId),
        }
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.menuItem.id === action.payload.menuItemId
            ? { ...i, quantity: action.payload.quantity }
            : i
        ),
      }
    case 'UPDATE_NOTE':
      return {
        ...state,
        items: state.items.map((i) =>
          i.menuItem.id === action.payload.menuItemId
            ? { ...i, note: action.payload.note }
            : i
        ),
      }
    case 'CLEAR':
      return { ...state, items: [] }
    case 'HYDRATE':
      return action.payload
    default:
      return state
  }
}

const STORAGE_KEY = 'qr-order-cart'

interface CartContextValue {
  state: CartState
  /** true once localStorage has been read — guards against redirects before hydration */
  isHydrated: boolean
  addItem: (menuItem: MenuItem, note?: string) => void
  removeItem: (menuItemId: string) => void
  updateQty: (menuItemId: string, quantity: number) => void
  updateNote: (menuItemId: string, note: string) => void
  clearCart: () => void
  setTable: (tableId: string) => void
  totalItems: number
  subtotal: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], tableId: '' })
  const [isHydrated, setIsHydrated] = useState(false)

  // ── 1. Read localStorage once on mount ──────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: CartState = JSON.parse(stored)
        dispatch({ type: 'HYDRATE', payload: parsed })
      }
    } catch {
      // corrupted storage — start fresh
    } finally {
      setIsHydrated(true)
    }
  }, [])

  // ── 2. Persist to localStorage (only after hydration, so we never overwrite
  //       good data with the empty initial state) ───────────────────────────────
  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full or unavailable — ignore
    }
  }, [state, isHydrated])

  // ── Stable function references (useCallback) so useEffect deps in pages
  //    won't trigger infinite re-render loops ───────────────────────────────────
  const addItem = useCallback(
    (menuItem: MenuItem, note?: string) =>
      dispatch({ type: 'ADD_ITEM', payload: { menuItem, note } }),
    []
  )
  const removeItem = useCallback(
    (menuItemId: string) => dispatch({ type: 'REMOVE_ITEM', payload: menuItemId }),
    []
  )
  const updateQty = useCallback(
    (menuItemId: string, quantity: number) =>
      dispatch({ type: 'UPDATE_QTY', payload: { menuItemId, quantity } }),
    []
  )
  const updateNote = useCallback(
    (menuItemId: string, note: string) =>
      dispatch({ type: 'UPDATE_NOTE', payload: { menuItemId, note } }),
    []
  )
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const setTable = useCallback(
    (tableId: string) => dispatch({ type: 'SET_TABLE', payload: tableId }),
    []
  )

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = state.items.reduce(
    (sum, i) => sum + i.menuItem.price * i.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        state,
        isHydrated,
        addItem,
        removeItem,
        updateQty,
        updateNote,
        clearCart,
        setTable,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
