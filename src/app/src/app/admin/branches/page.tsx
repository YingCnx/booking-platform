// app/admin/branches/[branchId]/page.tsx

import { createClient } from '@/utils/supabase/server'
import { requireAdminSession } from '@/lib/admin-session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'

type Props = {
  params: Promise<{
    branchId: string
  }>
}

export default async function BranchDetailPage({ params }: Props) {
  const { branchId } = await params
  const admin = await requireAdminSession()

  const supabase = await createClient()

  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .single()

  // ✅ กัน admin ของร้านอื่น
  if (!branch || branch.shop_id !== admin.shopId) redirect('/admin')

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customers (
        name,
        phone
      ),
      services (
        name
      )
    `)
    .eq('branch_id', branchId)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  const pending =
    bookings?.filter((b) => b.status === 'pending') ?? []

  const confirmed =
    bookings?.filter((b) => b.status === 'confirmed') ?? []

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-white"
            >
              ← กลับ Dashboard
            </Link>

            <h1 className="text-4xl font-bold mt-3">
              {branch?.name ?? 'Branch'}
            </h1>

            <p className="text-gray-500 mt-2">
              จัดการคิวและยืนยันรายการ
            </p>
          </div>

          <div className="flex gap-3">
            <div className="border border-amber-800 bg-amber-950/30 rounded-xl px-5 py-4">
              <div className="text-3xl font-bold text-amber-300">
                {pending.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                รอยืนยัน
              </div>
            </div>

            <div className="border border-gray-800 bg-gray-900 rounded-xl px-5 py-4">
              <div className="text-3xl font-bold">
                {confirmed.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                ยืนยันแล้ว
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="border border-red-800 bg-red-950/30 text-red-400 rounded-xl p-4 mb-6">
            {error.message}
          </div>
        )}

        {/* PENDING */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-2xl font-bold">
              ⏳ รอการยืนยัน
            </h2>

            {pending.length > 0 && (
              <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                {pending.length}
              </span>
            )}
          </div>

          {!pending.length ? (
            <div className="border border-gray-800 bg-gray-900 rounded-xl p-10 text-center text-gray-500">
              ไม่มีรายการรอยืนยัน
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((booking: any) => (
                <div
                  key={booking.id}
                  className="border border-amber-800/50 bg-amber-950/20 rounded-2xl p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                    {/* INFO */}
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold">
                          {booking.customers?.name}
                        </h3>

                        <span className="text-xs border border-amber-700 text-amber-300 px-3 py-1 rounded-full">
                          PENDING
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-gray-300">
                        <div>
                          📞 {booking.customers?.phone}
                        </div>

                        <div>
                          👟 {booking.services?.name}
                        </div>

                        <div>
                          📅 {booking.booking_date}
                        </div>

                        <div>
                          🕒 {booking.start_time?.slice(0, 5)} -{' '}
                          {booking.end_time?.slice(0, 5)}
                        </div>

                        <div className="font-bold text-white pt-2">
                          ฿{booking.total_price}
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-col gap-3 w-full lg:w-52">

                      <form
                        action={`/api/admin/bookings/${booking.id}/confirm`}
                        method="POST"
                      >
                        <button
                          className="w-full bg-white text-black font-bold py-3 rounded-xl hover:opacity-90 transition"
                        >
                          ✅ ยืนยันคิว
                        </button>
                      </form>

                      <form
                        action={`/api/admin/bookings/${booking.id}/cancel`}
                        method="POST"
                      >
                        <button
                          className="w-full border border-red-800 bg-red-950/30 text-red-400 font-bold py-3 rounded-xl hover:bg-red-950/50 transition"
                        >
                          ❌ ยกเลิก
                        </button>
                      </form>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CONFIRMED */}
        <section>
          <h2 className="text-2xl font-bold mb-5">
            ✅ ยืนยันแล้ว
          </h2>

          {!confirmed.length ? (
            <div className="border border-gray-800 bg-gray-900 rounded-xl p-10 text-center text-gray-500">
              ยังไม่มีคิวที่ยืนยัน
            </div>
          ) : (
            <div className="space-y-3">
              {confirmed.map((booking: any) => (
                <div
                  key={booking.id}
                  className="border border-gray-800 bg-gray-900 rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold">
                      {booking.customers?.name}
                    </div>

                    <div className="text-sm text-gray-500 mt-1">
                      {booking.services?.name} ·{' '}
                      {booking.start_time?.slice(0, 5)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold">
                      ฿{booking.total_price}
                    </div>

                    <div className="text-xs text-emerald-400 mt-1">
                      CONFIRMED
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}