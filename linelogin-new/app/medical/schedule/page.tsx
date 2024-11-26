'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ScheduleView from '../../../components/medical/schedule-view'

export default function SchedulePage() {
  const router = useRouter()
  const { status } = useSession()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    const checkAuthorization = async () => {
      try {
        const response = await fetch('/api/patients/register')
        const data = await response.json()
        
        if (!data.registered || data.patient?.patientId !== '00001') {
          router.push('/')
          return
        }
        
        setIsAuthorized(true)
      } catch (error) {
        console.error('認証エラー:', error)
        router.push('/')
      }
    }

    checkAuthorization()
  }, [router, status])

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">予約状況</h1>
      <ScheduleView />
    </div>
  )
}
