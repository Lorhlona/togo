import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

type VisitStatus = "WAITING" | "CHECKED_IN" | "COMPLETED";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;

    // 予約を削除
    await prisma.reservation.delete({
      where: {
        id: reservationId,
      },
    });

    return NextResponse.json({ 
      message: "予約を削除しました" 
    });

  } catch (error) {
    console.error("予約削除エラー:", error);
    return NextResponse.json(
      { error: "予約の削除に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;
    if (!reservationId) {
      return NextResponse.json(
        { error: "予約IDが指定されていません" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const newVisitStatus = data.visitStatus as VisitStatus;

    // visitStatusの値が正しいか確認
    const validStatuses: VisitStatus[] = ['WAITING', 'CHECKED_IN', 'COMPLETED'];
    if (!validStatuses.includes(newVisitStatus)) {
      return NextResponse.json(
        { error: "無効な訪問状態です" },
        { status: 400 }
      );
    }

    // 予約が存在するか確認
    const existingReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!existingReservation) {
      return NextResponse.json(
        { error: "指定された予約が見つかりません" },
        { status: 404 }
      );
    }

    try {
      // 予約の状態を更新
      await prisma.$executeRaw`
        UPDATE "Reservation"
        SET "visitStatus" = ${newVisitStatus}::"VisitStatus"
        WHERE id = ${reservationId}
      `;

      // 更新後の予約情報を取得
      const updatedReservation = await prisma.reservation.findUnique({
        where: {
          id: reservationId,
        },
        include: {
          patient: true,
          timeSlot: true,
        },
      });

      console.log('Updated reservation:', updatedReservation);

      return NextResponse.json({
        message: "予約状態を更新しました",
        reservation: updatedReservation,
      });
    } catch (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

  } catch (error) {
    console.error("予約状態更新エラー:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `予約状態の更新に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "予約状態の更新に失敗しました" },
      { status: 500 }
    );
  }
}
