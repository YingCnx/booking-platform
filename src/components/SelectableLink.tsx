'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  href: string
  children: React.ReactNode
  className?: string
}

// ✅ Link ที่มี tactile feedback ทันทีที่กด + loading spinner
export function SelectableLink({ href, children, className = '' }: Props) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    setPressed(true)
    // ให้ effect render ก่อน navigate
    requestAnimationFrame(() => {
      router.push(href)
    })
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      onMouseDown={() => setPressed(true)}
      onTouchStart={() => setPressed(true)}
      className={[
        'relative transition-all duration-150 ease-out',
        pressed ? 'scale-[0.96] opacity-70' : 'scale-100 opacity-100',
        className,
      ].join(' ')}
    >
      {children}
      {pressed && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-2xl pointer-events-none">
          <span className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
        </span>
      )}
    </a>
  )
}
