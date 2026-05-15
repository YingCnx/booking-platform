import { createClient } from '@/utils/supabase/server'
import { requireAdminSession } from '@/lib/admin-session'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { ShopManager } from './ShopManager'

export default async function ShopsPage() {
  const admin = await requireAdminSession()
  const supabase = await createClient()

  // ✅ เห็นเฉพาะร้านของ admin
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, slug, phone, is_active, line_channel_id, line_admin_group_id, line_liff_id, branches(id, name)')
    .eq('id', admin.shopId)
    .is('deleted_at', null)
    .order('created_at')

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-5 py-4 sticky top-0 z-10 bg-black">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/admin" className="hover:text-white transition">Admin</Link>
          <span>/</span>
          <span className="text-white">จัดการร้าน</span>
        </div>
        <h1 className="text-xl font-bold">ร้านทั้งหมด</h1>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-5">
        <ShopManager initialShops={shops as any ?? []} />
      </div>
    </div>
  )
}
