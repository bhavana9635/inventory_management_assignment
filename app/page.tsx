'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProductsList } from '@/components/products-list'
import { ReservationForm } from '@/components/reservation-form'
import { ReservationsDashboard } from '@/components/reservations-dashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

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

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product)
    setShowEmailInput(true)
  }

  function handleReservationCreated() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              Inventory Reservation System
            </h1>
            <p className="text-lg text-muted-foreground">
              Reserve products with real-time inventory tracking and countdown timers
            </p>
          </div>
          <Link href="/admin">
            <Button variant="outline">Admin Panel</Button>
          </Link>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="products">Browse Products</TabsTrigger>
            <TabsTrigger value="reservations">My Reservations</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-8">
            {/* Email Input for Reservations */}
            {showEmailInput && selectedProduct && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-background rounded-lg p-6">
                  <ReservationForm
                    product={selectedProduct}
                    onClose={() => {
                      setSelectedProduct(null)
                      setShowEmailInput(false)
                    }}
                    onReservationCreated={handleReservationCreated}
                  />
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold mb-6">Available Products</h2>
              <ProductsList onSelectProduct={handleSelectProduct} />
            </div>
          </TabsContent>

          <TabsContent value="reservations" className="space-y-6">
            {!userEmail ? (
              <div className="max-w-md">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="dashboard-email" className="block text-sm font-medium mb-2">
                      Enter your email to view reservations
                    </label>
                    <input
                      id="dashboard-email"
                      type="email"
                      placeholder="your@email.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button
                    onClick={() => setUserEmail(userEmail)}
                    disabled={!userEmail.includes('@')}
                    className="w-full"
                  >
                    View Reservations
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setUserEmail('')}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Change email
                </button>
                <ReservationsDashboard key={refreshKey} email={userEmail} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
