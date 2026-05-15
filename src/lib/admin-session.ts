import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

// ==============================================
// Admin session — ผูก line_user_id + shop_id
// ==============================================

export type AdminSession = {
  lineUserId: string
  shopId: string
  shopSlug: string
  shopName: string
  displayName: string
  role: string
}

// verify token (ใช้ในกรณีเปิดผ่าน Flex link)
function verifyToken(token: string): { exp: number; bookingId?: string } | null {
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

// ✅ ดึง admin session จาก cookies
//   priority: line_session (LINE login + admin_users lookup) > token-only (เปิดจาก flex link)
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const supabase = await createClient()

  // 1. ถ้ามี line_session — ใช้เป็นตัวหลัก
  const lineRaw = cookieStore.get('line_session')?.value
  if (lineRaw) {
    try {
      const line = JSON.parse(lineRaw)
      // หา admin_users ที่ผูกกับ line_user_id นี้
      const { data: admin } = await supabase
        .from('admin_users')
        .select(`
          shop_id, role, display_name, is_active,
          shops ( id, slug, name )
        `)
        .eq('line_user_id', line.lineUserId)
        .eq('is_active', true)
        .maybeSingle()

      if (admin && admin.is_active) {
        const shop = admin.shops as any
        return {
          lineUserId:  line.lineUserId,
          shopId:      shop?.id ?? admin.shop_id,
          shopSlug:    shop?.slug ?? '',
          shopName:    shop?.name ?? '',
          displayName: admin.display_name ?? line.displayName ?? '',
          role:        admin.role,
        }
      }
    } catch {}
  }

  // 2. fallback — admin_session cookie (token-based จาก flex link)
  //    เปิด admin จาก Flex แต่ไม่มี line login → ให้สิทธิ์ตามจริงไม่ได้
  //    ต้องเช็คว่า token ยัง valid
  const tok = cookieStore.get('admin_session')?.value
  if (tok && verifyToken(tok)) {
    // ⚠️ token-only session — ไม่รู้ว่าเป็น admin ของร้านไหน
    // → return null เพื่อบังคับให้ login ผ่าน LINE
    return null
  }

  return null
}

// helper สำหรับใช้ใน server component / api route
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/admin-login')
  }
  return session!
}
