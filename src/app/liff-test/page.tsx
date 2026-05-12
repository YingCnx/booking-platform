'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    liff: any
  }
}

export default function LiffTestPage() {
  const [msg, setMsg] = useState('loading...')

  useEffect(() => {
    async function run() {
      try {
        // โหลด SDK ครั้งเดียว
        if (!window.liff) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector(
              'script[src="https://static.line-scdn.net/liff/edge/2/sdk.js"]'
            )

            if (existing) {
              resolve()
              return
            }

            const script = document.createElement('script')
            script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'

            script.onload = () => resolve()
            script.onerror = () => reject(new Error('โหลด LIFF SDK ไม่สำเร็จ'))

            document.head.appendChild(script)
          })
        }

        await window.liff.init({
          liffId: '2010068154-iVaf3lVo'
        })

        setMsg(`
init OK
inClient: ${window.liff.isInClient()}
loggedIn: ${window.liff.isLoggedIn()}
url: ${window.location.href}
`)
      } catch (e: any) {
        setMsg(`ERROR: ${e?.message ?? e}`)
      }
    }

    run()
  }, [])

  return (
    <pre className="p-10 whitespace-pre-wrap">
      {msg}
    </pre>
  )
}