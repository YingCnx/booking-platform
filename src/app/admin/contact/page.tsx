import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ContactForm } from './ContactForm'

type Props = {
  searchParams: Promise<{ bookingId?: string }>
}

export default async function ContactPage({ searchParams }: Props) {
  const { bookingId } = await searchParams

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-zinc-500">ไม่พบ booking ID</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, booking_date, start_time, status,
      customers ( name, phone, line_user_id ),
      services ( name ),
      branches ( name )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-zinc-500">ไม่พบ booking</p>
          <Link href="/admin" className="mt-4 inline-block text-sm underline">
            กลับ Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const customer = booking.customers as any
  const service  = booking.services  as any
  const branch   = booking.branches  as any

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 px-5 py-4 sticky top-0 z-10 bg-black">
        <Link href="/admin" className="text-zinc-500 text-sm hover:text-white">
          ← Admin
        </Link>
        <h1 className="text-xl font-bold mt-1">ส่งข้อความหาลูกค้า</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Booking info card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">ลูกค้า</span>
            <span className="font-semibold">{customer?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">เบอร์</span>
            <a href={`tel:${customer?.phone}`} className="font-semibold text-blue-400 underline">
              {customer?.phone}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">บริการ</span>
            <span className="font-medium">{service?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">สาขา</span>
            <span className="font-medium">{branch?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">วันเวลา</span>
            <span className="font-medium">
              {new Date(booking.booking_date).toLocaleDateString('th-TH', {
                day: 'numeric', month: 'short',
              })}
              {' '}
              {String(booking.start_time).slice(0, 5)} น.
            </span>
          </div>
        </div>

        {/* ถ้าไม่มี line_user_id แจ้งเตือน */}
        {!customer?.line_user_id ? (
          <div className="border border-amber-800 bg-amber-950/30 rounded-2xl p-5 text-sm text-amber-300">
            ลูกค้าคนนี้ยังไม่ได้ผูก LINE — ไม่สามารถส่งข้อความได้
            <a
              href={`tel:${customer?.phone}`}
              className="mt-3 block w-full text-center bg-amber-500 text-black font-bold py-3 rounded-xl"
            >
              📞 โทรหาลูกค้า {customer?.phone}
            </a>
          </div>
        ) : (
          <ContactForm bookingId={bookingId} customerName={customer.name} />
        )}

      </div>
    </div>
  )
}
