import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import crypto from 'crypto'

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
    // ✅ ต้องมี line_session เสมอ (ระบบจะเช็ค admin_users ใน server component)
    const hasLineSession = req.cookies.get('line_session')?.value

    if (hasLineSession) {
      // ✅ ถ้ามี token จาก Flex link → set admin_session cookie ด้วย
      //    (เพื่อให้ link จาก group เปิดได้โดยไม่ต้อง re-auth)
      const tokenFromQuery = searchParams.get('token')
      if (tokenFromQuery && verifyAdminToken(tokenFromQuery)) {
        const res = NextResponse.next()
        res.cookies.set('admin_token', tokenFromQuery, {
          httpOnly: true, secure: true, sameSite: 'lax',
          maxAge: 60 * 60 * 4, path: '/',
        })
        return res
      }
      return NextResponse.next()
    }

    // ❌ ไม่มี line_session → ต้อง login ก่อน
    const liffUrl = new URL('/liff', req.url)
    liffUrl.searchParams.set('next', pathname + req.nextUrl.search)
    return NextResponse.redirect(liffUrl)
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
