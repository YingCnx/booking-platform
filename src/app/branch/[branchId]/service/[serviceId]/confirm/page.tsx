import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { LiffConfirm } from './LiffConfirm'

type Props = {
  params: Promise<{
    branchId: string
    serviceId: string
  }>
  searchParams: Promise<{
    time?: string
    date?: string
  }>
}

export default async function ConfirmPage({
  params,
  searchParams,
}: Props) {
  const { branchId, serviceId } = await params
  const { time, date } = await searchParams

  const supabase = await createClient()

  const selectedDate =
    date ?? new Date().toISOString().split('T')[0]

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single()

  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, address, shop_id')
    .eq('id', branchId)
    .single()

  // ✅ โหลด LIFF ID จาก shop
  const { data: shop } = await supabase
    .from('shops')
    .select('line_liff_id')
    .eq('id', branch?.shop_id)
    .single()

  if (!time) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-gray-500">
            ไม่พบเวลาที่เลือก
          </p>

          <Link
            href={`/branch/${branchId}/service/${serviceId}`}
            className="mt-4 inline-block text-sm underline text-gray-900"
          >
            กลับไปเลือกใหม่
          </Link>
        </div>
      </main>
    )
  }

  const dateLabel = new Date(selectedDate).toLocaleDateString(
    'th-TH',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  )

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href={`/branch/${branchId}/service/${serviceId}?date=${selectedDate}`}
            className="text-gray-400 text-2xl leading-none"
          >
            ‹
          </Link>

          <h1 className="font-bold text-gray-900">
            ยืนยันการจอง
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 text-white px-5 py-5">
            <div className="text-3xl font-bold">
              {time} น.
            </div>

            <div className="text-gray-400 text-sm mt-1">
              {dateLabel}
            </div>
          </div>

          <div className="px-5 py-4 space-y-3 text-sm">
            <Row label="สาขา" value={branch?.name} />

            <Row label="บริการ" value={service?.name} />

            <Row
              label="ระยะเวลา"
              value={`${service?.duration_minutes} นาที`}
            />

            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="font-semibold text-gray-700">
                ราคา
              </span>

              <span className="text-2xl font-bold text-gray-900">
                ฿{service?.price}
              </span>
            </div>
          </div>
        </div>

        {/* Pending notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 text-sm text-amber-800">
          <span className="text-lg leading-none">
            ⏳
          </span>

          <span>
            ร้านจะยืนยันการจองให้ทราบทาง LINE ภายหลัง
          </span>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            ข้อมูลของคุณ
          </h2>

          <LiffConfirm
            branchId={branchId}
            serviceId={serviceId}
            time={time}
            date={selectedDate}
            liffId={shop?.line_liff_id ?? ''}
          />
        </div>
      </div>
    </main>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">
        {label}
      </span>

      <span className="font-medium text-gray-900">
        {value ?? '-'}
      </span>
    </div>
  )
}