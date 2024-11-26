'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "../../components/ui/button"
import { ReservationSteps } from "../../components/reservation/reservation-steps"

export default function ReservationPage() {
  const { status } = useSession()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  const handleReservationComplete = async (data: {
    date: Date
    timeSlotId: string
    isFirstVisit: boolean
  }) => {
    try {
      // dateパラメータを除外して必要なパラメータのみを送信
      const { timeSlotId, isFirstVisit } = data
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeSlotId,
          isFirstVisit
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '予約の作成に失敗しました')
      }

      // 予約成功時はダッシュボードに戻る
      router.push('/dashboard')
    } catch (error) {
      console.error('予約エラー:', error)
      setError(error instanceof Error ? error.message : '予約処理中にエラーが発生しました')
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">診察予約</h1>
              <Button
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => router.push('/dashboard')}
              >
                ダッシュボードに戻る
              </Button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            <ReservationSteps onComplete={handleReservationComplete} />
          </div>
        </div>
      </div>
    </div>
  )
}
