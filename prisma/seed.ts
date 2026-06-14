import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const users = [
    { email: 'admin@qrorder.app', name: 'Admin', role: Role.ADMIN, password: 'admin123' },
    { email: 'cashier@qrorder.app', name: 'Kasir', role: Role.CASHIER, password: 'cashier123' },
    { email: 'kitchen@qrorder.app', name: 'Dapur', role: Role.KITCHEN, password: 'kitchen123' },
  ]

  for (const user of users) {
    const password = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, password, isActive: true },
      create: { ...user, password, isActive: true },
    })
  }

  const categories = [
    { id: 'cat-kopi', name: 'Kopi', sortOrder: 1 },
    { id: 'cat-nonkopi', name: 'Non-Kopi', sortOrder: 2 },
    { id: 'cat-makanan', name: 'Makanan', sortOrder: 3 },
    { id: 'cat-snack', name: 'Snack', sortOrder: 4 },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: { name: category.name, sortOrder: category.sortOrder, isActive: true },
      create: { ...category, isActive: true },
    })
  }

  const items = [
    { id: 'menu-1', name: 'Es Kopi Susu', description: 'Espresso, susu segar, dan es batu.', price: 18000, imageEmoji: 'KOPI', categoryId: 'cat-kopi', isAvailable: true },
    { id: 'menu-2', name: 'Americano', description: 'Espresso double shot dengan air panas.', price: 15000, imageEmoji: 'KOPI', categoryId: 'cat-kopi', isAvailable: true },
    { id: 'menu-3', name: 'Cappuccino', description: 'Espresso dengan foam susu tebal.', price: 22000, imageEmoji: 'KOPI', categoryId: 'cat-kopi', isAvailable: true },
    { id: 'menu-4', name: 'Latte', description: 'Espresso lembut dengan susu steam.', price: 22000, imageEmoji: 'KOPI', categoryId: 'cat-kopi', isAvailable: true },
    { id: 'menu-5', name: 'Kopi Tubruk', description: 'Kopi tradisional Indonesia.', price: 10000, imageEmoji: 'KOPI', categoryId: 'cat-kopi', isAvailable: true },
    { id: 'menu-6', name: 'Matcha Latte', description: 'Matcha premium dengan susu segar.', price: 25000, imageEmoji: 'TEH', categoryId: 'cat-nonkopi', isAvailable: true },
    { id: 'menu-7', name: 'Coklat Susu', description: 'Cokelat rich dengan susu.', price: 20000, imageEmoji: 'COKLAT', categoryId: 'cat-nonkopi', isAvailable: true },
    { id: 'menu-8', name: 'Es Teh Manis', description: 'Teh hitam segar dengan gula.', price: 8000, imageEmoji: 'TEH', categoryId: 'cat-nonkopi', isAvailable: true },
    { id: 'menu-9', name: 'Jus Alpukat', description: 'Alpukat segar dengan susu.', price: 20000, imageEmoji: 'JUS', categoryId: 'cat-nonkopi', isAvailable: false },
    { id: 'menu-10', name: 'Nasi Goreng Spesial', description: 'Nasi goreng dengan telur dan ayam.', price: 28000, imageEmoji: 'NASI', categoryId: 'cat-makanan', isAvailable: true },
    { id: 'menu-11', name: 'Mie Goreng', description: 'Mie goreng dengan sayuran segar.', price: 25000, imageEmoji: 'MIE', categoryId: 'cat-makanan', isAvailable: true },
    { id: 'menu-12', name: 'Roti Bakar Selai', description: 'Roti panggang dengan pilihan selai.', price: 15000, imageEmoji: 'ROTI', categoryId: 'cat-makanan', isAvailable: true },
    { id: 'menu-13', name: 'Kentang Goreng', description: 'Kentang goreng renyah.', price: 18000, imageEmoji: 'SNACK', categoryId: 'cat-snack', isAvailable: true },
    { id: 'menu-14', name: 'Pisang Goreng Keju', description: 'Pisang goreng dengan keju.', price: 15000, imageEmoji: 'SNACK', categoryId: 'cat-snack', isAvailable: true },
  ]

  for (const item of items) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: { ...item, isActive: true },
      create: { ...item, isActive: true },
    })
  }

  const tables = Array.from({ length: 10 }, (_, index) => ({ id: `meja-${index + 1}`, label: `Meja ${index + 1}` }))
  for (const table of tables) {
    await prisma.cafeTable.upsert({
      where: { id: table.id },
      update: { label: table.label, isActive: true },
      create: { ...table, isActive: true },
    })
  }

  await prisma.cafeSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'QR Order Cafe',
      address: 'Jakarta, Indonesia',
      whatsapp: '6281234567890',
      invoiceNote: 'Terima kasih. Silakan tunjukkan nomor antrean saat mengambil pesanan.',
      isOpen: true,
    },
  })

  const seededDiscount = await prisma.discount.findFirst({ where: { code: 'HEMAT10' } })
  if (!seededDiscount) {
    await prisma.discount.create({ data: { name: 'Hemat 10%', code: 'HEMAT10', type: 'PERCENTAGE', value: 10, minPurchase: 50000, isActive: true } })
  }

  console.log('Seed complete.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
