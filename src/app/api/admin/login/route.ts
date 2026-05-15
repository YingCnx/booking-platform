import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

function signAdminToken(payload: { exp: number }): string {
  const secret = process.env.ADMIN_SECRET_KEY ?? ''
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig  = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

export async function POST(req: Request) {
  const { secret } = await req.json()
  const adminSecret = process.env.ADMIN_SECRET_KEY

  if (!adminSecret) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
  }

  if (secret !== adminSecret) {
    return NextResponse.json({ error: 'Secret Key ไม่ถูกต้อง' }, { status: 401 })
  }

  // ✅ สร้าง token อายุ 4 ชม.
  const token = signAdminToken({ exp: Date.now() + 4 * 60 * 60 * 1000 })

  const cookieStore = await cookies()
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 4,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}
