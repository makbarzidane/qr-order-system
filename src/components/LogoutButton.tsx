'use client'
import { signOut } from 'next-auth/react'

interface Props {
  className?: string
  label?: string
}

export function LogoutButton({ className, label = 'Logout' }: Props) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={className ?? 'text-sm text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/10'}
    >
      {label}
    </button>
  )
}
