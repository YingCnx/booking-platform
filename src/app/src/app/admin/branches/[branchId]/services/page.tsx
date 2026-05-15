import { createClient } from '@/utils/supabase/server'
import { requireAdminSession } from '@/lib/admin-session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { ServiceManager } from './ServiceManager'

type Props = {
  params: Promise<{ branchId: string }>
}

export default async function ServicesPage({ params }: Props) {
  const { branchId } = await params
  const admin = await requireAdminSession()
  const supabase = await createClient()

  const { data: branch } = await supabase
    .from('branches').select('id, name, shop_id').eq('id', branchId).single()

  // ✅ กัน admin ของร้านอื่น
  if (!branch || branch.shop_id !== admin.shopId) redirect('/admin')

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('price')

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-5 py-4 sticky top-0 z-10 bg-black">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/admin" className="hover:text-white transition">Admin</Link>
          <span>/</span>
          <Link href={`/admin/branches/${branchId}`} className="hover:text-white transition">{branch?.name}</Link>
          <span>/</span>
          <span className="text-white">บริการ</span>
        </div>
        <h1 className="text-xl font-bold">จัดการบริการ</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <ServiceManager branchId={branchId} initialServices={services ?? []} />
      </div>
    </div>
  )
}
