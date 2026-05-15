import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export type AdminSession = {
  adminUserId:    string
  lineUserId:     string
  displayName:    string
  pictureUrl:     string
  role:           'super' | 'shop_admin'
  // shops ที่ admin คนนี้เป็น admin
  shops:          Array<{ id: string; name: string; role: 'owner' | 'staff' }>
  // shop ที่กำลังเลือกใช้งานอยู่
  selectedShopId: string | null
}

// ===== Cookie helpers =====
const COOKIE_NAME = 'admin_session_v2'

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null

  try {
    const stored = JSON.parse(raw) as {
      adminUserId: string
      selectedShopId: string | null
    }
    if (!stored.adminUserId) return null

    // refresh ข้อมูล admin + shops จาก DB ทุกครั้ง (กรณีถูกถอนสิทธิ์)
    const supabase = await createClient()
    const { data: admin } = await supabase
      .from('admin_users')
      .select(`
        id, line_user_id, display_name, role, is_active,
        shop_admins (
          shop_id, role,
          shops ( id, name, is_active )
        )
      `)
      .eq('id', stored.adminUserId)
      .single()

    if (!admin || !admin.is_active) return null

    const shops = (admin.shop_admins ?? [])
      .filter((sa: any) => sa.shops?.is_active)
      .map((sa: any) => ({
        id:   sa.shops.id,
        name: sa.shops.name,
        role: sa.role,
      }))

    // ถ้าไม่ได้เป็น admin ของร้านไหนเลย (และไม่ใช่ super) → ไม่ให้เข้า
    if (shops.length === 0 && admin.role !== 'super') return null

    // ถ้า selectedShopId ไม่อยู่ใน list → เลือกร้านแรก (หรือ null สำหรับ super)
    let selectedShopId = stored.selectedShopId
    if (selectedShopId && !shops.some(s => s.id === selectedShopId)) {
      selectedShopId = shops[0]?.id ?? null
    }
    if (!selectedShopId && shops.length > 0) {
      selectedShopId = shops[0].id
    }

    return {
      adminUserId: admin.id,
      lineUserId:  admin.line_user_id,
      displayName: admin.display_name ?? '',
      pictureUrl:  '',
      role:        admin.role as 'super' | 'shop_admin',
      shops,
      selectedShopId,
    }
  } catch {
    return null
  }
}

export async function setAdminSession(adminUserId: string, selectedShopId: string | null) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, JSON.stringify({ adminUserId, selectedShopId }), {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,  // 7 days
    path:     '/',
  })
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ===== Helper: บังคับมี session + selected shop =====
import { redirect } from 'next/navigation'

export type RequiredAdminContext = {
  adminUserId:    string
  lineUserId:     string
  displayName:    string
  role:           'super' | 'shop_admin'
  shops:          Array<{ id: string; name: string; role: 'owner' | 'staff' }>
  shopId:         string   // selected
  shopName:       string
}

export async function requireAdminSession(): Promise<RequiredAdminContext> {
  const session = await getAdminSession()
  if (!session) redirect('/admin-login')

  if (!session.selectedShopId) {
    // super admin ที่ยังไม่ได้เลือก shop → ไปหน้าเลือก
    if (session.role === 'super') {
      redirect('/admin/select-shop')
    }
    redirect('/admin-login')
  }

  const selectedShop = session.shops.find(s => s.id === session.selectedShopId)
  if (!selectedShop) redirect('/admin-login')

  return {
    adminUserId: session.adminUserId,
    lineUserId:  session.lineUserId,
    displayName: session.displayName,
    role:        session.role,
    shops:       session.shops,
    shopId:      session.selectedShopId,
    shopName:    selectedShop.name,
  }
}
