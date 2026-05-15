'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  href: string
  children: React.ReactNode
  className?: string
  activeClassName?: string
}

// ✅ Link ที่มี loading state ทันทีที่กด + ripple effect
export function SelectableLink({
  href,
  children,
  className = '',
  activeClassName = '',
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pressed, setPressed] = useState(false)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    setPressed(true)
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <Link
      href={href}
      prefetch={true}
      onClick={handleClick}
      className={[
        'relative overflow-hidden transition-all duration-150',
        pending || pressed ? activeClassName : '',
        pending || pressed ? 'scale-[0.97] opacity-80' : '',
        className,
      ].join(' ')}
    >
      {children}
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/10">
          <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
        </span>
      )}
    </Link>
  )
}
