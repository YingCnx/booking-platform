'use client'
import liff from '@line/liff'
export default function CloseButton() {
  const handleClose = () => {
    if (liff.isInClient()) {
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
