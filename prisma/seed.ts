import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Users
  const users = [
    { email: 'admin@qrorder.app',   name: 'Admin',  role: Role.ADMIN,   password: 'admin123' },
    { email: 'cashier@qrorder.app', name: 'Kasir',  role: Role.CASHIER, password: 'cashier123' },
    { email: 'kitchen@qrorder.app', name: 'Dapur',  role: Role.KITCHEN, password: 'kitchen123' },
  ]
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10)
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, name: u.name, role: u.role, password: hash, isActive: true },
    })
    console.log(`  ✓ User: ${u.email} (${u.role}) password: ${u.password}`)
  }

  // Categories
  const cats = [
    { id: 'cat-kopi',    name: 'Kopi',     sortOrder: 1 },
    { id: 'cat-nonkopi', name: 'Non-Kopi', sortOrder: 2 },
    { id: 'cat-makanan', name: 'Makanan',  sortOrder: 3 },
    { id: 'cat-snack',   name: 'Snack',    sortOrder: 4 },
  ]
  for (const c of cats) {
    await prisma.category.upsert({ where: { id: c.id }, update: { name: c.name, sortOrder: c.sortOrder, isActive: true }, create: { ...c, isActive: true } })
  }
  console.log(`  ✓ Categories: ${cats.length}`)

  // Menu items
  const items = [
    { id: 'menu-1',  name: 'Es Kopi Susu',       description: 'Espresso, susu segar, dan es batu. Klasik, segar, dan kaya rasa.',    price: 18000, imageEmoji: '☕',  categoryId: 'cat-kopi',    isAvailable: true },
    { id: 'menu-2',  name: 'Americano',           description: 'Espresso double shot dengan air panas. Pahit sempurna.',              price: 15000, imageEmoji: '🖤',  categoryId: 'cat-kopi',    isAvailable: true },
    { id: 'menu-3',  name: 'Cappuccino',          description: 'Espresso dengan foam susu tebal. Klasik Italia.',                    price: 22000, imageEmoji: '☕',  categoryId: 'cat-kopi',    isAvailable: true },
    { id: 'menu-4',  name: 'Latte',               description: 'Espresso lembut dengan susu steam berlimpah.',                       price: 22000, imageEmoji: '🥛',  categoryId: 'cat-kopi',    isAvailable: true },
    { id: 'menu-5',  name: 'Kopi Tubruk',         description: 'Kopi tradisional Indonesia, diseduh langsung tanpa filter.',         price: 10000, imageEmoji: '☕',  categoryId: 'cat-kopi',    isAvailable: true },
    { id: 'menu-6',  name: 'Matcha Latte',        description: 'Matcha premium Jepang dengan susu segar. Earthy dan creamy.',        price: 25000, imageEmoji: '🍵',  categoryId: 'cat-nonkopi', isAvailable: true },
    { id: 'menu-7',  name: 'Coklat Susu',         description: 'Cokelat belgique rich dengan susu panas atau dingin.',               price: 20000, imageEmoji: '🍫',  categoryId: 'cat-nonkopi', isAvailable: true },
    { id: 'menu-8',  name: 'Es Teh Manis',        description: 'Teh hitam segar dengan gula aren. Segar dan ringan.',                price: 8000,  imageEmoji: '🧋',  categoryId: 'cat-nonkopi', isAvailable: true },
    { id: 'menu-9',  name: 'Jus Alpukat',         description: 'Alpukat segar blended dengan susu dan cokelat.',                    price: 20000, imageEmoji: '🥑',  categoryId: 'cat-nonkopi', isAvailable: false },
    { id: 'menu-10', name: 'Nasi Goreng Spesial', description: 'Nasi goreng dengan telur, ayam suwir, dan acar. Favorit pelanggan.', price: 28000, imageEmoji: '🍳',  categoryId: 'cat-makanan', isAvailable: true },
    { id: 'menu-11', name: 'Mie Goreng',          description: 'Mie goreng dengan sayuran segar dan bumbu spesial.',                 price: 25000, imageEmoji: '🍜',  categoryId: 'cat-makanan', isAvailable: true },
    { id: 'menu-12', name: 'Roti Bakar Selai',    description: 'Roti tawar panggang dengan pilihan selai cokelat atau kacang.',     price: 15000, imageEmoji: '🍞',  categoryId: 'cat-makanan', isAvailable: true },
    { id: 'menu-13', name: 'Kentang Goreng',      description: 'Kentang goreng crispy dengan saus sambal dan mayo.',                price: 18000, imageEmoji: '🍟',  categoryId: 'cat-snack',   isAvailable: true },
    { id: 'menu-14', name: 'Pisang Goreng Keju',  description: 'Pisang goreng crispy taburan keju parut dan susu kental.',          price: 15000, imageEmoji: '🍌',  categoryId: 'cat-snack',   isAvailable: true },
  ]
  for (const item of items) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: { name: item.name, description: item.description, price: item.price, imageEmoji: item.imageEmoji, isAvailable: item.isAvailable, categoryId: item.categoryId },
      create: item,
    })
  }
  console.log(`  ✓ Menu items: ${items.length}`)
  console.log('✅ Seed complete!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
