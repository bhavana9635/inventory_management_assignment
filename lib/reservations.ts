import { createClient as createAdminClient } from '@supabase/supabase-js'
import { withLock } from './locks'
import { v4 as uuidv4 } from 'uuid'

const RESERVATION_DURATION = 300 // 5 minutes in seconds

export interface CreateReservationInput {
  productId: string
  customerEmail: string
  quantity: number
}

export interface ReservationResult {
  success: boolean
  reservationId?: string
  message: string
  data?: unknown
}

export async function createReservation(
  input: CreateReservationInput
): Promise<ReservationResult> {
  const { productId, customerEmail, quantity } = input

  try {
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      console.error('createReservation: product not found', { productId, productError })
      return {
        success: false,
        message: 'Product not found',
      }
    }

    const availableQty =
      product.total_quantity - product.reserved_quantity - product.sold_quantity

    if (quantity > availableQty) {
      return {
        success: false,
        message: `Only ${availableQty} items available for reservation`,
      }
    }

    // Acquire lock on product
    const lockKey = `lock:product:${productId}`
    const result = await withLock(lockKey, async () => {
      // Re-check availability after lock
      const { data: productLocked } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (!productLocked) {
        throw new Error('Product not found')
      }

      const availableAfterLock =
        productLocked.total_quantity -
        productLocked.reserved_quantity -
        productLocked.sold_quantity

      if (quantity > availableAfterLock) {
        return {
          success: false,
          message: `Only ${availableAfterLock} items available`,
        }
      }

      // Create reservation
      const expiresAt = new Date(Date.now() + RESERVATION_DURATION * 1000)
      const reservationId = uuidv4()

      const { error: insertError } = await supabase.from('reservations').insert({
        id: reservationId,
        product_id: productId,
        customer_email: customerEmail,
        quantity,
        status: 'PENDING',
        expires_at: expiresAt.toISOString(),
      })

      if (insertError) {
        throw insertError
      }

      // Update product reserved quantity
      try {
        const { error: incErr } = await supabase.rpc('increment_reserved', {
          product_id: productId,
          amount: quantity,
        })
        if (incErr) {
          console.error('increment_reserved RPC error:', incErr)
          throw incErr
        }
      } catch (rpcErr) {
        console.error('increment_reserved RPC error:', rpcErr)
        // Fallback: update reserved_quantity directly (we hold the lock)
        const { data: prodRow, error: prodErr } = await supabase
          .from('products')
          .select('reserved_quantity')
          .eq('id', productId)
          .single()

        if (prodErr || !prodRow) {
          console.error('fallback: failed to read product for increment_reserved', prodErr)
          throw prodErr || new Error('Product not found for fallback increment')
        }

        const currentReserved = prodRow.reserved_quantity ?? prodRow.reservedQuantity ?? 0
        const { error: updErr } = await supabase
          .from('products')
          .update({ reserved_quantity: currentReserved + quantity })
          .eq('id', productId)

        if (updErr) {
          console.error('fallback increment_reserved update error:', updErr)
          throw updErr
        }
      }

      return {
        success: true,
        reservationId,
        message: 'Reservation created successfully',
        data: {
          reservationId,
          expiresAt: expiresAt.toISOString(),
          quantity,
        },
      }
    })

    return result || { success: false, message: 'Failed to acquire lock' }
  } catch (error) {
    console.error('Create reservation error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create reservation',
    }
  }
}

export async function confirmReservation(
  reservationId: string
): Promise<ReservationResult> {
  try {
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get reservation
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (fetchError || !reservation) {
      return {
        success: false,
        message: 'Reservation not found',
      }
    }

    if (reservation.status !== 'PENDING') {
      return {
        success: false,
        message: `Cannot confirm ${reservation.status} reservation`,
      }
    }

    // Check if expired
    if (new Date(reservation.expires_at) < new Date()) {
      return {
        success: false,
        message: 'Reservation has expired',
      }
    }

    const lockKey = `lock:reservation:${reservationId}`
    const result = await withLock(lockKey, async () => {
      // Update reservation status
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          status: 'CONFIRMED',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', reservationId)

      if (updateError) {
        throw updateError
      }

      // Update product sold and decrement reserved
      try {
        const { error: incSoldErr } = await supabase.rpc('increment_sold', {
          product_id: reservation.product_id,
          amount: reservation.quantity,
        })
        if (incSoldErr) {
          console.error('increment_sold RPC error:', incSoldErr)
          throw incSoldErr
        }
      } catch (rpcErr) {
        console.error('increment_sold RPC error:', rpcErr)
        // Fallback: increment sold_quantity directly
        const { data: prodRow, error: prodErr } = await supabase
          .from('products')
          .select('sold_quantity')
          .eq('id', reservation.product_id)
          .single()

        if (prodErr || !prodRow) {
          console.error('fallback: failed to read product for increment_sold', prodErr)
          throw prodErr || new Error('Product not found for fallback increment_sold')
        }

        const currentSold = prodRow.sold_quantity ?? prodRow.soldQuantity ?? 0
        const { error: updSoldErr } = await supabase
          .from('products')
          .update({ sold_quantity: currentSold + reservation.quantity })
          .eq('id', reservation.product_id)

        if (updSoldErr) {
          console.error('fallback increment_sold update error:', updSoldErr)
          throw updSoldErr
        }
      }

      try {
        const { error: decResErr } = await supabase.rpc('decrement_reserved', {
          product_id: reservation.product_id,
          amount: reservation.quantity,
        })
        if (decResErr) {
          console.error('decrement_reserved RPC error:', decResErr)
          throw decResErr
        }
      } catch (rpcErr) {
        console.error('decrement_reserved RPC error:', rpcErr)
        // Fallback: decrement reserved_quantity directly
        const { data: prodRow2, error: prodErr2 } = await supabase
          .from('products')
          .select('reserved_quantity')
          .eq('id', reservation.product_id)
          .single()

        if (prodErr2 || !prodRow2) {
          console.error('fallback: failed to read product for decrement_reserved', prodErr2)
          throw prodErr2 || new Error('Product not found for fallback decrement_reserved')
        }

        const currentReserved2 = prodRow2.reserved_quantity ?? prodRow2.reservedQuantity ?? 0
        const { error: updDecErr } = await supabase
          .from('products')
          .update({ reserved_quantity: Math.max(0, currentReserved2 - reservation.quantity) })
          .eq('id', reservation.product_id)

        if (updDecErr) {
          console.error('fallback decrement_reserved update error:', updDecErr)
          throw updDecErr
        }
      }

      return {
        success: true,
        message: 'Reservation confirmed',
      }
    })

    return result || { success: false, message: 'Failed to acquire lock' }
  } catch (error) {
    console.error('Confirm reservation error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to confirm reservation',
    }
  }
}

export async function releaseReservation(
  reservationId: string
): Promise<ReservationResult> {
  try {
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get reservation
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (fetchError || !reservation) {
      return {
        success: false,
        message: 'Reservation not found',
      }
    }

    if (reservation.status === 'RELEASED') {
      return {
        success: false,
        message: 'Reservation already released',
      }
    }

    if (reservation.status === 'CONFIRMED') {
      return {
        success: false,
        message: 'Cannot release a confirmed reservation',
      }
    }

    const lockKey = `lock:product:${reservation.product_id}`
    const result = await withLock(lockKey, async () => {
      // Update reservation status
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          status: 'RELEASED',
          released_at: new Date().toISOString(),
        })
        .eq('id', reservationId)

      if (updateError) {
        throw updateError
      }

      // Decrement reserved quantity
      try {
        const { error: decErr } = await supabase.rpc('decrement_reserved', {
          product_id: reservation.product_id,
          amount: reservation.quantity,
        })
        if (decErr) {
          console.error('decrement_reserved RPC error:', decErr)
          throw decErr
        }
      } catch (rpcErr) {
        console.error('decrement_reserved RPC error:', rpcErr)
        const { data: prodRow, error: prodErr } = await supabase
          .from('products')
          .select('reserved_quantity')
          .eq('id', reservation.product_id)
          .single()

        if (!prodRow || prodErr) {
          console.error('fallback: failed to read product for decrement_reserved (release)', prodErr)
          throw prodErr || new Error('Product not found for fallback decrement_reserved')
        }

        const currentReserved = prodRow.reserved_quantity ?? prodRow.reservedQuantity ?? 0
        const { error: updErr } = await supabase
          .from('products')
          .update({ reserved_quantity: Math.max(0, currentReserved - reservation.quantity) })
          .eq('id', reservation.product_id)

        if (updErr) {
          console.error('fallback decrement_reserved update error (release):', updErr)
          throw updErr
        }
      }

      return {
        success: true,
        message: 'Reservation released',
      }
    })

    return result || { success: false, message: 'Failed to acquire lock' }
  } catch (error) {
    console.error('Release reservation error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to release reservation',
    }
  }
}

export async function getReservationsByEmail(email: string): Promise<unknown[]> {
  try {
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const now = new Date().toISOString()

    // Clean up expired reservations
    const { data: expiredReservations } = await supabase
      .from('reservations')
      .select('id, product_id, quantity')
      .eq('customer_email', email)
      .eq('status', 'PENDING')
      .lt('expires_at', now)

    if (expiredReservations && expiredReservations.length > 0) {
      // Update expired reservations
      await supabase
        .from('reservations')
        .update({ status: 'EXPIRED' })
        .eq('customer_email', email)
        .eq('status', 'PENDING')
        .lt('expires_at', now)

      // Decrement reserved quantities for each product
      for (const res of expiredReservations) {
        try {
          const { error: decErr } = await supabase.rpc('decrement_reserved', {
            product_id: res.product_id,
            amount: res.quantity,
          })
          if (decErr) {
            console.error('decrement_reserved RPC error (expired cleanup):', decErr)
            // fallback handled below
            throw decErr
          }
        } catch (rpcErr) {
          console.error('decrement_reserved RPC error (expired cleanup):', rpcErr)
          // Fallback: decrement reserved_quantity directly
          const { data: prodRow, error: prodErr } = await supabase
            .from('products')
            .select('reserved_quantity')
            .eq('id', res.product_id)
            .single()

          if (prodErr || !prodRow) {
            console.error('fallback: failed to read product for decrement_reserved (expired)', prodErr)
            continue
          }

          const currentReserved = prodRow.reserved_quantity ?? prodRow.reservedQuantity ?? 0
          const { error: updErr } = await supabase
            .from('products')
            .update({ reserved_quantity: Math.max(0, currentReserved - res.quantity) })
            .eq('id', res.product_id)

          if (updErr) {
            console.error('fallback decrement_reserved update error (expired):', updErr)
          }
        }
      }
    }

    // Fetch all reservations for the email
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*, product:product_id(name, sku)')
      .eq('customer_email', email)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch reservations:', error)
      return []
    }

    return reservations || []
  } catch (error) {
    console.error('Get reservations error:', error)
    return []
  }
}
