import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { options } from '../auth/[...nextauth]/options'

type DaySchedule = {
  startTime: string;
  endTime: string;
};

type WeekSchedule = {
  [key: number]: DaySchedule;
};

// 曜日ごとの固定診療時間設定（データベース非依存のデフォルト値）
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

// デフォルト設定の取得
export async function GET() {
  try {
    const session = await getServerSession(options)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 現在の曜日に応じたデフォルト設定を返す
    const today = new Date().getDay();
    return NextResponse.json(DEFAULT_CLINIC_HOURS[today])

  } catch (error) {
    console.error('デフォルト設定取得エラー:', error)
    return NextResponse.json(
      { error: 'デフォルト設定の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// デフォルト設定の更新（一時的に無効化）
export async function POST() {
  return NextResponse.json(
    { error: '現在この操作は無効化されています。診療時間は固定設定を使用します。' },
    { status: 400 }
  )
}
