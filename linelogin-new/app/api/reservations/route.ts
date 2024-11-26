import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '../../../lib/prisma'
import { options } from '../auth/[...nextauth]/options'

type ReservationStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  isAvailable: boolean
  maxPatients: number
  duration: number
  isFirstVisit: boolean
  reservations: Array<{
    id: string
    status: ReservationStatus
    isFirstVisit: boolean
    patient: {
      lastName: string
      firstName: string
    }
  }>
}

interface AvailableTimeSlot {
  id: string
  startTime: Date
  endTime: Date
  isAvailable: boolean
  maxPatients: number
  currentPatients: number
  isFirstVisit: boolean
  duration: number
}

// LINEユーザーIDから患者情報を取得
async function getPatientByLineUserId(lineUserId: string) {
  const patient = await prisma.patient.findFirst({
    where: { lineUserId }
  })
  return patient
}

// 予約可能な時間枠を取得
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
    const date = searchParams.get('date')
    const isFirstVisit = searchParams.get('isFirstVisit') === 'true'

    if (!date) {
      return NextResponse.json(
        { error: '日付の指定が必要です' },
        { status: 400 }
      )
    }

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // 時間枠と予約情報を取得
    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        isAvailable: true,
        // 初診の場合は30分枠のみ、再診の場合は15分枠のみを取得
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
            status: true,
            isFirstVisit: true,
            patient: {
              select: {
                lastName: true,
                firstName: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // 予約状況に基づいて利用可能な時間枠を整形
    const availableTimeSlots: AvailableTimeSlot[] = timeSlots.map((slot: TimeSlot) => {
      const confirmedReservations = slot.reservations.filter(r => r.status === 'CONFIRMED')
      const isAvailable = confirmedReservations.length < slot.maxPatients
      return {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable,
        maxPatients: slot.maxPatients,
        currentPatients: confirmedReservations.length,
        isFirstVisit: slot.isFirstVisit,
        duration: slot.duration
      }
    })

    return NextResponse.json(availableTimeSlots)
  } catch (error) {
    console.error('時間枠取得エラー:', error)
    return NextResponse.json(
      { error: '予約可能な時間枠の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 予約の作成
export async function POST(req: Request) {
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

    const { timeSlotId, isFirstVisit } = await req.json()

    if (!timeSlotId) {
      return NextResponse.json(
        { error: '時間枠の指定が必要です' },
        { status: 400 }
      )
    }

    // 時間枠の確認
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      include: {
        reservations: {
          where: {
            status: 'CONFIRMED'
          }
        }
      }
    })

    if (!timeSlot) {
      return NextResponse.json(
        { error: '指定された時間枠が見つかりません' },
        { status: 404 }
      )
    }

    // 予約可能性チェック
    if (!timeSlot.isAvailable) {
      return NextResponse.json(
        { error: 'この時間枠は予約できません' },
        { status: 400 }
      )
    }

    // 確定済みの予約数をチェック
    const confirmedReservations = timeSlot.reservations.filter(r => r.status === 'CONFIRMED')
    if (confirmedReservations.length >= timeSlot.maxPatients) {
      return NextResponse.json(
        { error: 'この時間枠は既に予約が埋まっています' },
        { status: 400 }
      )
    }

    // 初診/再診の時間枠チェック
    if (isFirstVisit && timeSlot.duration !== 30) {
      return NextResponse.json(
        { error: '初診の方は30分の時間枠を選択してください' },
        { status: 400 }
      )
    }

    if (!isFirstVisit && timeSlot.duration !== 15) {
      return NextResponse.json(
        { error: '再診の方は15分の時間枠を選択してください' },
        { status: 400 }
      )
    }

    // 同じ時間枠での重複予約チェック
    const existingReservationInTimeSlot = await prisma.reservation.findFirst({
      where: {
        patientId: patient.id,
        timeSlotId: timeSlotId,
        status: 'CONFIRMED'
      }
    })

    if (existingReservationInTimeSlot) {
      return NextResponse.json(
        { error: 'この時間枠に既に予約が入っています' },
        { status: 400 }
      )
    }

    // 予約の作成
    const reservation = await prisma.reservation.create({
      data: {
        timeSlotId,
        patientId: patient.id,
        isFirstVisit,
        status: 'CONFIRMED'
      },
      include: {
        timeSlot: true,
        patient: {
          select: {
            lastName: true,
            firstName: true
          }
        }
      }
    })

    // LINE Notifyで予約通知を送信
    try {
      await fetch('/api/line-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `予約が確定しました\n\n日時: ${timeSlot.startTime.toLocaleString('ja-JP')}\n診察区分: ${isFirstVisit ? '初診' : '再診'}\n患者名: ${patient.lastName} ${patient.firstName}`
        })
      })
    } catch (error) {
      console.error('LINE通知エラー:', error)
      // 通知エラーは予約自体には影響させない
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('予約作成エラー:', error)
    return NextResponse.json(
      { error: '予約の作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 予約のキャンセル
export async function DELETE(req: Request) {
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
        { error: '患者情報が見つかりません' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '予約IDが必要です' },
        { status: 400 }
      )
    }

    // 予約の存在確認
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        timeSlot: true,
        patient: true
      }
    })

    if (!reservation) {
      return NextResponse.json(
        { error: '指定された予約が見つかりません' },
        { status: 404 }
      )
    }

    // 予約者本人のみキャンセル可能
    if (reservation.patientId !== patient.id) {
      return NextResponse.json(
        { error: 'この予約をキャンセルする権限がありません' },
        { status: 403 }
      )
    }

    // キャンセル可能時間のチェック（24時間前まで）
    const now = new Date()
    const reservationTime = new Date(reservation.timeSlot.startTime)
    const hoursDifference = (reservationTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursDifference < 24) {
      return NextResponse.json(
        { error: '予約時間の24時間前を過ぎているためキャンセルできません' },
        { status: 400 }
      )
    }

    // 予約のキャンセル
    await prisma.reservation.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      }
    })

    // LINE Notifyでキャンセル通知を送信
    try {
      await fetch('/api/line-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `予約がキャンセルされました\n\n日時: ${reservation.timeSlot.startTime.toLocaleString('ja-JP')}\n患者名: ${reservation.patient.lastName} ${reservation.patient.firstName}`
        })
      })
    } catch (error) {
      console.error('LINE通知エラー:', error)
      // 通知エラーはキャンセル自体には影響させない
    }

    return NextResponse.json({ message: '予約をキャンセルしました' })
  } catch (error) {
    console.error('予約キャンセルエラー:', error)
    return NextResponse.json(
      { error: '予約のキャンセル中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
