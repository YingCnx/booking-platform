import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

import { BookingTable } from './BookingTable'
import { WorkingHoursForm } from './WorkingHoursForm'

type Props = {
  params: Promise<{
    branchId: string
  }>

  searchParams: Promise<{
    date?: string
  }>
}

export default async function BranchAdminPage({
  params,
  searchParams,
}: Props) {

  const supabase = await createClient()

  const { branchId } = await params

  const { date } = await searchParams

  const selectedDate =
    date ??
    new Date().toISOString().split('T')[0]

  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .single()

  const { data: rawBookings, error } =
    await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        total_price,
        notes,

        customers (
          name,
          phone
        ),

        services (
          name,
          duration_minutes,
          price
        )
      `)
      .eq('branch_id', branchId)
      .eq('booking_date', selectedDate)
      .order('start_time')

  const bookings = rawBookings?.map((b: any) => ({
    ...b,

    customers: Array.isArray(b.customers)
      ? b.customers[0]
      : b.customers,

    services: Array.isArray(b.services)
      ? b.services[0]
      : b.services,
  }))

  const dates = Array.from(
    { length: 8 },
    (_, i) => {

      const d = new Date()

      d.setDate(d.getDate() + i - 1)

      return d
        .toISOString()
        .split('T')[0]
    }
  )

  const confirmed =
    bookings?.filter(
      b => b.status === 'confirmed'
    ).length ?? 0

  const total =
    bookings?.length ?? 0

  return (

    <div className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <header className="border-b border-gray-800">

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center justify-between gap-6">

          <div className="flex items-center gap-4 min-w-0">

            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-white transition"
            >
              ← Dashboard
            </Link>

            <div className="text-gray-700">
              /
            </div>

            <div className="min-w-0">

              <div className="text-sm text-gray-500">
                Branch
              </div>

              <h1 className="text-3xl font-bold truncate mt-1">

                {branch?.name ?? 'Unknown Branch'}

              </h1>

            </div>

          </div>

          <div className="text-sm text-gray-500 whitespace-nowrap">

            {selectedDate}

          </div>

        </div>

      </header>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10 space-y-10">

        {/* ERROR */}
        {error && (

          <div className="border border-red-800 bg-red-950/30 rounded-xl p-5 text-red-300">

            {error.message}

          </div>

        )}

        {/* DATE TABS */}
        <section>

          <div className="flex gap-3 overflow-x-auto pb-2">

            {dates.map(d => (

              <Link
                key={d}
                href={`/admin/branches/${branchId}?date=${d}`}
                className={[
                  'px-4 py-3 rounded-xl border text-sm whitespace-nowrap transition-all',

                  selectedDate === d
                    ? 'bg-white text-black border-white font-medium'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white',
                ].join(' ')}
              >

                {new Date(d).toLocaleDateString(
                  'th-TH',
                  {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  }
                )}

              </Link>

            ))}

          </div>

        </section>

        {/* STATS */}
        <section>

          <div className="grid gap-6 md:grid-cols-2">

            <StatCard
              value={total}
              label="Total Bookings"
            />

            <StatCard
              value={confirmed}
              label="Confirmed"
              highlight
            />

          </div>

        </section>

        {/* BOOKINGS */}
        <BookingTable
          bookings={bookings as any ?? []}
        />

        {/* WORKING HOURS */}
        <section className="border border-gray-800 bg-gray-900 rounded-2xl p-6">

          <div className="mb-6">

            <h2 className="text-2xl font-bold">
              Working Hours
            </h2>

            <p className="text-gray-500 mt-1">
              Configure branch operating hours
            </p>

          </div>

          <WorkingHoursForm
            branch={branch}
          />

        </section>

      </main>

    </div>

  )
}

function StatCard({
  value,
  label,
  highlight = false,
}: {
  value: number
  label: string
  highlight?: boolean
}) {

  return (

    <div
      className={[
        'border rounded-2xl p-6 bg-gray-900',

        highlight
          ? 'border-green-800'
          : 'border-gray-800',
      ].join(' ')}
    >

      <div
        className={[
          'text-5xl font-bold tracking-tight',

          highlight
            ? 'text-green-400'
            : 'text-white',
        ].join(' ')}
      >

        {value}

      </div>

      <div className="text-gray-500 mt-3">

        {label}

      </div>

    </div>

  )
}