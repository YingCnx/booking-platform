import { requireAdminSession } from '@/lib/admin-session'
import { createClient } from '@/utils/supabase/server'
import { AdminsManager } from './AdminsManager'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminsPage() {
  const admin = await requireAdminSession()

  // เช็คสิทธิ์ — owner หรือ super เท่านั้น
  const myRole = admin.shops.find(s => s.id === admin.shopId)?.role
  if (myRole !== 'owner' && admin.role !== 'super') {
    redirect('/admin')
  }

  const supabase = await createClient()
  const { data: shopAdmins } = await supabase
    .from('shop_admins')
    .select(`
      id, role, created_at,
      admin_users ( id, line_user_id, display_name, is_active )
    `)
    .eq('shop_id', admin.shopId)

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-5 py-4 sticky top-0 z-10 bg-black">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/admin" className="hover:text-white transition">Admin</Link>
          <span>/</span>
          <span className="text-white">{admin.shopName}</span>
        </div>
        <h1 className="text-xl font-bold">จัดการ Admin ของร้าน</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <AdminsManager initial={shopAdmins as any ?? []} />
      </div>
    </div>
  )
}
