import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ===== Web Crypto API token verify (สำหรับ token จาก Flex Message) =====
async function verifyAdminToken(token: string): Promise<{ exp: number } | null> {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null

    const secret = process.env.ADMIN_SECRET_KEY ?? ''
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
    const expected = base64UrlEncode(new Uint8Array(sigBuffer))
    if (sig !== expected) return null

    const payload = JSON.parse(atob(data.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // ===== ADMIN PATHS =====
  if (pathname.startsWith('/admin')) {

    // ✅ Method 1: LINE Login session (admin_session_v2) — Phase 2
    const hasLineSession = req.cookies.get('admin_session_v2')?.value
    if (hasLineSession) {
      return NextResponse.next()
    }

    // ✅ Method 2: token จาก Flex Message link (30 นาที)
    const tokenFromQuery = searchParams.get('token')
    if (tokenFromQuery) {
      const payload = await verifyAdminToken(tokenFromQuery)
      if (payload) {
        const res = NextResponse.next()
        res.cookies.set('admin_token', tokenFromQuery, {
          httpOnly: true, secure: true, sameSite: 'lax',
          maxAge: 60 * 60 * 4, path: '/',
        })
        return res
      }
    }

    const tokenCookie = req.cookies.get('admin_token')?.value
    if (tokenCookie) {
      const payload = await verifyAdminToken(tokenCookie)
      if (payload) return NextResponse.next()
    }

    // ❌ ไม่มี session → redirect ไป login
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
    '/((?!liff|api|admin-login|_next/static|_next/image|favicon.ico|error|success).*)',
  ],
}
