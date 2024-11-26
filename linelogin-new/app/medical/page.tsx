'use client'

import { Button } from "../../components/ui/button"
import { PlusCircle, Calendar, Users, ClipboardList, Database } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from 'next-auth/react'
import QRCodeDisplay from "../../components/medical/qr-code-display"

interface Patient {
  id: string
  lastName: string
  firstName: string
}

interface Reservation {
  id: string
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
}

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  reservations?: Reservation[]
}

export default function MedicalPage() {
  const router = useRouter()
  const { status } = useSession()
  const [recentPatients, setRecentPatients] = useState<Patient[]>([])
  const [todayAppointments, setTodayAppointments] = useState<number>(0)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    // 権限チェック
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

  useEffect(() => {
    if (isAuthorized) {
      // 今日の予約数を取得
      const fetchTodayAppointments = async () => {
        try {
          const today = new Date()
          const formattedDate = today.toISOString().split('T')[0]
          const response = await fetch(`/api/timeslots?startDate=${formattedDate}&endDate=${formattedDate}`)
          
          if (!response.ok) throw new Error('予約データの取得に失敗しました')
          
          const timeSlots: TimeSlot[] = await response.json()
          const confirmedAppointments = timeSlots.reduce((total: number, slot: TimeSlot) => {
            return total + (slot.reservations?.filter(r => r.status === 'CONFIRMED').length || 0)
          }, 0)
          
          setTodayAppointments(confirmedAppointments)
        } catch (error) {
          console.error('予約数取得エラー:', error)
          setTodayAppointments(0)
        }
      }

      fetchTodayAppointments()

      // 仮データ
      setRecentPatients([
        { id: "1", lastName: "山田", firstName: "太郎" },
        { id: "2", lastName: "佐藤", firstName: "花子" },
        { id: "3", lastName: "鈴木", firstName: "一郎" },
      ])
    }
  }, [isAuthorized])

  // 認証チェック中は読み込み中表示
  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">電子カルテシステム</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/medical/patient-registration">
          <Button className="w-full h-24 text-lg flex items-center justify-center">
            <PlusCircle className="mr-2 h-5 w-5" />
            新規患者登録
          </Button>
        </Link>
        <Button className="w-full h-24 text-lg flex items-center justify-center">
          <Calendar className="mr-2 h-5 w-5" />
          予約作成
        </Button>
        <Link href="/admin/patients" prefetch={false}>
          <Button 
            className="w-full h-24 text-lg flex items-center justify-center bg-purple-600 hover:bg-purple-700"
          >
            <Database className="mr-2 h-5 w-5" />
            患者データベース管理
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/medical/schedule" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200">
            <h2 className="text-lg font-semibold mb-2 flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-blue-500" />
              今日の予約
            </h2>
            <p className="text-3xl font-bold text-blue-600">{todayAppointments}</p>
            <p className="text-sm text-gray-500 mt-2">クリックで詳細を表示</p>
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">待機中の患者</h2>
          <p className="text-3xl font-bold">3</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">今月の新規患者</h2>
          <p className="text-3xl font-bold">28</p>
        </div>
      </div>

      {/* QRコード表示セクションを追加 */}
      <div className="mb-6">
        <QRCodeDisplay />
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">最近のアクティビティ</h2>
        <div className="space-y-4">
          {recentPatients.map((patient) => (
            <div key={patient.id} className="flex items-center space-x-4 border-b pb-2">
              <Users className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">{`${patient.lastName}${patient.firstName}さんのカルテが更新されました`}</p>
                <p className="text-sm text-gray-500">数分前</p>
              </div>
            </div>
          ))}
          <div className="flex items-center space-x-4 border-b pb-2">
            <ClipboardList className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-medium">新しい検査結果が追加されました</p>
              <p className="text-sm text-gray-500">30分前</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
