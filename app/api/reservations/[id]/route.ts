import { NextRequest, NextResponse } from 'next/server'
import {
  confirmReservation,
  releaseReservation,
} from '@/lib/reservations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required (confirm or release)' },
        { status: 400 }
      )
    }

    let result

    if (action === 'confirm') {
      result = await confirmReservation(id)
    } else if (action === 'release') {
      result = await releaseReservation(id)
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "confirm" or "release"' },
        { status: 400 }
      )
    }

    const statusCode = result.success ? 200 : 400
    const response: Record<string, unknown> = {
      success: result.success,
      message: result.message,
    }
    if (result.data) {
      response.data = result.data
    }

    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    console.error('POST /api/reservations/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
