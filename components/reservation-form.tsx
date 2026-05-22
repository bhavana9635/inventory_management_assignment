'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  availableQuantity: number
  totalQuantity: number
}

interface ReservationFormProps {
  product: Product | null
  onClose: () => void
  onReservationCreated: () => void
}

export function ReservationForm({
  product,
  onClose,
  onReservationCreated,
}: ReservationFormProps) {
  const [email, setEmail] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [reservationId, setReservationId] = useState<string | null>(null)

  if (!product) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!product) {
        throw new Error('Product not found')
      }

      const quantityNum = parseInt(quantity)

      if (!email) {
        throw new Error('Email is required')
      }

      if (!Number.isInteger(quantityNum) || quantityNum <= 0) {
        throw new Error('Quantity must be a positive integer')
      }

      if (quantityNum > product.availableQuantity) {
        throw new Error(
          `Only ${product.availableQuantity} items available`
        )
      }

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          customerEmail: email,
          quantity: quantityNum,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create reservation')
      }

      setReservationId(data.data.reservationId)
      setSuccess(true)
      onReservationCreated()

      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            Reservation Created
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Reservation ID</Label>
            <p className="font-mono text-sm break-all mt-1">{reservationId}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Your reservation is valid for 15 minutes. Check your email ({email}) for details.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reserve {product.name}</CardTitle>
        <CardDescription>SKU: {product.sku}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="quantity">Quantity</Label>
              <span className="text-sm text-muted-foreground">
                Available: {product.availableQuantity}
              </span>
            </div>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={product.availableQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              Reservation valid for <span className="font-semibold">15 minutes</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Reservation'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
