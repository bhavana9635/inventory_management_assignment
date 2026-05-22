import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Normalize field names (Supabase may return snake_case or camelCase depending on schema)
    const productsWithAvailable = (products || []).map((product: any) => {
      const total = product.totalQuantity ?? product.total_quantity ?? 0
      const reserved = product.reservedQuantity ?? product.reserved_quantity ?? 0
      const sold = product.soldQuantity ?? product.sold_quantity ?? 0
      const available = total - reserved - sold

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        totalQuantity: total,
        reservedQuantity: reserved,
        soldQuantity: sold,
        availableQuantity: available,
        createdAt: product.created_at ?? product.createdAt,
        updatedAt: product.updated_at ?? product.updatedAt,
      }
    })

    return NextResponse.json({ success: true, data: productsWithAvailable })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, sku, totalQuantity } = body

    // Validate input
    if (!name || !sku || totalQuantity === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, sku, totalQuantity',
        },
        { status: 400 }
      )
    }

    if (totalQuantity <= 0 || !Number.isInteger(totalQuantity)) {
      return NextResponse.json(
        {
          error: 'Total quantity must be a positive integer',
        },
        { status: 400 }
      )
    }

    // Check if SKU already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 409 }
      )
    }

    // Create product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        sku,
        total_quantity: totalQuantity,
        reserved_quantity: 0,
        sold_quantity: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Product created successfully',
        data: product,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
