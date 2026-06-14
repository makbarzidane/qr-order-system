/**
 * Reset script — deletes only Order + QueueCounter rows.
 * Does NOT delete schema, users, categories, menu, or discounts.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/reset-orders.ts
 *
 * Requires DATABASE_URL to be set.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('⚠️  This will delete ALL Order and QueueCounter rows.')
  console.log('   Users, Categories, MenuItems, and Discounts are safe.')
  const { count: queueCount } = await prisma.queueCounter.deleteMany()
  console.log(`🗑️  Deleted ${queueCount} QueueCounter rows`)
  const { count: orderCount } = await prisma.order.deleteMany()
  console.log(`🗑️  Deleted ${orderCount} Order rows`)
  console.log('✅ Reset complete. Run seed to repopulate menu/categories/users.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
