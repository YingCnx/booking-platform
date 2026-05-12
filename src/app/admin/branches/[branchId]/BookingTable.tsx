'use client'

import { useState } from 'react'

type Booking = {
  id: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  notes?: string
  customers: { name: string; phone: string } | null
  services: { name: string; duration_minutes: number } | null
}

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-950 text-amber-300 border-amber-700',
  confirmed: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  completed: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  no_show:   'bg-orange-950 text-orange-400 border-orange-800',
  cancelled: 'bg-red-950 text-red-400 border-red-800',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  completed: 'เสร็จแล้ว',
  no_show:   'ไม่มา',
  cancelled: 'ยกเลิก',
}

// ✅ Dialog component แทน browser alert
function ConfirmDialog({
  booking,
  action,
  onConfirm,
  onCancel,
  loading,
}: {
  booking: Booking
  action: 'confirmed' | 'cancelled'
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const isConfirm = action === 'confirmed'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">

        {/* Header */}
        <div className={`px-5 py-4 ${isConfirm ? 'bg-emerald-950/60 border-b border-emerald-900' : 'bg-red-950/60 border-b border-red-900'}`}>
          <div className={`text-base font-bold ${isConfirm ? 'text-emerald-400' : 'text-red-400'}`}>
            {isConfirm ? '✓ ยืนยันการจอง' : '✕ ปฏิเสธการจอง'}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            {isConfirm ? 'ระบบจะแจ้ง LINE ลูกค้าอัตโนมัติ' : 'ลูกค้าจะไม่ได้รับการแจ้งเตือน'}
          </div>
        </div>

        {/* Booking info */}
        <div className="px-5 py-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">ลูกค้า</span>
            <span className="font-medium">{booking.customers?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">บริการ</span>
            <span className="font-medium">{booking.services?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">เวลา</span>
            <span className="font-medium">{booking.start_time?.slice(0, 5)} – {booking.end_time?.slice(0, 5)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">ราคา</span>
            <span className="font-bold">฿{booking.total_price}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-3 border border-zinc-700 text-zinc-400 text-sm font-medium rounded-xl hover:border-zinc-500 hover:text-white transition disabled:opacity-50">
            ยกเลิก
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition disabled:opacity-50 ${
              isConfirm
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}>
            {loading ? 'กำลังดำเนินการ...' : isConfirm ? 'ยืนยัน' : 'ปฏิเสธ'}
          </button>
        </div>

      </div>
    </div>
  )
}

export function BookingTable({ bookings: initial }: { bookings: Booking[] }) {
  const [bookings, setBookings] = useState(initial)
  const [loading, setLoading]   = useState<string | null>(null)

  // ✅ dialog state
  const [dialog, setDialog] = useState<{
    booking: Booking
    action: 'confirmed' | 'cancelled'
  } | null>(null)

  function requestAction(booking: Booking, action: 'confirmed' | 'cancelled') {
    setDialog({ booking, action })
  }

  async function updateStatus(bookingId: string, status: string) {
    if (!bookingId) return
    setLoading(bookingId)
    setDialog(null)
    try {
      const res = await fetch('/api/admin/booking-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status }),
      })
      if (res.ok) {
        setBookings(prev =>
          prev.map(b => b.id === bookingId ? { ...b, status } : b)
        )
      } else {
        const err = await res.json()
        alert('เกิดข้อผิดพลาด: ' + (err.error ?? 'ไม่สามารถเปลี่ยนสถานะได้'))
      }
    } finally {
      setLoading(null)
    }
  }

  const pending = bookings.filter(b => b.status === 'pending')
  const others  = bookings.filter(b => b.status !== 'pending')

  if (!bookings.length) {
    return (
      <div className="border border-zinc-800 rounded-xl px-5 py-10 bg-zinc-900 text-center text-zinc-600 text-sm">
        ไม่มีการจองวันนี้
      </div>
    )
  }

  return (
    <>
      {/* ✅ Confirm Dialog */}
      {dialog && (
        <ConfirmDialog
          booking={dialog.booking}
          action={dialog.action}
          loading={loading === dialog.booking.id}
          onConfirm={() => updateStatus(dialog.booking.id, dialog.action)}
          onCancel={() => setDialog(null)}
        />
      )}

      <div className="space-y-6">

        {/* PENDING */}
        {pending.length > 0 && (
          <div>
            <SectionHeader title="รอยืนยัน" count={pending.length} highlight />
            <div className="space-y-3">
              {pending.map(b => (
                <div key={b.id}
                  className="border border-amber-800/60 bg-amber-950/20 rounded-xl px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold">{b.start_time?.slice(0, 5)}</span>
                        <span className="text-zinc-600 text-sm">–</span>
                        <span className="text-zinc-500 text-sm">{b.end_time?.slice(0, 5)}</span>
                      </div>
                      <div className="mt-1.5 text-sm font-medium text-white">{b.customers?.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {b.customers?.phone} · {b.services?.name} · ฿{b.total_price}
                      </div>
                    </div>

                    {/* ✅ เรียก dialog แทน updateStatus ตรงๆ */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => requestAction(b, 'confirmed')}
                        disabled={loading === b.id}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-wait"
                      >
                        {loading === b.id ? '...' : '✓ ยืนยัน'}
                      </button>
                      <button
                        onClick={() => requestAction(b, 'cancelled')}
                        disabled={loading === b.id}
                        className="px-4 py-2 border border-zinc-700 hover:border-red-700 hover:text-red-400 text-zinc-400 text-xs font-medium rounded-lg transition disabled:opacity-50"
                      >
                        ✕ ปฏิเสธ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OTHERS */}
        {others.length > 0 && (
          <div>
            <SectionHeader title="คิวทั้งหมด" count={others.length} />
            <div className="border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden divide-y divide-zinc-800">
              {others.map(b => (
                <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-24 flex-shrink-0">
                    <div className="text-sm font-bold tabular-nums">{b.start_time?.slice(0, 5)}</div>
                    <div className="text-xs text-zinc-600">{b.end_time?.slice(0, 5)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{b.customers?.name}</div>
                    <div className="text-xs text-zinc-500 truncate">
                      {b.customers?.phone} · {b.services?.name}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-zinc-400 flex-shrink-0">฿{b.total_price}</div>
                  <div className="relative flex-shrink-0">
                    <select
                      value={b.status}
                      disabled={loading === b.id}
                      onChange={e => updateStatus(b.id, e.target.value)}
                      className={[
                        'text-xs px-3 py-1.5 rounded-full border font-medium appearance-none cursor-pointer pr-7 transition',
                        STATUS_STYLE[b.status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700',
                        loading === b.id ? 'opacity-50 cursor-wait' : '',
                      ].join(' ')}
                    >
                      {Object.entries(STATUS_LABEL).map(([val, label]) => (
                        <option key={val} value={val} className="bg-zinc-900 text-white">
                          {label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60 text-xs">▾</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}

function SectionHeader({ title, count, highlight }: { title: string; count: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500">{title}</h2>
      {count > 0 && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          highlight ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'
        }`}>
          {count}
        </span>
      )}
    </div>
  )
}
