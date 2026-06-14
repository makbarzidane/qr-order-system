import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login?error=unauthorized', req.url))
    }
    if (pathname.startsWith('/cashier') && role !== 'CASHIER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login?error=unauthorized', req.url))
    }
    if (pathname.startsWith('/kitchen') && role !== 'KITCHEN' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login?error=unauthorized', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        const protected_ = ['/admin', '/cashier', '/kitchen']
        if (protected_.some(p => pathname.startsWith(p))) return !!token
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*', '/kitchen/:path*'],
}
