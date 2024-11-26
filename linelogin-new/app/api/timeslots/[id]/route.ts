import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { TimeSlot } from "@prisma/client";

type TimeSlotUpdate = Partial<{
  isAvailable: boolean;
  isFirstVisit: boolean;
  maxPatients: number;
}>;

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updates: TimeSlotUpdate = await request.json();

    // 対象のスロットを取得
    const targetSlot = await prisma.timeSlot.findUnique({
      where: { id },
      include: { reservations: true }
    });

    if (!targetSlot) {
      return NextResponse.json(
        { error: "指定された時間枠が見つかりません" },
        { status: 404 }
      );
    }

    // 予約可否の切り替え
    if ('isAvailable' in updates) {
      // 予約がある場合は予約可にはできない
      if (updates.isAvailable && targetSlot.reservations.length >= targetSlot.maxPatients) {
        return NextResponse.json(
          { error: "予約枠が満員のため、予約可能にはできません" },
          { status: 400 }
        );
      }
    }

    // 初診/再診の切り替え
    if ('isFirstVisit' in updates) {
      // 予約がある場合は切り替えできない
      if (targetSlot.reservations.length > 0) {
        return NextResponse.json(
          { error: "予約がある時間枠は初診/再診の切り替えができません" },
          { status: 400 }
        );
      }

      // maxPatientsの更新
      if (updates.isFirstVisit) {
        updates.maxPatients = 1; // 初診は1人
      } else {
        updates.maxPatients = targetSlot.duration === 15 ? 2 : 1; // 再診は15分枠なら2人、30分枠なら1人
      }
    }

    // 時間枠を更新
    const updatedSlot = await prisma.timeSlot.update({
      where: { id },
      data: updates as Partial<TimeSlot>
    });

    return NextResponse.json(updatedSlot);

  } catch (error) {
    console.error("時間枠更新エラー:", error);
    return NextResponse.json(
      { error: "時間枠の更新に失敗しました" },
      { status: 500 }
    );
  }
}
