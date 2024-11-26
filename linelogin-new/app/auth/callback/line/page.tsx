'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LineCallback() {
  const router = useRouter()
  const [count, setCount] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
      <p className="text-gray-600">
        ログイン成功！ {count}秒後にダッシュボードへ移動します...
      </p>
    </div>
  )
}
