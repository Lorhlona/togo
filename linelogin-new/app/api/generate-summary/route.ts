import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { patientId, records } = data

    // ここでAIを使用してサマリーを生成する代わりに、
    // 単純にカルテ記録を要約したテキストを返します
    const summary = `最新の診療記録をもとに作成された要約：\n${records}`

    // サマリーを保存
    const savedSummary = await prisma.patientSummary.create({
      data: {
        patientId,
        content: summary
      }
    })

    return NextResponse.json({ summary: savedSummary.content })
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
