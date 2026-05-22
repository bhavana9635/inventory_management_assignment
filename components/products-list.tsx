'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Product {
  id: string
  name: string
  sku: string
  totalQuantity: number
  reservedQuantity: number
  soldQuantity: number
  availableQuantity: number
  createdAt: string
  updatedAt: string
}

interface ProductsListProps {
  onSelectProduct: (product: Product) => void
}

export function ProductsList({ onSelectProduct }: ProductsListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products')
        if (!response.ok) throw new Error('Failed to fetch products')
        const data = await response.json()
        setProducts(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">Loading products...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-semibold text-destructive">Error: {error}</div>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-semibold text-muted-foreground">No products available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id} className="flex flex-col hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <CardDescription>SKU: {product.sku}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Available</span>
                <Badge variant={product.availableQuantity > 0 ? 'default' : 'destructive'}>
                  {product.availableQuantity} / {product.totalQuantity}
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(product.availableQuantity / product.totalQuantity) * 100}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Reserved:</span>
                  <span className="ml-1 font-semibold">{product.reservedQuantity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sold:</span>
                  <span className="ml-1 font-semibold">{product.soldQuantity}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => onSelectProduct(product)}
              className="w-full mt-auto"
              disabled={product.availableQuantity === 0}
            >
              {product.availableQuantity > 0 ? 'Reserve Now' : 'Out of Stock'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
