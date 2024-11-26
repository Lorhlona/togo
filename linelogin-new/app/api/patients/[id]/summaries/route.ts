import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const summaries = await prisma.patientSummary.findMany({
      where: {
        patientId: params.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(summaries)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch summaries' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    const summary = await prisma.patientSummary.create({
      data: {
        patientId: params.id,
        content: data.content
      }
    })
    return NextResponse.json(summary)
  } catch {
    return NextResponse.json(
      { error: 'Failed to create summary' },
      { status: 500 }
    )
  }
}
