'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  totalQuantity: number
  reservedQuantity: number
  soldQuantity: number
  availableQuantity: number
  createdAt: string
}

export function AdminPanel() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state for new product
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    totalQuantity: '',
  })
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

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

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault()
    setCreatingProduct(true)
    setCreateError(null)
    setCreateSuccess(false)

    try {
      const quantity = parseInt(formData.totalQuantity)

      if (!formData.name || !formData.sku || !formData.totalQuantity) {
        throw new Error('All fields are required')
      }

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0')
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          totalQuantity: quantity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product')
      }

      setCreateSuccess(true)
      setFormData({ name: '', sku: '', totalQuantity: '' })
      await fetchProducts()

      setTimeout(() => setCreateSuccess(false), 3000)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCreatingProduct(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-8">
      {/* Create Product Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Product</CardTitle>
          <CardDescription>Add a new product to the inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            {createError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{createError}</div>
              </div>
            )}

            {createSuccess && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">Product created successfully!</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Premium Widget"
                  disabled={creatingProduct}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="e.g., SKU-001"
                  disabled={creatingProduct}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Total Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.totalQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalQuantity: e.target.value,
                    })
                  }
                  placeholder="e.g., 100"
                  disabled={creatingProduct}
                />
              </div>
            </div>

            <Button type="submit" disabled={creatingProduct}>
              {creatingProduct ? 'Creating...' : 'Create Product'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Products Inventory</CardTitle>
          <CardDescription>
            {products.length} product(s) in inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products created yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">SKU</th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Total
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Reserved
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Sold
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Available
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">{product.name}</td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {product.sku}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {product.totalQuantity}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-600">
                        {product.reservedQuantity}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600">
                        {product.soldQuantity}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {product.availableQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
