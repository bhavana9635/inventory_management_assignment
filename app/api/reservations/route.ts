import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createReservation, getReservationsByEmail } from '@/lib/reservations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('POST /api/reservations body:', body)
    const { productId, customerEmail, quantity } = body

    if (!productId || !customerEmail || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, customerEmail, quantity' },
        { status: 400 }
      )
    }

    const result = await createReservation({
      productId,
      customerEmail,
      quantity: parseInt(quantity),
    })

    const statusCode = result.success ? 201 : 400
    return NextResponse.json(result, { status: statusCode })
  } catch (error) {
    console.error('POST /api/reservations error:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'email query parameter is required' },
        { status: 400 }
      )
    }

    const reservations = await getReservationsByEmail(email)
    return NextResponse.json({ success: true, data: reservations }, { status: 200 })
  } catch (error) {
    console.error('GET /api/reservations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}
