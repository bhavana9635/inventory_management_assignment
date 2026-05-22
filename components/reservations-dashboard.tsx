'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface Reservation {
  id: string
  customerEmail: string
  quantity: number
  status: string
  expiresAt: string
  createdAt: string
  confirmedAt: string | null
  releasedAt: string | null
  product: {
    name: string
    sku: string
  }
}

interface ReservationsDashboardProps {
  email: string
}

export function ReservationsDashboard({ email }: ReservationsDashboardProps) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  async function fetchReservations() {
    try {
      const response = await fetch(`/api/reservations?email=${encodeURIComponent(email)}`)
      if (!response.ok) throw new Error('Failed to fetch reservations')
      const data = await response.json()
      setReservations(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (email) {
      fetchReservations()
      // Refresh every 30 seconds
      const interval = setInterval(fetchReservations, 30000)
      return () => clearInterval(interval)
    }
  }, [email])

  async function handleAction(
    reservationId: string,
    action: 'confirm' | 'release'
  ) {
    setActionInProgress(reservationId)
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || `Failed to ${action} reservation`)
      }

      await fetchReservations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActionInProgress(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading reservations...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (reservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Reservations</CardTitle>
          <CardDescription>You haven&apos;t made any reservations yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Reservations</CardTitle>
        <CardDescription>{reservations.length} total reservation(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{reservation.product?.name ?? 'Unknown product'}</p>
                  <Badge
                    variant={
                      reservation.status === 'PENDING'
                        ? 'outline'
                        : reservation.status === 'CONFIRMED'
                          ? 'default'
                          : reservation.status === 'RELEASED'
                            ? 'secondary'
                            : 'destructive'
                    }
                  >
                    {reservation.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  SKU: {reservation.product?.sku ?? '—'} • Qty: {reservation.quantity}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {reservation.id.substring(0, 8)}...
                </p>

                {reservation.status === 'PENDING' && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                    <Clock className="w-4 h-4" />
                    Expires at {new Date(reservation.expiresAt).toLocaleTimeString()}
                  </div>
                )}

                {reservation.status === 'CONFIRMED' && (
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmed on{' '}
                    {new Date(reservation.confirmedAt!).toLocaleString()}
                  </div>
                )}

                {reservation.status === 'RELEASED' && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                    <XCircle className="w-4 h-4" />
                    Released on {new Date(reservation.releasedAt!).toLocaleString()}
                  </div>
                )}
              </div>

              {reservation.status === 'PENDING' && (
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAction(reservation.id, 'confirm')}
                    disabled={actionInProgress === reservation.id}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(reservation.id, 'release')}
                    disabled={actionInProgress === reservation.id}
                  >
                    Release
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
