import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '../../../../lib/prisma'
import { options } from '../../auth/[...nextauth]/options'

export const dynamic = 'force-dynamic'

// 予約状況の種類を定義
type AvailabilityType = '○' | '△' | '×' | 'ー'

// Prismaスキーマに基づく型定義
interface TimeSlotWithReservations {
  id: string
  startTime: Date
  endTime: Date
  isAvailable: boolean
  maxPatients: number
  isFirstVisit: boolean
  duration: number
  createdAt: Date
  updatedAt: Date
  reservations: {
    id: string
    status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  }[]
}

interface DayAvailability {
  count: number
  type: AvailabilityType
}

// LINEユーザーIDから患者情報を取得
async function getPatientByLineUserId(lineUserId: string) {
  const patient = await prisma.patient.findFirst({
    where: { lineUserId }
  })
  return patient
}

// UTCの日付文字列をJST日付に変換
function parseJSTDate(dateStr: string) {
  const date = new Date(dateStr)
  // JSTオフセットを考慮して日付を調整
  return new Date(date.getTime() - (9 * 60 * 60 * 1000))
}

// 日本時間の日付範囲を取得する関数
function getJSTMonthRange(dateStr: string) {
  const date = parseJSTDate(dateStr)
  
  // 日本時間の月初め (UTC+9)
  const startOfMonth = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    1,
    -9, // JST 00:00 = UTC-9:00
    0,
    0,
    0
  ))
  
  // 日本時間の月末 (UTC+9)
  const endOfMonth = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    0,
    14, // JST 23:59:59 = UTC+14:59:59
    59,
    59,
    999
  ))

  return { startOfMonth, endOfMonth, year: date.getUTCFullYear(), month: date.getUTCMonth() }
}

// JSTでの日付文字列を生成
function formatJSTDate(date: Date): string {
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
  return jstDate.toISOString().split('T')[0]
}

// 月単位の予約状況を取得
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'LINEログインが必要です' },
        { status: 401 }
      )
    }

    // 患者情報の確認
    const patient = await getPatientByLineUserId(session.user.id)
    if (!patient) {
      return NextResponse.json(
        { error: '患者登録が必要です。先に患者登録を行ってください。' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date')
    const isFirstVisit = searchParams.get('isFirstVisit') === 'true'

    if (!dateStr) {
      return NextResponse.json(
        { error: '日付の指定が必要です' },
        { status: 400 }
      )
    }

    // 日本時間での月の範囲を取得
    const { startOfMonth, endOfMonth, year, month } = getJSTMonthRange(dateStr)

    // 月の全時間枠を取得
    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        startTime: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isAvailable: true,
        duration: isFirstVisit ? 30 : 15,
        isFirstVisit: isFirstVisit
      },
      include: {
        reservations: {
          where: {
            status: 'CONFIRMED'
          },
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // 日付ごとの予約状況を集計
    const availability: Record<string, DayAvailability> = {}
    
    timeSlots.forEach((slot: TimeSlotWithReservations) => {
      const dateKey = formatJSTDate(slot.startTime)
      
      if (!availability[dateKey]) {
        availability[dateKey] = {
          count: 0,
          type: 'ー'
        }
      }

      const remainingSlots = slot.maxPatients - slot.reservations.length
      
      if (remainingSlots > 0) {
        // 予約可能枠の合計を更新
        availability[dateKey].count += remainingSlots
        
        // 予約状況タイプを更新
        if (slot.reservations.length === 0) {
          availability[dateKey].type = '○'
        } else if (remainingSlots <= 2) { // 残り2枠以下で△表示
          availability[dateKey].type = '△'
        } else {
          availability[dateKey].type = '○'
        }
      } else {
        availability[dateKey].type = '×'
      }
    })

    // 予約枠がない日は×表示
    // JSTベースで日付を生成
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const allDaysInMonth = Array.from(
      { length: daysInMonth },
      (_, i) => {
        const day = new Date(Date.UTC(year, month, i + 1, -9)) // JST 00:00
        return formatJSTDate(day)
      }
    )

    allDaysInMonth.forEach(dateKey => {
      if (!availability[dateKey]) {
        availability[dateKey] = {
          count: 0,
          type: '×'
        }
      }
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error('月間予約状況取得エラー:', error)
    return NextResponse.json(
      { error: '予約状況の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
