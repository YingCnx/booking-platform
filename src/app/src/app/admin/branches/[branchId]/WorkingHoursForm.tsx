'use client'

import { useState } from 'react'

type Branch = {
  id: string
  name: string
  open_time?: string
  close_time?: string
  slot_interval_minutes?: number
  holiday_dates?: string[]
}

export function WorkingHoursForm({
  branch,
}: {
  branch: Branch | null
}) {

  const [openTime, setOpenTime] =
    useState(
      String(branch?.open_time ?? '09:00').slice(0, 5)
    )

  const [closeTime, setCloseTime] =
    useState(
      String(branch?.close_time ?? '18:00').slice(0, 5)
    )

  const [slotInterval, setSlotInterval] =
    useState(
      branch?.slot_interval_minutes ?? 30
    )

  const [holidays, setHolidays] =
    useState<string[]>(
      branch?.holiday_dates ?? []
    )

  const [newHoliday, setNewHoliday] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  const [saved, setSaved] =
    useState(false)

  const [error, setError] =
    useState('')

  async function save() {

    if (!branch) return

    setSaving(true)
    setSaved(false)
    setError('')

    try {

      const res = await fetch(
        '/api/admin/working-hours',
        {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            branchId: branch.id,
            open_time: openTime,
            close_time: closeTime,
            slot_interval_minutes: slotInterval,
            holiday_dates: holidays,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {

        setError(
          data.error ??
          'เกิดข้อผิดพลาด'
        )

      } else {

        setSaved(true)

        setTimeout(() => {
          setSaved(false)
        }, 2000)

      }

    } catch {

      setError('เกิดข้อผิดพลาด')

    } finally {

      setSaving(false)

    }
  }

  function addHoliday() {

    if (
      newHoliday &&
      !holidays.includes(newHoliday)
    ) {

      setHolidays(prev => (
        [...prev, newHoliday].sort()
      ))

      setNewHoliday('')

    }
  }

  return (

    <div className="space-y-8">

      {/* HOURS */}
      <section>

        <div className="mb-5">

          <h3 className="text-xl font-bold">
            Operating Hours
          </h3>

          <p className="text-gray-500 mt-1">
            Configure branch opening hours
          </p>

        </div>

        <div className="grid gap-5 md:grid-cols-2">

          {/* OPEN */}
          <div>

            <label className="block text-sm text-gray-400 mb-3">

              Open Time

            </label>

            <input
              type="time"
              value={openTime}
              onChange={e =>
                setOpenTime(e.target.value)
              }
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gray-600 transition"
            />

          </div>

          {/* CLOSE */}
          <div>

            <label className="block text-sm text-gray-400 mb-3">

              Close Time

            </label>

            <input
              type="time"
              value={closeTime}
              onChange={e =>
                setCloseTime(e.target.value)
              }
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gray-600 transition"
            />

          </div>

        </div>

      </section>

      {/* SLOT */}
      <section>

        <div className="mb-5">

          <h3 className="text-xl font-bold">
            Slot Interval
          </h3>

          <p className="text-gray-500 mt-1">
            Set booking interval duration
          </p>

        </div>

        <div className="flex flex-wrap gap-3">

          {[15, 30, 45, 60, 90].map(n => (

            <button
              key={n}
              onClick={() => setSlotInterval(n)}
              className={[
                'px-5 py-3 rounded-xl border text-sm font-medium transition-all',

                slotInterval === n
                  ? 'bg-white text-black border-white'
                  : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-white',
              ].join(' ')}
            >

              {n} mins

            </button>

          ))}

        </div>

      </section>

      {/* HOLIDAYS */}
      <section>

        <div className="mb-5">

          <h3 className="text-xl font-bold">
            Holidays
          </h3>

          <p className="text-gray-500 mt-1">
            Block unavailable dates
          </p>

        </div>

        <div className="flex flex-col gap-4">

          <div className="flex gap-3">

            <input
              type="date"
              value={newHoliday}
              onChange={e =>
                setNewHoliday(e.target.value)
              }
              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gray-600 transition"
            />

            <button
              onClick={addHoliday}
              className="px-5 py-3 rounded-xl border border-gray-800 bg-gray-900 text-white hover:bg-gray-800 transition"
            >

              + Add

            </button>

          </div>

          {holidays.length > 0 && (

            <div className="flex flex-wrap gap-3">

              {holidays.map(d => (

                <div
                  key={d}
                  className="flex items-center gap-3 px-4 py-2 rounded-full border border-gray-800 bg-gray-900"
                >

                  <span className="text-sm">

                    {d}

                  </span>

                  <button
                    onClick={() =>
                      setHolidays(prev =>
                        prev.filter(h => h !== d)
                      )
                    }
                    className="text-gray-500 hover:text-red-400 transition"
                  >

                    ×

                  </button>

                </div>

              ))}

            </div>

          )}

        </div>

      </section>

      {/* ERROR */}
      {error && (

        <div className="text-sm text-red-400">

          {error}

        </div>

      )}

      {/* SAVE */}
      <button
        onClick={save}
        disabled={saving}
        className={[
          'w-full py-4 rounded-xl text-sm font-semibold transition-all',

          saved
            ? 'bg-green-600 text-white'
            : 'bg-white text-black hover:bg-gray-200',

          saving
            ? 'opacity-50 cursor-wait'
            : '',
        ].join(' ')}
      >

        {saved
          ? '✓ Saved'
          : saving
            ? 'Saving...'
            : 'Save Changes'}

      </button>

    </div>

  )
}