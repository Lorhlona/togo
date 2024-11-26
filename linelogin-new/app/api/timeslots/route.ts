import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { parseISO } from "date-fns";
import { toZonedTime } from 'date-fns-tz';
import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';

// 診療時間の型定義
type ClinicHours = {
  startTime: string;
  endTime: string;
};

type WeekSchedule = {
  [key: number]: ClinicHours;
};

// 曜日ごとの固定診療時間設定
const DEFAULT_CLINIC_HOURS: WeekSchedule = {
  0: { // 日曜日
    startTime: '15:00',
    endTime: '20:00'
  },
  1: { // 月曜日
    startTime: '09:00',
    endTime: '20:00'
  },
  2: { // 火曜日
    startTime: '09:00',
    endTime: '20:00'
  },
  3: { // 水曜日
    startTime: '09:00',
    endTime: '20:00'
  },
  4: { // 木曜日
    startTime: '09:00',
    endTime: '20:00'
  },
  5: { // 金曜日
    startTime: '09:00',
    endTime: '20:00'
  },
  6: { // 土曜日
    startTime: '09:00',
    endTime: '20:00'
  }
};

// タイムゾーン設定
const TIMEZONE = 'Asia/Tokyo';

// 時間文字列をUTCのDateオブジェクトに変換
const parseTimeString = (dateStr: string, timeString: string): Date => {
  // 日付と時間を組み合わせてJST時間を作成
  const jstDateTime = `${dateStr}T${timeString}:00`;
  
  // JSTからUTCに変換（9時間引く）
  const jstDate = new Date(jstDateTime);
  return new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
};

// 時間枠の生成
const generateTimeSlots = (dateStr: string) => {
  const timeSlots = [];
  
  // 日付文字列からJST日付を取得
  const jstDate = toZonedTime(parseISO(dateStr), TIMEZONE);
  const dayOfWeek = jstDate.getDay();
  const hours = DEFAULT_CLINIC_HOURS[dayOfWeek];

  // 診療開始時間と終了時間を設定（UTC）
  const startTime = parseTimeString(dateStr, hours.startTime);
  const endTime = parseTimeString(dateStr, hours.endTime);

  // 15分刻みで時間枠を生成
  let currentTime = new Date(startTime);

  while (currentTime < endTime) {
    const nextTime = new Date(currentTime.getTime() + 15 * 60 * 1000);

    timeSlots.push({
      startTime: currentTime,
      endTime: nextTime,
      isAvailable: true,
      maxPatients: 2, // デフォルトは再診枠（2人まで）
      isFirstVisit: false,
      duration: 15,
    });

    currentTime = nextTime;
  }

  return timeSlots;
};

// 認証チェック関数
async function checkAuthorization() {
  const session = await getServerSession(options);
  if (!session?.user?.id) {
    return false;
  }

  const patient = await prisma.patient.findFirst({
    where: { lineUserId: session.user.id }
  });

  return patient?.patientId === '00001';
}

export async function POST(request: Request) {
  try {
    // 認証チェック
    const isAuthorized = await checkAuthorization();
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "権限がありません" },
        { status: 403 }
      );
    }

    const { date, isOpen } = await request.json();
    
    console.log(`診療枠生成開始: ${date} (開院: ${isOpen})`);

    // 開院フラグがfalseの場合は時間枠を生成しない
    if (!isOpen) {
      return NextResponse.json({ 
        message: "休診日です",
        count: 0 
      });
    }

    // 日本時間の0時から24時までの範囲を設定
    const jstStartDate = new Date(`${date}T00:00:00`);
    const jstEndDate = new Date(`${date}T23:59:59.999`);
    const startOfDay = new Date(jstStartDate.getTime() - 9 * 60 * 60 * 1000);
    const endOfDay = new Date(jstEndDate.getTime() - 9 * 60 * 60 * 1000);

    // 既存の時間枠を確認
    const existingSlots = await prisma.timeSlot.findMany({
      where: {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    console.log(`既存の時間枠: ${existingSlots.length}件`);

    // 既存の時間枠がない場合のみ新規作成
    if (existingSlots.length === 0) {
      const newTimeSlots = generateTimeSlots(date);
      console.log(`生成された時間枠: ${newTimeSlots.length}件`);
      
      if (newTimeSlots.length > 0) {
        const createdSlots = await prisma.timeSlot.createMany({
          data: newTimeSlots,
        });

        console.log(`保存された時間枠: ${createdSlots.count}件`);

        return NextResponse.json({ 
          message: "予約枠を作成しました",
          count: createdSlots.count 
        });
      }
    }

    return NextResponse.json({ 
      message: "予約枠はすでに存在します",
      count: existingSlots.length 
    });

  } catch (error) {
    console.error("予約枠作成エラー:", error);
    return NextResponse.json(
      { error: "予約枠の作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // 認証チェック
    const isAuthorized = await checkAuthorization();
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "権限がありません" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "開始日と終了日が必要です" },
        { status: 400 }
      );
    }

    console.log(`時間枠取得: ${startDate} から ${endDate}`);

    // 日本時間の日付範囲をUTCに変換
    const jstStartDate = new Date(`${startDate}T00:00:00`);
    const jstEndDate = new Date(`${endDate}T23:59:59.999`);
    const startOfDay = new Date(jstStartDate.getTime() - 9 * 60 * 60 * 1000);
    const endOfDay = new Date(jstEndDate.getTime() - 9 * 60 * 60 * 1000);

    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        reservations: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                lineUserId: true
              }
            }
          }
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    console.log(`取得された時間枠: ${timeSlots.length}件`);

    // 取得した時間枠をそのまま返す（クライアント側で変換）
    return NextResponse.json(timeSlots);

  } catch (error) {
    console.error("時間枠取得エラー:", error);
    return NextResponse.json(
      { error: "予約枠の取得に失敗しました" },
      { status: 500 }
    );
  }
}
