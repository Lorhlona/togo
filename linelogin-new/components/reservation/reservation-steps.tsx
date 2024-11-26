"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "../ui/button"
import { isBefore, startOfToday, format } from "date-fns"
import { useRouter } from "next/navigation"
import { toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'Asia/Tokyo'

// 日本時間でのISO文字列を生成する関数
const toJSTDateString = (date: Date): string => {
  const jstDate = toZonedTime(date, TIMEZONE)
  return format(jstDate, 'yyyy-MM-dd')
}

interface ApiError {
  message?: string
}

interface TimeSlotResponse {
  id: string
  startTime: string
  endTime: string
  isAvailable: boolean
  maxPatients: number
  currentPatients: number
  isFirstVisit: boolean
  duration: number
}

interface ReservationStepsProps {
  onComplete: (data: {
    date: Date
    timeSlotId: string
    isFirstVisit: boolean
  }) => Promise<void>
}

export function ReservationSteps({ onComplete }: ReservationStepsProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)

  // エラーハンドリング関数
  const handleApiError = useCallback((error: ApiError) => {
    if (error.message?.includes('患者登録')) {
      if (confirm('患者登録が必要です。登録ページに移動しますか？')) {
        router.push('/medical/patient-registration')
      }
      return '患者登録が必要です'
    } else if (error.message?.includes('LINEログイン')) {
      router.push('/')
      return 'LINEログインが必要です'
    }
    return error.message || '予期せぬエラーが発生しました'
  }, [router])

  // 初診・再診選択ステップ
  const VisitTypeStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        初診・再診を選択してください
      </h2>
      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => {
            setIsFirstVisit(true)
            nextStep()
          }}
          className={`p-4 rounded-lg border-2 text-left transition-colors ${
            isFirstVisit
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <h3 className="font-medium text-gray-900">初診</h3>
          <p className="text-sm text-gray-500 mt-1">初めての方（診察時間30分）</p>
        </button>
        <button
          onClick={() => {
            setIsFirstVisit(false)
            nextStep()
          }}
          className={`p-4 rounded-lg border-2 text-left transition-colors ${
            isFirstVisit === false
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <h3 className="font-medium text-gray-900">再診</h3>
          <p className="text-sm text-gray-500 mt-1">2回目以降の方（診察時間15分）</p>
        </button>
      </div>
      <div className="text-sm text-gray-500 mt-4">
        <p>※ 初診の方は30分の診察時間が必要となります</p>
        <p>※ 再診の方は15分の診察時間となります</p>
        <p>※ 初診の方は事前に患者登録が必要です</p>
      </div>
    </div>
  )

  // カレンダービュー
  const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(() => new Date())
    const [availableSlots, setAvailableSlots] = useState<Record<string, { count: number; type: '○' | '△' | '×' | 'ー' }>>({})
    const today = startOfToday()

    const fetchAvailability = useCallback(async () => {
      try {
        const response = await fetch(
          `/api/reservations/month?date=${toJSTDateString(currentDate)}&isFirstVisit=${isFirstVisit}`
        )
        if (!response.ok) {
          throw new Error('予約状況の取得に失敗しました')
        }
        const data = await response.json()
        setAvailableSlots(data)
      } catch (error) {
        console.error('予約状況の取得エラー:', error)
      }
    }, [currentDate])

    useEffect(() => {
      fetchAvailability()
    }, [fetchAvailability])

    const formatDateKey = (date: Date) => {
      return toJSTDateString(date)
    }

    const handleMonthChange = (offset: number) => {
      const newDate = new Date(currentDate)
      newDate.setMonth(newDate.getMonth() + offset)
      setCurrentDate(newDate)
    }

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
    const weeks: (number | null)[][] = []
    let week: (number | null)[] = Array(7).fill(null)

    Array.from({ length: daysInMonth }, (_, i) => i + 1).forEach((day) => {
      const dayIndex = (firstDayOfMonth + day - 1) % 7
      week[dayIndex] = day
      if (dayIndex === 6 || day === daysInMonth) {
        weeks.push([...week])
        week = Array(7).fill(null)
      }
    })

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">
          診察希望日を選択してください
        </h2>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => handleMonthChange(-1)}
              className="border-[#00B8B8] text-[#00B8B8]"
            >
              前月
            </Button>
            <h2 className="text-xl font-medium">
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </h2>
            <Button
              onClick={() => handleMonthChange(1)}
              className="border-[#00B8B8] text-[#00B8B8]"
            >
              翌月
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
              <div
                key={day}
                className={`p-2 text-center text-sm font-medium ${
                  i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''
                }`}
              >
                {day}
              </div>
            ))}

            {weeks.map((week, weekIndex) => (
              <React.Fragment key={weekIndex}>
                {week.map((day, dayIndex) => {
                  if (!day) return <div key={`empty-${dayIndex}`} className="p-2 bg-white" />

                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                  const dateKey = formatDateKey(date)
                  const slots = availableSlots[dateKey]
                  const isDisabled = isBefore(date, today) || dayIndex === 0 || dayIndex === 6

                  return (
                    <div
                      key={`day-${day}`}
                      className={`p-2 bg-white relative ${
                        dayIndex === 0 ? 'text-red-500' : dayIndex === 6 ? 'text-blue-500' : ''
                      }`}
                    >
                      <Button
                        variant="ghost"
                        disabled={isDisabled}
                        className={`w-full h-full min-h-[60px] p-1 ${
                          slots?.type === '○' ? 'bg-green-100 hover:bg-green-200' :
                          slots?.type === '△' ? 'bg-yellow-100 hover:bg-yellow-200' :
                          'bg-red-100 hover:bg-red-200'
                        }`}
                        onClick={() => {
                          setSelectedDate(date)
                          nextStep()
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-lg">{day}</span>
                          {slots && (
                            <>
                              <span className="text-2xl">{slots.type}</span>
                              {slots.count > 0 && slots.type !== 'ー' && (
                                <span className="text-xs">
                                  あと{slots.count}枠
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </Button>
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500 flex gap-4">
            <div className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 bg-green-100 rounded-full"></span>
              <span>○: 予約可能</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 bg-yellow-100 rounded-full"></span>
              <span>△: 残りわずか</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 bg-red-100 rounded-full"></span>
              <span>×: 予約不可</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 bg-gray-100 rounded-full"></span>
              <span>ー: {isFirstVisit ? "再診枠" : "初診枠"}</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>※ 土日・祝日は休診日です</p>
          <p>※ 30日先までの予約が可能です</p>
        </div>
        <div className="flex justify-between mt-6">
          <Button
            onClick={prevStep}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            戻る
          </Button>
          <Button
            onClick={nextStep}
            disabled={!selectedDate}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            次へ
          </Button>
        </div>
      </div>
    )
  }

  // 時間枠選択ステップ
  const TimeSlotStep = () => {
    const [timeSlots, setTimeSlots] = useState<TimeSlotResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchTimeSlots = useCallback(async () => {
      if (!selectedDate) return

      try {
        setIsLoading(true)
        const response = await fetch(
          `/api/reservations?date=${toJSTDateString(selectedDate)}&isFirstVisit=${isFirstVisit}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '時間枠の取得に失敗しました')
        }

        const data = await response.json()
        setTimeSlots(data)
        setError(null)
      } catch (err) {
        const errorMessage = handleApiError(err as ApiError)
        setError(errorMessage)
        setTimeSlots([])
      } finally {
        setIsLoading(false)
      }
    }, [])

    useEffect(() => {
      fetchTimeSlots()
    }, [fetchTimeSlots])

    const handleTimeSlotSelect = (slotId: string) => {
      setSelectedTimeSlot(slotId)
      // 時間枠を選択したら自動的に次のステップへ
      nextStep()
    }

    // UTCからJSTに変換して時刻を表示する関数
    const formatJSTTime = (utcTimeString: string) => {
      const date = new Date(utcTimeString)
      const jstDate = toZonedTime(date, TIMEZONE)
      return format(jstDate, 'HH:mm')
    }

    if (error) {
      return (
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-4">
            <p>{error}</p>
            {error.includes('患者登録') && (
              <Button
                onClick={() => router.push('/medical/patient-registration')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                患者登録へ進む
              </Button>
            )}
          </div>
          <Button
            onClick={fetchTimeSlots}
            className="bg-blue-600 hover:bg-blue-700 text-white mr-2"
          >
            再試行
          </Button>
          <Button
            onClick={prevStep}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            戻る
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">
          診察時間を選択してください
        </h2>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600">
            選択した日付: {selectedDate?.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
          <p className="text-sm text-gray-600">
            診察区分: {isFirstVisit ? '初診（30分）' : '再診（15分）'}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">時間枠を読み込み中...</p>
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="col-span-full text-center bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg">
              <p>選択した日付の予約可能な時間枠がありません</p>
              <p className="text-sm mt-2">別の日付を選択してください</p>
            </div>
          ) : (
            timeSlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => slot.isAvailable && handleTimeSlotSelect(slot.id)}
                disabled={!slot.isAvailable}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  !slot.isAvailable
                    ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:bg-blue-100'
                }`}
              >
                <p className="font-medium text-gray-900">
                  {formatJSTTime(slot.startTime)}
                </p>
                <p className="text-sm text-gray-500">
                  ～{formatJSTTime(slot.endTime)}
                </p>
                {!slot.isAvailable && (
                  <p className="text-xs text-red-500 mt-1">予約済み</p>
                )}
                {slot.isAvailable && (
                  <p className="text-xs text-gray-500 mt-1">
                    残り{slot.maxPatients - slot.currentPatients}枠
                  </p>
                )}
              </button>
            ))
          )}
        </div>
        <div className="text-sm text-gray-500 mt-4">
          <p>※ 予約済みの時間枠は選択できません</p>
          <p>※ 診察時間は前後する可能性があります</p>
        </div>
        <div className="flex justify-start mt-6">
          <Button
            onClick={prevStep}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            戻る
          </Button>
        </div>
      </div>
    )
  }

  // 予約確認ステップ
  const ConfirmationStep = () => {
    const [selectedTimeSlotDetails, setSelectedTimeSlotDetails] = useState<TimeSlotResponse | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchTimeSlotDetails = useCallback(async () => {
      if (!selectedDate) return

      try {
        setLoadingDetails(true)
        const response = await fetch(
          `/api/reservations?date=${toJSTDateString(selectedDate)}&isFirstVisit=${isFirstVisit}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '時間枠の詳細取得に失敗しました')
        }

        const timeSlots = await response.json()
        const selectedSlot = timeSlots.find((slot: TimeSlotResponse) => slot.id === selectedTimeSlot)
        if (selectedSlot) {
          setSelectedTimeSlotDetails(selectedSlot)
          setError(null)
        } else {
          throw new Error('選択された時間枠が見つかりません')
        }
      } catch (error) {
        const errorMessage = handleApiError(error as ApiError)
        setError(errorMessage)
      } finally {
        setLoadingDetails(false)
      }
    }, [])

    useEffect(() => {
      fetchTimeSlotDetails()
    }, [fetchTimeSlotDetails])

    const handleConfirm = async () => {
      if (!selectedDate || !selectedTimeSlot) return
      
      setIsSubmitting(true)
      try {
        await onComplete({
          date: selectedDate,
          timeSlotId: selectedTimeSlot,
          isFirstVisit
        })
      } catch (error) {
        const errorMessage = handleApiError(error as ApiError)
        setError(errorMessage)
      } finally {
        setIsSubmitting(false)
      }
    }

    // UTCからJSTに変換して時刻を表示する関数
    const formatJSTTime = (utcTimeString: string) => {
      const date = new Date(utcTimeString)
      const jstDate = toZonedTime(date, TIMEZONE)
      return format(jstDate, 'HH:mm')
    }

    if (loadingDetails) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">予約内容を読み込み中...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-4">
            <p>{error}</p>
            {error.includes('患者登録') && (
              <Button
                onClick={() => router.push('/medical/patient-registration')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                患者登録へ進む
              </Button>
            )}
          </div>
          <Button
            onClick={prevStep}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            戻る
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">
          予約内容の確認
        </h2>
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div>
            <h3 className="font-medium text-gray-700">診療科</h3>
            <p className="mt-1">精神科</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-700">診察区分</h3>
            <p className="mt-1">{isFirstVisit ? '初診（30分）' : '再診（15分）'}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-700">診察日</h3>
            <p className="mt-1">
              {selectedDate?.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
          </div>
          {selectedTimeSlotDetails && (
            <div>
              <h3 className="font-medium text-gray-700">診察時間</h3>
              <p className="mt-1">
                {formatJSTTime(selectedTimeSlotDetails.startTime)}
                ～
                {formatJSTTime(selectedTimeSlotDetails.endTime)}
              </p>
            </div>
          )}
        </div>
        <div className="text-sm text-gray-500 mt-4">
          <p>※ 予約内容を確認の上、「予約を確定する」ボタンを押してください</p>
          <p>※ 予約確定後はLINEで予約確認通知が送信されます</p>
          <p>※ 予約のキャンセルは24時間前まで可能です</p>
        </div>
        <div className="flex justify-between mt-6">
          <Button
            onClick={prevStep}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            戻る
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? '予約処理中...' : '予約を確定する'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {step === 1 && <VisitTypeStep />}
      {step === 2 && <CalendarView />}
      {step === 3 && <TimeSlotStep />}
      {step === 4 && <ConfirmationStep />}
    </div>
  )
}
