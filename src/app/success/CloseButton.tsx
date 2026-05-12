'use client'

import { useEffect, useState } from 'react'
import liff from '@line/liff'

export default function CloseButton() {

  const [isLineClient, setIsLineClient] = useState(false)

  useEffect(() => {

    const initLiff = async () => {
      try {

        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID!
        })

        setIsLineClient(liff.isInClient())

      } catch (error) {
        console.error(error)
      }
    }

    initLiff()

  }, [])

  const handleClose = () => {

    if (isLineClient) {
      liff.closeWindow()
    } else {
      window.location.href = '/'
    }
  }

  return (
    <button
      onClick={handleClose}
      className="mt-8 block w-full bg-gray-900 text-white font-semibold py-4 rounded-2xl text-base active:bg-gray-700 transition"
    >
      กลับไป LINE
    </button>
  )
}