'use client'

import liff from '@line/liff'
import { useEffect, useState } from 'react'
import { createBooking } from '@/actions/create-booking'

export default function BookingPage() {

  const [loading, setLoading] = useState(true)

  const [idToken, setIdToken] = useState('')

  useEffect(() => {

    async function init() {

      try {

        await liff.init({
          liffId:
            process.env.NEXT_PUBLIC_LIFF_ID!,
        })

        // บังคับเปิดผ่าน LINE
        if (!liff.isInClient()) {

          window.location.href =
            `https://line.me/R/app/${process.env.NEXT_PUBLIC_LIFF_ID}`

          return
        }

        // บังคับ login
        if (!liff.isLoggedIn()) {

          liff.login()

          return
        }

        // ดึง ID Token จริงจาก LINE
        const token = liff.getIDToken()

        if (token) {
          setIdToken(token)
        }

      } catch (err) {

        console.error(err)

      } finally {

        setLoading(false)

      }
    }

    init()

  }, [])

  if (loading) {

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (

    <div className="min-h-screen bg-black text-white p-6">

      <div className="max-w-md mx-auto">

        <h1 className="text-3xl font-bold mb-8">
          จองคิว
        </h1>

        <form
          action={createBooking}
          className="space-y-5"
        >

          {/* ส่ง token ไป backend */}
          <input
            type="hidden"
            name="idToken"
            value={idToken}
          />

          {/* branch */}
          <input
            type="text"
            name="branchId"
            placeholder="branchId"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
            required
          />

          {/* service */}
          <input
            type="text"
            name="serviceId"
            placeholder="serviceId"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
            required
          />

          {/* date */}
          <input
            type="date"
            name="date"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
            required
          />

          {/* time */}
          <input
            type="time"
            name="time"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
            required
          />

          {/* customer */}
          <input
            type="text"
            name="name"
            placeholder="ชื่อ"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
            required
          />

          <input
            type="tel"
            name="phone"
            placeholder="เบอร์โทร"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
          />

          <button
            type="submit"
            className="w-full bg-white text-black font-bold py-4 rounded-xl"
          >
            ยืนยันการจอง
          </button>

        </form>

      </div>

    </div>
  )
}