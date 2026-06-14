import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import type { Role } from '@/types'

const HAS_DB = !!"placeholder"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        if (!HAS_DB) {
          const DEMO: Record<string, { password: string; role: Role; name: string }> = {
            'admin@qrorder.app':   { password: 'admin123',   role: 'ADMIN',   name: 'Admin' },
            'cashier@qrorder.app': { password: 'cashier123', role: 'CASHIER', name: 'Kasir' },
            'kitchen@qrorder.app': { password: 'kitchen123', role: 'KITCHEN', name: 'Dapur' },
          }
          const demo = DEMO[credentials.email]
          if (!demo || demo.password !== credentials.password) return null
          return { id: credentials.email, email: credentials.email, name: demo.name, role: demo.role }
        }
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.isActive) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role as Role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as { role: Role }).role
      return token
    },
    async session({ session, token }) {
      if (session.user) (session.user as { role: Role }).role = token.role as Role
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: "placeholder",
}
