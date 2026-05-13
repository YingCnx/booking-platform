import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // ===== ADMIN PATHS =====
  if (pathname.startsWith('/admin')) {
    const secret = process.env.ADMIN_SECRET_KEY
    if (!secret) return NextResponse.next()

    const keyFromQuery  = searchParams.get('key')
    const keyFromCookie = req.cookies.get('admin_key')?.value
    const isValid =
      keyFromQuery === secret || keyFromCookie === secret

    if (!isValid) {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }

    const res = NextResponse.next()
    if (keyFromQuery === secret) {
      res.cookies.set('admin_key', secret, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 12,
        path: '/',
      })
    }
    return res
  }

  // ===== CUSTOMER PATHS — บังคับ LINE login =====
  const hasSession = req.cookies.get('line_session')?.value

  if (!hasSession) {
    // ส่ง path ปัจจุบันไปเป็น ?next= เพื่อให้ /liff redirect กลับมาที่นี่หลัง login
    const liffUrl = new URL('/liff', req.url)
    liffUrl.searchParams.set('next', pathname + req.nextUrl.search)
    return NextResponse.redirect(liffUrl)
  }

  return NextResponse.next()
}

// matcher — บังคับ login ทุกหน้ายกเว้น
// - /liff (LIFF gate เอง)
// - /api (API routes ไม่ต้อง redirect แต่อาจเช็คเอง)
// - /admin (มี logic แยก)
// - /admin-login
// - /_next, /favicon.ico, /error, /success (static)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /liff (LIFF gate)
     * - /api (API routes)
     * - /admin (admin)
     * - /admin-login
     * - /_next/static
     * - /_next/image
     * - /favicon.ico
     * - /error, /success (เด็ดขาดให้เข้าได้)
     */
    '/((?!liff|api|admin|admin-login|_next/static|_next/image|favicon.ico|error|success).*)',
  ],
}
