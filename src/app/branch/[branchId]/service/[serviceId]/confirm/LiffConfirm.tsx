'use client'

// ==============================================
// LIFF Client Component
// Secure version using ID Token verification
// ==============================================

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    liff: any
  }
}

type Props = {
  branchId: string
  serviceId: string
  time: string
  date: string
}

export function LiffConfirm({
  branchId,
  serviceId,
  time,
  date,
}: Props) {

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // ใช้ idToken แทน lineUserId
  const [idToken, setIdToken] =
    useState('')

  const [avatar, setAvatar] =
    useState('')

  const [liffReady, setLiffReady] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  const [isInLine, setIsInLine] =
    useState(false)

  useEffect(() => {

    const liffId =
      process.env.NEXT_PUBLIC_LIFF_ID

    if (!liffId) {

      setLiffReady(true)

      return
    }

    // โหลด LIFF SDK
    const script =
      document.createElement('script')

    script.src =
      'https://static.line-scdn.net/liff/edge/2/sdk.js'

    script.onload = async () => {

      try {

        await window.liff.init({
          liffId,
        })

        setIsInLine(
          window.liff.isInClient()
        )

        // บังคับ login
        if (!window.liff.isLoggedIn()) {

          window.liff.login()

          return
        }

        // ดึง profile
        const profile =
          await window.liff.getProfile()

        setName(
          profile.displayName
        )

        setAvatar(
          profile.pictureUrl ?? ''
        )

        // ✅ ดึง ID Token จริงจาก LINE
        const token =
          window.liff.getIDToken()

        if (token) {
          setIdToken(token)
        }

      } catch (err) {

        console.error(
          'LIFF init error:',
          err
        )

      } finally {

        setLiffReady(true)

      }
    }

    document.head.appendChild(script)

  }, [])

  async function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault()

    setLoading(true)

    try {

      const formData =
        new FormData()

      formData.append(
        'branchId',
        branchId
      )

      formData.append(
        'serviceId',
        serviceId
      )

      formData.append(
        'time',
        time
      )

      formData.append(
        'date',
        date
      )

      formData.append(
        'name',
        name
      )

      formData.append(
        'phone',
        phone
      )

      // ✅ ส่ง idToken แทน lineUserId
      if (idToken) {

        formData.append(
          'idToken',
          idToken
        )
      }

      // ส่งไป backend
      const res = await fetch(
        '/api/booking/create',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (res.ok) {

        // ถ้าเปิดใน LINE app
        if (
          isInLine &&
          window.liff?.closeWindow
        ) {

          window.liff.closeWindow()

        } else {

          window.location.href =
            '/success?pending=true'
        }

      } else {

        const err =
          await res.json()

        window.location.href =
          `/error?message=${encodeURIComponent(
            err.message ??
            'เกิดข้อผิดพลาด'
          )}`
      }

    } catch (err) {

      console.error(err)

      window.location.href =
        '/error?message=เกิดข้อผิดพลาด'

    } finally {

      setLoading(false)

    }
  }

  // loading
  if (!liffReady) {

    return (

      <div className="flex flex-col items-center justify-center py-16 gap-3">

        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />

        <p className="text-sm text-gray-400">
          กำลังโหลด...
        </p>

      </div>
    )
  }

  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >

      {/* LINE profile badge */}
      {idToken && (

        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">

          {avatar && (

            <img
              src={avatar}
              alt=""
              className="w-9 h-9 rounded-full"
            />
          )}

          <div>

            <div className="text-xs text-green-700 font-medium">
              เชื่อมต่อ LINE แล้ว
            </div>

            <div className="text-sm text-green-900 font-semibold">
              {name}
            </div>

          </div>

        </div>
      )}

      {/* name */}
      <div>

        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          ชื่อ-นามสกุล
        </label>

        <input
          type="text"
          required
          value={name}
          onChange={e =>
            setName(e.target.value)
          }
          placeholder="กรอกชื่อของคุณ"
          className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-gray-400 transition"
        />

      </div>

      {/* phone */}
      <div>

        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          เบอร์โทรศัพท์
        </label>

        <input
          type="tel"
          required
          value={phone}
          onChange={e =>
            setPhone(e.target.value)
          }
          placeholder="0812345678"
          inputMode="numeric"
          className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-gray-400 transition"
        />

      </div>

      {/* submit */}
      <button
        type="submit"
        disabled={
          loading || !idToken
        }
        className="w-full rounded-2xl bg-gray-900 py-4 text-white font-bold text-base active:bg-gray-700 transition disabled:opacity-50 disabled:cursor-wait mt-2"
      >

        {loading
          ? 'กำลังส่ง...'
          : 'ส่งคำขอจอง'}

      </button>

    </form>
  )
}