import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { addMinutes } from "date-fns";

export async function POST(request: Request) {
  try {
    const { slotId } = await request.json();

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

    // 30分枠でない場合はエラー
    if (targetSlot.duration !== 30) {
      return NextResponse.json(
        { error: "30分枠のみ分割可能です" },
        { status: 400 }
      );
    }

    // 予約がある場合は分割できない
    if (targetSlot.reservations.length > 0) {
      return NextResponse.json(
        { error: "予約がある時間枠は分割できません" },
        { status: 400 }
      );
    }

    // トランザクションで分割処理を実行
    await prisma.$transaction([
      // 1. 元の30分枠を最初の15分枠に更新
      prisma.timeSlot.update({
        where: { id: targetSlot.id },
        data: {
          duration: 15,
          endTime: addMinutes(targetSlot.startTime, 15),
          maxPatients: 2, // 15分枠は再診2人固定
          isFirstVisit: false, // 再診枠として設定
        }
      }),
      // 2. 新しい15分枠を作成
      prisma.timeSlot.create({
        data: {
          startTime: addMinutes(targetSlot.startTime, 15),
          endTime: targetSlot.endTime,
          isAvailable: targetSlot.isAvailable,
          maxPatients: 2, // 15分枠は再診2人固定
          isFirstVisit: false, // 再診枠として設定
          duration: 15
        }
      })
    ]);

    // 3. 更新後の全時間枠を取得して返す
    const allSlots = await prisma.timeSlot.findMany({
      where: {
        startTime: {
          gte: new Date(targetSlot.startTime.setHours(0, 0, 0, 0)),
          lt: new Date(targetSlot.startTime.setHours(24, 0, 0, 0))
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    return NextResponse.json(allSlots);

  } catch (error) {
    console.error("時間枠分割エラー:", error);
    return NextResponse.json(
      { error: "時間枠の分割に失敗しました" },
      { status: 500 }
    );
  }
}
