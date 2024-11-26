import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id

    // 予約の存在確認
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        timeSlot: true,
      },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      )
    }

    // 予約のステータスを更新
    await prisma.$executeRaw`
      UPDATE "Reservation"
      SET "visitStatus" = 'CHECKED_IN'::"VisitStatus"
      WHERE id = ${reservationId}
    `

    // 更新後の予約情報を取得
    const updatedReservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId,
      },
      include: {
        patient: true,
        timeSlot: true,
      },
    })

    return NextResponse.json({
      message: "チェックインが完了しました",
      reservation: updatedReservation,
    })
  } catch (error) {
    console.error('チェックインエラー:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `チェックインに失敗しました: ${error.message}` },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'チェックイン処理に失敗しました' },
      { status: 500 }
    )
  }
}
