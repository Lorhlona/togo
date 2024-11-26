import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const records = await prisma.medicalRecord.findMany({
      where: {
        patientId: params.id
      },
      orderBy: {
        visitDate: 'desc'
      }
    })
    return NextResponse.json(records)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch medical records' },
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
    const record = await prisma.medicalRecord.create({
      data: {
        patientId: params.id,
        visitDate: new Date(data.visitDate),
        content: data.content
      }
    })
    return NextResponse.json(record)
  } catch {
    return NextResponse.json(
      { error: 'Failed to create medical record' },
      { status: 500 }
    )
  }
}
