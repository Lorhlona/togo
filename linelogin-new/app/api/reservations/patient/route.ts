import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '../../../../lib/prisma'
import { options } from '../../auth/[...nextauth]/options'

// 動的APIルートの設定
export const dynamic = 'force-dynamic'

// 患者の予約一覧を取得
export async function GET() {
  try {
    const session = await getServerSession(options)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'LINEログインが必要です' },
        { status: 401 }
      )
    }

    // 患者情報の確認
    const patient = await prisma.patient.findFirst({
      where: { lineUserId: session.user.id }
    })

    if (!patient) {
      return NextResponse.json(
        { error: '患者情報が見つかりません' },
        { status: 404 }
      )
    }

    // 現在時刻（UTC）を取得
    const now = new Date()
    const pastLimit = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const reservations = await prisma.reservation.findMany({
      where: {
        patientId: patient.id,
        status: 'CONFIRMED',
        timeSlot: {
          startTime: {
            gte: pastLimit
          }
        }
      },
      include: {
        timeSlot: true
      },
      orderBy: {
        timeSlot: {
          startTime: 'asc'
        }
      }
    })

    // デバッグログ
    console.log('Fetched reservations:', reservations)

    // UTC時間のまま返す
    return NextResponse.json(reservations)
  } catch (error) {
    console.error('予約一覧取得エラー:', error)
    return NextResponse.json(
      { error: '予約一覧の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
