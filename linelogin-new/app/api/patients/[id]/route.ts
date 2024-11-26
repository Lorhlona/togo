import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { options } from '../../auth/[...nextauth]/options'
import prisma from '../../../../lib/prisma'

interface UpdatePatientData {
  lastName: string
  firstName: string
  dateOfBirth: string
  gender: string
  phoneNumber: string
}

// 患者データ取得
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(options)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 管理者チェック
    const currentUser = await prisma.patient.findUnique({
      where: { lineUserId: session.user.id }
    })

    if (!currentUser || currentUser.patientId !== '00001') {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    const patient = await prisma.patient.findUnique({
      where: { id: params.id }
    })

    if (!patient) {
      return NextResponse.json(
        { error: '患者が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(patient)

  } catch (error) {
    console.error('患者データ取得エラー:', error)
    return NextResponse.json(
      { error: '患者データの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 患者データ更新
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(options)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 管理者チェック
    const currentUser = await prisma.patient.findUnique({
      where: { lineUserId: session.user.id }
    })

    if (!currentUser || currentUser.patientId !== '00001') {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    const data = await request.json() as UpdatePatientData

    const updatedPatient = await prisma.patient.update({
      where: { id: params.id },
      data: {
        lastName: data.lastName,
        firstName: data.firstName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        phoneNumber: data.phoneNumber,
      }
    })

    return NextResponse.json(updatedPatient)

  } catch (error) {
    console.error('患者データ更新エラー:', error)
    return NextResponse.json(
      { error: '患者データの更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
