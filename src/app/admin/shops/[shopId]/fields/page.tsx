import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { FieldManager } from './FieldManager'
import { normalizeFieldSchema } from '@/lib/field-schema'

type Props = {
  params: Promise<{ shopId: string }>
}

export default async function FieldsPage({ params }: Props) {
  const { shopId } = await params
  const supabase = await createClient()
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, field_schema')
    .eq('id', shopId)
    .single()

  const schema = normalizeFieldSchema(shop?.field_schema)

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 px-5 py-4 sticky top-0 z-10 bg-black">
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
          <Link href="/admin" className="hover:text-white transition">Admin</Link>
          <span>/</span>
          <Link href="/admin/shops" className="hover:text-white transition">ร้าน</Link>
          <span>/</span>
          <span className="text-white">{shop?.name}</span>
        </div>
        <h1 className="text-xl font-bold">Field ที่ลูกค้าต้องกรอก</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <FieldManager shopId={shopId} initialSchema={schema} />
      </div>
    </div>
  )
}
