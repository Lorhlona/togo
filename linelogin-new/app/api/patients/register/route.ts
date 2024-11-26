import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { options } from '../../auth/[...nextauth]/options'
import prisma from '../../../../lib/prisma'
import { PrismaClientKnownRequestError, PrismaClientInitializationError } from '@prisma/client/runtime/library'

// 入力データの型定義
interface PatientInput {
  lastName: string
  firstName: string
  gender: string
  dateOfBirth: string
  phoneNumber: string
  postalCode: string
  address: string
}

// カルテ番号生成関数（5桁連番）
async function generatePatientId() {
  try {
    // 最後に登録されたカルテ番号を取得
    const latestPatient = await prisma.patient.findFirst({
      orderBy: {
        patientId: 'desc'
      }
    })

    console.log('Latest patient:', latestPatient) // デバッグログ

    if (!latestPatient) {
      return '00001' // 最初の患者
    }

    // 次の番号を生成（5桁でゼロパディング）
    const currentNumber = parseInt(latestPatient.patientId)
    if (isNaN(currentNumber)) {
      console.error('Invalid patient ID format:', latestPatient.patientId)
      throw new Error('Invalid patient ID format')
    }

    const nextNumber = String(currentNumber + 1).padStart(5, '0')
    console.log('Generated next number:', nextNumber) // デバッグログ
    return nextNumber
  } catch (err) {
    console.error('Error generating patient ID:', err)
    throw err
  }
}

// 8桁の数字を日付に変換する関数（タイムゾーン考慮）
function parseDateFromNumber(dateStr: string): string {
  if (!/^\d{8}$/.test(dateStr)) {
    throw new Error('生年月日は8桁の数字で入力してください（例：19880501）')
  }

  const year = parseInt(dateStr.substring(0, 4))
  const month = parseInt(dateStr.substring(4, 6)) - 1 // JavaScriptの月は0から始まる
  const day = parseInt(dateStr.substring(6, 8))

  // 日本時間の0時0分0秒で設定
  const date = new Date(Date.UTC(year, month, day))

  // 日付の妥当性チェック
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day ||
    year < 1900 ||
    year > new Date().getFullYear()
  ) {
    throw new Error('無効な生年月日です')
  }

  // YYYY-MM-DD形式の文字列を返す
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// データ検証関数
function validateData(data: PatientInput): string[] {
  const errors: string[] = []
  console.log('Validating data:', JSON.stringify(data, null, 2)) // デバッグログ

  // 電話番号の検証（数字のみ）
  const cleanPhoneNumber = data.phoneNumber.replace(/-/g, '')
  const phoneNumberPattern = /^\d+$/
  if (!phoneNumberPattern.test(cleanPhoneNumber)) {
    errors.push(`電話番号は数字のみで入力してください（現在の値: ${data.phoneNumber}）`)
  }
  if (cleanPhoneNumber.length !== 10 && cleanPhoneNumber.length !== 11) {
    errors.push('電話番号は10桁または11桁で入力してください')
  }

  // 郵便番号の検証（7桁の数字）
  const cleanPostalCode = data.postalCode.replace(/-/g, '')
  if (!cleanPostalCode) {
    errors.push('郵便番号を入力してください')
  } else if (!/^\d{7}$/.test(cleanPostalCode)) {
    errors.push('郵便番号は7桁の数字で入力してください（例：1234567）')
  }

  // 名前の検証（空白文字以外が含まれているか）
  if (!data.lastName.trim()) {
    errors.push('姓を入力してください')
  }
  if (!data.firstName.trim()) {
    errors.push('名を入力してください')
  }

  // 性別の検証
  if (!['male', 'female'].includes(data.gender)) {
    errors.push(`性別を正しく選択してください（現在の値: ${data.gender}）`)
  }

  // 生年月日の検証
  if (!data.dateOfBirth) {
    errors.push('生年月日を入力してください')
  } else if (!/^\d{8}$/.test(data.dateOfBirth)) {
    errors.push('生年月日は8桁の数字で入力してください（例：19880501）')
  }

  // 住所の検証（空でないこと）
  if (!data.address.trim()) {
    errors.push('住所を入力してください')
  }

  console.log('Validation errors:', errors) // デバッグログ
  return errors
}

export async function POST(req: Request) {
  try {
    console.log('Starting patient registration...') // デバッグログ

    // データベース接続テスト
    try {
      await prisma.$connect()
      console.log('Database connection successful')
    } catch (error) {
      console.error('Database connection error:', error)
      throw new Error('データベース接続エラー')
    }

    // セッションチェック
    const session = await getServerSession(options)
    console.log('Session:', JSON.stringify(session, null, 2)) // デバッグログ

    if (!session?.user?.id) {
      console.log('No session or user ID found') // デバッグログ
      return NextResponse.json(
        { error: 'ログインが必要です。LINEで再度ログインしてください。' },
        { status: 401 }
      )
    }

    const data = await req.json()
    console.log('Received raw data:', JSON.stringify(data, null, 2)) // デバッグログ

    const {
      lastName,
      firstName,
      gender,
      dateOfBirth,
      phoneNumber,
      postalCode,
      address
    } = data

    // 必須フィールドの検証
    const missingFields = []
    if (!lastName) missingFields.push('姓')
    if (!firstName) missingFields.push('名')
    if (!gender) missingFields.push('性別')
    if (!dateOfBirth) missingFields.push('生年月日')
    if (!phoneNumber) missingFields.push('電話番号')
    if (!postalCode) missingFields.push('郵便番号')
    if (!address) missingFields.push('住所')

    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields) // デバッグログ
      return NextResponse.json(
        { error: `以下の項目が未入力です: ${missingFields.join('、')}` },
        { status: 400 }
      )
    }

    // データ検証
    const validationErrors = validateData({
      lastName,
      firstName,
      gender,
      dateOfBirth,
      phoneNumber,
      postalCode,
      address
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join('\n') },
        { status: 400 }
      )
    }

    // 既存の登録チェック
    console.log('Checking for existing patient with lineUserId:', session.user.id) // デバッグログ
    const existingPatient = await prisma.patient.findUnique({
      where: { lineUserId: session.user.id }
    })

    if (existingPatient) {
      console.log('Patient already exists:', existingPatient) // デバッグログ
      return NextResponse.json(
        { error: 'このLINEアカウントはすでに登録されています。' },
        { status: 409 }
      )
    }

    // カルテ番号の生成
    console.log('Generating patient ID...') // デバッグログ
    const patientId = await generatePatientId()
    console.log('Generated patient ID:', patientId) // デバッグログ

    // 日付の変換と検証
    let formattedDate: string
    try {
      formattedDate = parseDateFromNumber(dateOfBirth)
      console.log('Formatted date:', formattedDate) // デバッグログ
    } catch (err) {
      console.error('Date parsing error:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : '生年月日の形式が正しくありません。' },
        { status: 400 }
      )
    }

    // 患者情報の保存
    console.log('Saving patient information...') // デバッグログ
    const patientData = {
      lineUserId: session.user.id,
      patientId,
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      gender,
      dateOfBirth: formattedDate,
      phoneNumber: phoneNumber.replace(/-/g, ''),
      postalCode: postalCode.replace(/-/g, ''),
      address: address.trim()
    }
    console.log('Patient data to save:', patientData) // デバッグログ

    const newPatient = await prisma.patient.create({
      data: patientData
    })

    console.log('Patient registration successful:', newPatient) // デバッグログ
    return NextResponse.json(
      { 
        message: '登録が完了しました',
        patient: {
          ...newPatient,
          patientId
        }
      },
      { status: 201 }
    )

  } catch (err: unknown) {
    // エラーの詳細をログに出力
    console.error('患者登録エラーの詳細:', {
      name: err instanceof Error ? err.name : 'Unknown error',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      error: err // エラーオブジェクト全体をログ出力
    })

    // Prismaエラーの詳細なハンドリング
    if (err instanceof PrismaClientInitializationError) {
      console.error('Prisma initialization error:', err)
      return NextResponse.json(
        { error: 'データベース接続エラーが発生しました。しばらく待ってから再度お試しください。' },
        { status: 500 }
      )
    }

    if (err instanceof PrismaClientKnownRequestError) {
      console.log('Prisma error code:', err.code) // デバッグログ
      switch (err.code) {
        case 'P2002':
          return NextResponse.json(
            { error: 'この情報は既に登録されています。' },
            { status: 409 }
          )
        case 'P2003':
          return NextResponse.json(
            { error: 'データベースの参照整合性エラーが発生しました。' },
            { status: 400 }
          )
        default:
          console.error('Unhandled Prisma error:', err)
          return NextResponse.json(
            { error: 'データベースエラーが発生しました。しばらく待ってから再度お試しください。' },
            { status: 500 }
          )
      }
    }

    if (err instanceof Error && err.message === 'データベース接続エラー') {
      return NextResponse.json(
        { error: 'データベースに接続できません。しばらく待ってから再度お試しください。' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: '登録処理中にエラーが発生しました。しばらく待ってから再度お試しください。' },
      { status: 500 }
    )
  } finally {
    // データベース接続を切断
    await prisma.$disconnect()
  }
}

// 患者情報の取得API
export async function GET() {
  try {
    console.log('Starting patient information retrieval...') // デバッグログ

    // データベース接続テスト
    try {
      await prisma.$connect()
      console.log('Database connection successful')
    } catch (error) {
      console.error('Database connection error:', error)
      throw new Error('データベース接続エラー')
    }

    const session = await getServerSession(options)
    console.log('Session:', JSON.stringify(session, null, 2)) // デバッグログ

    if (!session?.user?.id) {
      console.log('No session or user ID found') // デバッグログ
      return NextResponse.json(
        { error: 'ログインが必要です。LINEで再度ログインしてください。' },
        { status: 401 }
      )
    }

    console.log('Fetching patient information...') // デバッグログ
    const patient = await prisma.patient.findUnique({
      where: {
        lineUserId: session.user.id
      }
    })

    console.log('Patient information:', patient) // デバッグログ

    if (!patient) {
      return NextResponse.json(
        { registered: false },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { registered: true, patient },
      { status: 200 }
    )

  } catch (err) {
    console.error('患者情報取得エラー:', err)

    if (err instanceof Error && err.message === 'データベース接続エラー') {
      return NextResponse.json(
        { error: 'データベースに接続できません。しばらく待ってから再度お試しください。' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: '情報取得中にエラーが発生しました。しばらく待ってから再度お試しください。' },
      { status: 500 }
    )
  } finally {
    // データベース接続を切断
    await prisma.$disconnect()
  }
}
