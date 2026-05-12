import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// ดึง public config ของ shop จาก branchId
// ไม่ return sensitive data (secret/token)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')

  if (!branchId) return NextResponse.json({ error: 'branchId required' }, { status: 400 })

  const supabase = await createClient()

  const { data: branch } = await supabase
    .from('branches').select('shop_id').eq('id', branchId).single()

  if (!branch) return NextResponse.json({ error: 'branch not found' }, { status: 404 })

  const { data: shop } = await supabase
    .from('shops')
    .select('line_liff_id, line_channel_id')
    .eq('id', branch.shop_id)
    .single()

  return NextResponse.json({
    liffId:    shop?.line_liff_id    ?? process.env.NEXT_PUBLIC_LIFF_ID ?? null,
    channelId: shop?.line_channel_id ?? null,
  })
}
