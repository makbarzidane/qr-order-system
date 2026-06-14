import { CartProvider } from '@/contexts/CartContext'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
