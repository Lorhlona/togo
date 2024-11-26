"use client";

import { Button } from "../../components/ui/button"
import { useSession } from "next-auth/react"
import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { PatientRegistrationForm } from "../../components/patient-registration-form"
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import QRScannerModal from "../../components/qr-scanner-modal"

const TIMEZONE = 'Asia/Tokyo'

interface PatientData {
  patientId: string
  lastName: string
  firstName: string
  dateOfBirth: string
  phoneNumber: string
  address: string
  registeredAt: string
}

type VisitStatus = 'WAITING' | 'CHECKED_IN' | 'COMPLETED'

interface Reservation {
  id: string
  isFirstVisit: boolean
  visitStatus: VisitStatus
  timeSlot: {
    startTime: string
    endTime: string
  }
}

const visitStatusLabels: Record<VisitStatus, string> = {
  WAITING: '未チェックイン',
  CHECKED_IN: 'チェックイン済',
  COMPLETED: '診察終了'
}

const visitStatusStyles: Record<VisitStatus, string> = {
  WAITING: 'bg-gray-100 text-gray-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800'
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const [isCheckinSuccess, setIsCheckinSuccess] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
  const [showMessage, setShowMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const startTimeJST = formatInTimeZone(
    parseISO(reservation.timeSlot.startTime),
    TIMEZONE,
    'yyyy年MM月dd日(EEEE) HH:mm',
    { locale: ja }
  )

  const reservationDate = parseISO(reservation.timeSlot.startTime)
  const now = new Date()
  const hoursDifference = (reservationDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  const canCancel = hoursDifference >= 24

  const handleCancel = async () => {
    if (!confirm('予約をキャンセルしてもよろしいですか？')) return

    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('予約をキャンセルしました')
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || '予約のキャンセルに失敗しました')
      }
    } catch (error) {
      console.error('キャンセルエラー:', error)
      alert('予約のキャンセルに失敗しました')
    }
  }

  const handleCheckin = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/reservations/${reservation.id}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'チェックインに失敗しました')
      }

      setIsCheckinSuccess(true)
      setShowMessage({ type: 'success', text: 'チェックインが完了しました' })
      
      // 成功メッセージを表示してから1秒後にリロード
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('チェックインエラー:', error)
      setShowMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'チェックインに失敗しました'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleQRScanComplete = async (success: boolean) => {
    if (success) {
      setIsCheckinSuccess(true)
      setShowMessage({ type: 'success', text: 'チェックインが完了しました' })
      // 成功メッセージを表示してから1秒後にリロード
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
    // エラーメッセージはQRScannerModal内で表示されるため、ここでは何もしない
    setIsQRScannerOpen(false)
  }

  // メッセージの自動クリア
  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => {
        setShowMessage(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showMessage])

  const [date, time] = startTimeJST.split(' ')

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 mb-4 transition-all duration-300 ${isCheckinSuccess ? 'scale-105 bg-green-50' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-lg">{date}</p>
          <p className="text-gray-600">{time}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-sm px-2 py-1 rounded-full bg-purple-100 text-purple-800">
              {reservation.isFirstVisit ? '初診' : '再診'}
            </span>
            <span className={`text-sm px-2 py-1 rounded-full ${visitStatusStyles[reservation.visitStatus]}`}>
              {visitStatusLabels[reservation.visitStatus]}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {reservation.visitStatus === 'WAITING' && (
            <>
              <Button
                onClick={handleCheckin}
                disabled={isUpdating}
                className="bg-green-500 hover:bg-green-600 text-white text-sm"
              >
                {isUpdating ? '処理中...' : 'チェックイン'}
              </Button>
              <Button
                onClick={() => setIsQRScannerOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm"
              >
                QRコード
              </Button>
            </>
          )}
          {canCancel && (
            <Button
              onClick={handleCancel}
              className="bg-red-500 hover:bg-red-600 text-white text-sm"
            >
              キャンセル
            </Button>
          )}
        </div>
      </div>
      {!canCancel && (
        <p className="text-sm text-gray-500 mt-2">
          ※予約時間の24時間前を過ぎているためキャンセルできません
        </p>
      )}
      {showMessage && (
        <div className={`mt-4 p-3 rounded-lg ${
          showMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {showMessage.text}
        </div>
      )}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScanComplete}
        reservationId={reservation.id}
      />
    </div>
  )
}

function DashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])

  useEffect(() => {
    const checkRegistration = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/patients/register')
          const data = await response.json()
          setIsRegistered(data.registered)
          if (data.registered) {
            setPatientData(data.patient)
            const hasRegistrationComplete = new URLSearchParams(window.location.search).get('registration') === 'complete'
            if (hasRegistrationComplete && typeof window !== 'undefined') {
              window.location.href = window.location.pathname
            }
          }
        } catch (error) {
          console.error('登録確認エラー:', error)
        }
      }
    }

    if (session?.user?.id) {
      checkRegistration()
    }
  }, [session])

  useEffect(() => {
    const fetchReservations = async () => {
      if (isRegistered) {
        try {
          const response = await fetch('/api/reservations/patient')
          if (response.ok) {
            const data = await response.json()
            setReservations(data)
          }
        } catch (error) {
          console.error('予約取得エラー:', error)
        }
      }
    }

    fetchReservations()
  }, [isRegistered])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  if (status === "loading" || isRegistered === null) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-blue-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          <PatientRegistrationForm
            onRegistrationComplete={() => {
              setIsRegistered(true)
              window.location.href = '/dashboard?registration=complete'
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-md mb-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">電子診察券</h1>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-gray-700 font-medium">
                ようこそ {patientData ? `${patientData.lastName} ${patientData.firstName}` : ''} さん
              </p>
            </div>
          </div>

          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <h2 className="font-medium text-gray-800 mb-3">登録情報</h2>
            <div className="space-y-2 text-sm text-gray-600">
              {patientData && (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium min-w-[100px]">カルテ番号：</span>
                    <span>{patientData.patientId}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium min-w-[100px]">お名前：</span>
                    <span>{`${patientData.lastName} ${patientData.firstName}`}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium min-w-[100px]">生年月日：</span>
                    <span>{format(new Date(patientData.dateOfBirth), 'yyyy年MM月dd日', { locale: ja })}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium min-w-[100px]">電話番号：</span>
                    <span>{patientData.phoneNumber}</span>
                  </div>
                </>
              )}
              {session?.user?.image && (
                <div className="mt-4 flex justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 relative">
                      <Image
                        src={session.user.image}
                        alt="プロフィール画像"
                        fill
                        className="rounded-full border-2 border-blue-100 object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-100 px-2 py-1 rounded-full text-xs">
                      LINE
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-medium text-gray-800 mb-3">予約一覧</h2>
            {reservations.length > 0 ? (
              <div className="space-y-4">
                {reservations.map(reservation => (
                  <ReservationCard key={reservation.id} reservation={reservation} />
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">
                現在予約はありません
              </p>
            )}
          </div>

          <div className="space-y-6">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              onClick={() => router.push('/reservation')}
            >
              診察予約
            </Button>

            {patientData?.patientId === '00001' && (
              <div className="space-y-3 border-t pt-4">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white w-full"
                  onClick={() => router.push('/medical')}
                >
                  電子カルテシステム
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                  onClick={() => router.push('/admin/timeslots')}
                >
                  予約時間枠の管理
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="font-medium text-gray-800 mb-2">診療時間</h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>月から日: 未定</p>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h2 className="font-medium text-gray-800 mb-2">重要なお知らせ</h2>
                <p className="text-xl font-bold text-red-600 text-center py-2">
                  ※ システム開発中のお知らせ ※
                </p>
                <p className="text-base font-bold text-gray-800">
                  現在、電子診察券および予約システムは開発中となっております。<br />
                  診察予約の受付は停止しておりますので、ご了承ください。
                </p>
              </div>
            </div>

            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              onClick={() => router.push('/')}
            >
              トップページに戻る
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
