# Inventory Reservation System

A production-ready inventory reservation app with Redis-backed distributed locking, lazy reservation cleanup, and a clean Next.js + Supabase architecture.

## Run Locally

### Prerequisites
- Node.js 18+
- pnpm
- Supabase project with PostgreSQL
- Upstash Redis instance

### Environment Variables
Create a `.env.local` file from `.env.example` and add the values below.

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=service_role_key_here
UPSTASH_REDIS_REST_URL=https://your-redis-id.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
NODE_ENV=development
```

> Note: the service role key is required for server-side reservation operations that need full DB access.

### Install and start

```bash
pnpm install
pnpm dev
```

Open the app at `http://localhost:3000` and the admin panel at `http://localhost:3000/admin`.

### Database Setup

This project expects a Supabase database with the schema below. Run the SQL in Supabase SQL Editor or via your own migration process.

```sql
-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  total_quantity INTEGER NOT NULL,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create idempotency records table
CREATE TABLE IF NOT EXISTS public.idempotency_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reservations_product_id ON public.reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON public.reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON public.idempotency_records(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON public.idempotency_records(expires_at);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "products_select_public" ON public.products FOR SELECT USING (true);
CREATE POLICY "reservations_select_all" ON public.reservations FOR SELECT USING (true);
CREATE POLICY "reservations_insert_all" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_update_all" ON public.reservations FOR UPDATE USING (true);
CREATE POLICY "reservations_delete_all" ON public.reservations FOR DELETE USING (true);
CREATE POLICY "idempotency_select_all" ON public.idempotency_records FOR SELECT USING (true);
CREATE POLICY "idempotency_insert_all" ON public.idempotency_records FOR INSERT WITH CHECK (true);
CREATE POLICY "idempotency_update_all" ON public.idempotency_records FOR UPDATE USING (true);

-- Atomic RPC functions
CREATE OR REPLACE FUNCTION increment_reserved(product_id UUID, amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products SET reserved_quantity = reserved_quantity + amount, updated_at = now() WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_reserved(product_id UUID, amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products SET reserved_quantity = GREATEST(0, reserved_quantity - amount), updated_at = now() WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_sold(product_id UUID, amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products SET sold_quantity = sold_quantity + amount, updated_at = now() WHERE id = product_id;
END;
$$;
```

### Seed Data

Use the admin panel or run this SQL in the Supabase SQL editor:

```sql
INSERT INTO public.products (name, sku, total_quantity, reserved_quantity, sold_quantity)
VALUES
  ('MacBook Pro 14"', 'MBPRO-14-2024', 50, 0, 0),
  ('iPhone 15 Pro', 'IPHONE-15-PRO', 100, 0, 0),
  ('iPad Air', 'IPAD-AIR-2024', 75, 0, 0),
  ('Apple Watch Ultra', 'WATCH-ULTRA', 150, 0, 0),
  ('AirPods Pro', 'AIRPODS-PRO-2', 200, 0, 0)
ON CONFLICT (sku) DO NOTHING;
```

Verify data:

```sql
SELECT id, name, sku, total_quantity, reserved_quantity, sold_quantity
FROM public.products
ORDER BY created_at DESC;
```

## How Expiry Works in Production

This app uses a lazy cleanup strategy instead of a background worker.

### Reservation lifecycle

- When a reservation is created, the app stores it with:
  - `status = 'PENDING'`
  - `expires_at = NOW() + 5 minutes`
- The reserved quantity is applied immediately to the product stock.

### Cleanup behavior

- Expired reservations are cleaned up when reservations are fetched or inventory is checked.
- The cleanup flow:
  1. Find pending reservations where `expires_at < NOW()`.
  2. Update them to `status = 'EXPIRED'`.
  3. Decrement reserved inventory back to available stock.

### Why this is production-friendly

- No extra scheduler service required.
- The cleanup work happens only when the app is active.
- It is naturally distributed across requests and keeps inventory accurate with minimal overhead.

### Production considerations

- This is ideal for moderate traffic and cost-sensitive deployments.
- If you need strict timing under high load, add a periodic cleanup job (pg_cron or a serverless scheduled function).
- The Redis lock plus lazy cleanup protects against most race conditions.

## Trade-offs and Future Improvements

### Key trade-offs

- **Lazy cleanup vs scheduled cleanup**
  - Chosen: lazy cleanup on read
  - Pros: no scheduler, lower infrastructure cost, simpler design
  - Cons: cleanup may occur on demand rather than at a fixed interval

- **Redis distributed lock vs DB transaction lock**
  - Chosen: Upstash Redis lock
  - Pros: lightweight, fast, easy to release automatically with TTL
  - Cons: requires a separate Redis service and additional latency

- **Service role access for server-side DB operations**
  - Chosen: use Supabase service-role key on server operations
  - Pros: reliable access for reservations / product updates
  - Cons: requires careful secret handling and should not be exposed to the browser

### What I would do with more time

1. Add full test coverage
   - unit tests for reservation and lock logic
   - integration tests for concurrent reservations
   - E2E tests for confirm/release flows

2. Add observability
   - request tracing
   - Redis lock contention metrics
   - expired reservation cleanup metrics
   - error reporting (Sentry / Logflare)

3. Improve data validation and security
   - stricter request schema validation
   - rate limiting per email/user
   - authenticated user sessions instead of anonymous email-only flow

4. Harden concurrency
   - database-level `SELECT FOR UPDATE` fallback
   - stronger retry/backoff on lock contention
   - deduplicated idempotency support for repeated requests

5. Enhance UX
   - real-time inventory updates via WebSocket or server-sent events
   - reservation expiry countdown timers
   - email notifications for confirmed reservations

## Project Structure

- `app/` — Next.js app routes, pages, and metadata
- `components/` — UI components and reservation flow
- `lib/` — reservation service, locks, Supabase helpers
- `prisma/` — Prisma schema
- `public/` — static assets and icons

## Quick Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm test
```
