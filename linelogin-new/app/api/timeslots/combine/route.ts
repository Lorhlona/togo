import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { addMinutes, startOfDay, endOfDay } from "date-fns";

export async function POST(request: Request) {
  try {
    const { slotId, maxPatients } = await request.json();

    // 対象のスロットを取得
    const targetSlot = await prisma.timeSlot.findUnique({
      where: { id: slotId },
      include: { reservations: true }
    });

    if (!targetSlot) {
      return NextResponse.json(
        { error: "指定された時間枠が見つかりません" },
        { status: 404 }
      );
    }

    // 次の15分枠を取得
    const nextSlot = await prisma.timeSlot.findFirst({
      where: {
        startTime: targetSlot.endTime,
        duration: 15
      },
      include: { reservations: true }
    });

    if (!nextSlot) {
      return NextResponse.json(
        { error: "結合する次の時間枠が見つかりません" },
        { status: 404 }
      );
    }

    // 予約がある場合は結合できない
    if (targetSlot.reservations.length > 0 || nextSlot.reservations.length > 0) {
      return NextResponse.json(
        { error: "予約がある時間枠は結合できません" },
        { status: 400 }
      );
    }

    // トランザクションで結合処理を実行
    await prisma.$transaction([
      // 1. 元の15分枠を30分枠に更新
      prisma.timeSlot.update({
        where: { id: targetSlot.id },
        data: {
          duration: 30,
          endTime: addMinutes(targetSlot.startTime, 30),
          maxPatients: maxPatients || 1, // maxPatientsが指定されていない場合は1
          isFirstVisit: true, // 30分枠は初診枠として設定
        }
      }),
      // 2. 次の15分枠を削除
      prisma.timeSlot.delete({
        where: { id: nextSlot.id }
      })
    ]);

    // 3. 更新後の全時間枠を取得して返す
    const allSlots = await prisma.timeSlot.findMany({
      where: {
        startTime: {
          gte: startOfDay(targetSlot.startTime),
          lt: endOfDay(targetSlot.startTime)
        }
      },
      include: {
        reservations: {
          include: {
            patient: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    return NextResponse.json(allSlots);

  } catch (error) {
    console.error("時間枠結合エラー:", error);
    return NextResponse.json(
      { error: "時間枠の結合に失敗しました" },
      { status: 500 }
    );
  }
}
