import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// ============================================
// Admin Session — Group-based
// ใช้ groupId เป็นทะเบียนร้าน
// ============================================

const COOKIE_NAME = 'admin_session'

export type AdminSession = {
  lineUserId:  string
  displayName: string
  shopId:      string
  shopName:    string
  groupId:     string
}

export async function setAdminSession(s: AdminSession) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, JSON.stringify(s), {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,   // 7 days
    path:     '/',
  })
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null

  try {
    const s = JSON.parse(raw) as AdminSession
    if (!s.lineUserId || !s.shopId || !s.groupId) return null

    // verify shop ยังเปิดอยู่ + groupId ยังตรงไหม
    const supabase = await createClient()
    const { data: shop } = await supabase
      .from('shops')
      .select('id, name, line_admin_group_id, is_active')
      .eq('id', s.shopId)
      .eq('is_active', true)
      .single()

    if (!shop) return null
    if (shop.line_admin_group_id !== s.groupId) return null

    return s
  } catch {
    return null
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ✅ helper: บังคับ session ใน /admin pages
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) redirect('/admin-login')
  return session
}
