import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function PATCH(req: Request) {
  const { branchId, open_time, close_time, slot_interval_minutes, holiday_dates } = await req.json()

  if (!branchId) {
    return NextResponse.json({ error: 'branchId required' }, { status: 400 })
  }

  // ✅ ใช้ชื่อ column ตรงกับ schema จริง
  const { data, error } = await supabase
    .from('branches')
    .update({ open_time, close_time, slot_interval_minutes, holiday_dates })
    .eq('id', branchId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ branch: data })
}
