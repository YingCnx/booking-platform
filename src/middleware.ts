import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import crypto from 'crypto'

// ✅ verify token แบบเดียวกับใน lib/line.ts
function verifyAdminToken(token: string): { exp: number } | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    const secret = process.env.ADMIN_SECRET_KEY ?? ''
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url')
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // ===== ADMIN PATHS =====
  if (pathname.startsWith('/admin')) {
    const secret = process.env.ADMIN_SECRET_KEY
    if (!secret) return NextResponse.next()

    // ✅ ใหม่: token-based access (จาก Flex Message link)
    const tokenFromQuery = searchParams.get('token')
    if (tokenFromQuery) {
      const payload = verifyAdminToken(tokenFromQuery)
      if (payload) {
        // token valid → set short-lived cookie (4 ชม.)
        const res = NextResponse.next()
        res.cookies.set('admin_session', tokenFromQuery, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 4,
          path: '/',
        })
        return res
      }
    }

    // ✅ มี cookie session อยู่แล้ว → check expiry
    const sessionCookie = req.cookies.get('admin_session')?.value
    if (sessionCookie) {
      const payload = verifyAdminToken(sessionCookie)
      if (payload) return NextResponse.next()
    }

    // ❌ ไม่มี token / token หมดอายุ
    return NextResponse.redirect(new URL('/admin-login', req.url))
  }

  // ===== CUSTOMER PATHS — บังคับ LINE login =====
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
    '/((?!liff|api|admin|admin-login|_next/static|_next/image|favicon.ico|error|success).*)',
  ],
}
