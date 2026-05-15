import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

type Props = {
  params: Promise<{ shopId: string }>
}

export async function PATCH(req: Request, { params }: Props) {
  const { shopId } = await params
  const { fields } = await req.json()

  if (!Array.isArray(fields)) {
    return NextResponse.json({ error: 'fields must be array' }, { status: 400 })
  }

  // validate: name + phone must exist
  const keys = fields.map(f => f.key)
  if (!keys.includes('name') || !keys.includes('phone')) {
    return NextResponse.json({ error: 'name และ phone เป็น field บังคับ ห้ามลบ' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('shops')
    .update({
      field_schema: { fields },
      updated_at: new Date().toISOString(),
    })
    .eq('id', shopId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
