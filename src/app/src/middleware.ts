import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ===== ADMIN PATHS =====
  if (pathname.startsWith('/admin')) {
    const hasSession = req.cookies.get('admin_session')?.value
    if (!hasSession) {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }
    return NextResponse.next()
  }

  // ===== CUSTOMER PATHS =====
  const hasSession = req.cookies.get('line_session')?.value
  if (!hasSession) {
    const liffUrl = new URL('/liff', req.url)
    liffUrl.searchParams.set('next', pathname + req.nextUrl.search)
    return NextResponse.redirect(liffUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!liff|api|admin-login|_next/static|_next/image|favicon.ico|error|success).*)',
  ],
}
