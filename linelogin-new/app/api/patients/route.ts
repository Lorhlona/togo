import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { options } from '../auth/[...nextauth]/options'
import prisma from '../../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(options)
    
    // セッションチェック
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 管理者チェック（カルテ番号00001の患者のみ許可）
    const currentUser = await prisma.patient.findUnique({
      where: { lineUserId: session.user.id }
    })

    if (!currentUser || currentUser.patientId !== '00001') {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    // 全患者の取得
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        patientId: true,
        lastName: true,
        firstName: true,
        dateOfBirth: true,
        gender: true,
        lineUserId: true,
        address: true,
        phoneNumber: true,
      },
      orderBy: {
        patientId: 'asc'
      }
    })

    const formattedPatients = patients.map((patient: {
      id: string
      patientId: string
      lastName: string
      firstName: string
      dateOfBirth: string
      gender: string
      lineUserId: string | null
      address: string
      phoneNumber: string
    }) => ({
      ...patient,
      dateOfBirth: patient.dateOfBirth
    }))

    return NextResponse.json(formattedPatients)

  } catch (error) {
    console.error('患者一覧取得エラー:', error)
    return NextResponse.json(
      { error: '患者情報の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
