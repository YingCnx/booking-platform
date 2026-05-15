import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')
  const date = searchParams.get('date')

  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers(name, phone),
      services(name, duration_minutes, price),
      branches(name)
    `)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (branchId) query = query.eq('branch_id', branchId)
  if (date) query = query.eq('booking_date', date)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookings: data })
}
