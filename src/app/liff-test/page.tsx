'use client'

import { useEffect, useState } from 'react'

export default function LiffTestPage() {
  const [msg, setMsg] = useState('loading...')

  useEffect(() => {
    async function run() {
      try {
        const script = document.createElement('script')
        script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'

        await new Promise((resolve) => {
          script.onload = resolve
          document.head.appendChild(script)
        })

        await window.liff.init({
          liffId: 'LIFF_ID_ใหม่'
        })

        setMsg(`
init OK
inClient: ${window.liff.isInClient()}
loggedIn: ${window.liff.isLoggedIn()}
`)
      } catch (e: any) {
        setMsg(`ERROR: ${e.message}`)
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