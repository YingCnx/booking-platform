'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window { liff: any }
}

type Props = {
  branchId: string
  serviceId: string
  time: string
  date: string
}

export function LiffConfirm({ branchId, serviceId, time, date }: Props) {
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [idToken, setIdToken]     = useState('')
  const [avatar, setAvatar]       = useState('')
  const [liffReady, setLiffReady] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [isInLine, setIsInLine]   = useState(false)
  const [debugLog, setDebugLog]   = useState<string[]>([])

  function log(msg: string) {
    console.log('[LIFF]', msg)
    setDebugLog(prev => [...prev, msg])
  }

  useEffect(() => {
    async function initLiff() {
      try {
        const configRes = await fetch(`/api/shop-config?branchId=${branchId}`)
        const config = await configRes.json()
        const liffId = config.liffId

        log(`liffId: ${liffId ?? 'null'}`)

        if (!liffId) {
          log('no liffId — form only mode')
          setLiffReady(true)
          return
        }

        // โหลด SDK
        if (!document.querySelector('script[src*="liff/edge"]')) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load LIFF SDK'))
            document.head.appendChild(script)
          })
        }

        log('SDK loaded')

        // ✅ init พร้อม withLoginOnExternalBrowser
        await window.liff.init({
          liffId,
          withLoginOnExternalBrowser: true,
        })

        const inClient = window.liff.isInClient()
        log(`init OK, inClient: ${inClient}`)
        setIsInLine(inClient)

        if (!window.liff.isLoggedIn()) {
          log('not logged in — calling login()')
          window.liff.login()
          return
        }

        const profile = await window.liff.getProfile()
        setName(profile.displayName)
        setAvatar(profile.pictureUrl ?? '')
        log(`profile: ${profile.displayName}`)

        const token = window.liff.getIDToken()
        log(`getIDToken: ${token ? 'GOT TOKEN ✓' : 'null ✗'}`)
        if (token) setIdToken(token)

      } catch (err: any) {
        log(`ERROR: ${err?.message ?? err}`)
        // ✅ ไม่ redirect — แสดง form ธรรมดาแทน
      } finally {
        setLiffReady(true)
      }
    }

    initLiff()
  }, [branchId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('branchId', branchId)
      formData.append('serviceId', serviceId)
      formData.append('time', time)
      formData.append('date', date)
      formData.append('name', name)
      formData.append('phone', phone)
      if (idToken) {
        formData.append('idToken', idToken)
        log(`submit with idToken (${idToken.length} chars)`)
      } else {
        log('submit without idToken')
      }

      const res = await fetch('/api/booking/create', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        if (isInLine && window.liff?.closeWindow) {
          window.liff.closeWindow()
        } else {
          window.close()
          setTimeout(() => { window.location.href = '/success?pending=true' }, 300)
        }
      } else {
        const err = await res.json()
        window.location.href = `/error?message=${encodeURIComponent(err.message ?? 'เกิดข้อผิดพลาด')}`
      }
    } catch {
      window.location.href = '/error?message=เกิดข้อผิดพลาด'
    } finally {
      setLoading(false)
    }
  }

  if (!liffReady) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        <p className="text-sm text-gray-500">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* DEBUG BOX — ลบออกหลังแก้เสร็จ */}
      <div className="bg-black text-green-400 rounded-xl p-3 text-xs font-mono space-y-1">
        {debugLog.length === 0
          ? <div className="text-gray-500">รอ LIFF init...</div>
          : debugLog.map((msg, i) => <div key={i}>▶ {msg}</div>)
        }
      </div>

      {idToken && (
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
          {avatar && <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" />}
          <div>
            <div className="text-xs font-medium text-green-700">เชื่อมต่อ LINE แล้ว</div>
            <div className="text-sm font-semibold text-green-900">{name}</div>
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-900">ชื่อ-นามสกุล</label>
        <input type="text" required value={name} onChange={e => setName(e.target.value)}
          placeholder="กรอกชื่อของคุณ"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none" />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-900">เบอร์โทรศัพท์</label>
        <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="0812345678" inputMode="numeric"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none" />
      </div>

      <button type="submit" disabled={loading}
        className="w-full rounded-2xl bg-black py-4 text-base font-bold text-white transition active:scale-[0.99] disabled:opacity-50">
        {loading ? 'กำลังส่ง...' : 'ส่งคำขอจอง'}
      </button>

      {!idToken && liffReady && (
        <p className="text-center text-xs text-amber-500">
          เปิดผ่าน LINE เพื่อรับการแจ้งเตือนการจอง
        </p>
      )}

    </form>
  )
}
