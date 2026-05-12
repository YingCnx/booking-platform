import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // เฉพาะ path /admin และ sub-paths
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) {
    // ถ้าไม่ได้ตั้ง env ให้ผ่านได้ (dev mode)
    return NextResponse.next()
  }

  // เช็ค key จาก query string หรือ cookie
  const keyFromQuery  = searchParams.get('key')
  const keyFromCookie = req.cookies.get('admin_key')?.value

  const isValid =
    keyFromQuery === secret || keyFromCookie === secret

  if (!isValid) {
    // redirect ไปหน้า unauthorized
    return NextResponse.redirect(new URL('/admin-login', req.url))
  }

  // ถ้า key ถูกต้องจาก query → set cookie ไว้ด้วย
  // ไม่ต้องพิมพ์ key ใหม่ทุกครั้งที่คลิก link ใน admin
  const res = NextResponse.next()
  if (keyFromQuery === secret) {
    res.cookies.set('admin_key', secret, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 12, // 12 ชั่วโมง
      path: '/',
    })
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
