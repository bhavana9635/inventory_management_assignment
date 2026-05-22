'use client'

import { AdminPanel } from '@/components/admin-panel'
import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Admin Panel
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage products and inventory
          </p>
        </div>

        <AdminPanel />
      </div>
    </div>
  )
}
