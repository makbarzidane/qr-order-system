import { prisma } from '@/lib/prisma'
import { UsersManager } from './users-manager'

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, role: true, isActive: true } })
  return <UsersManager users={users}/>
}
