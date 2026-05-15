import { NextResponse } from 'next/server'
import { getAdminSession, setAdminSession } from '@/lib/admin-session'

export async function POST(req: Request) {
  const { shopId } = await req.json()
  if (!shopId) {
    return NextResponse.json({ error: 'shopId required' }, { status: 400 })
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  // ตรวจสอบว่า shopId อยู่ใน list ของ admin คนนี้
  const isMember = session.shops.some(s => s.id === shopId)
  if (!isMember && session.role !== 'super') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์ในร้านนี้' }, { status: 403 })
  }

  await setAdminSession(session.adminUserId, shopId)
  return NextResponse.json({ ok: true })
}
