# Environment Variables Setup Guide

This guide shows exactly where to find each environment variable value and how to set them up.

## What You Need

1. **Supabase Account** (free tier available)
2. **Upstash Account** (free tier available)
3. A `.env.local` file in your project root

## Step 1: Get Supabase Credentials

### 1.1 Create a Supabase Project (if you don't have one)

1. Go to **https://app.supabase.com**
2. Click "New Project"
3. Fill in:
   - **Project Name**: e.g., "inventory-system"
   - **Database Password**: Create a strong password
   - **Region**: Choose your region
   - **Pricing Plan**: Select "Free" (included in free tier)
4. Click "Create new project" and wait 2-3 minutes for it to initialize

### 1.2 Find Your Supabase URL

1. Open your Supabase project
2. Click **"Settings"** in the left sidebar (gear icon at bottom)
3. Click **"API"** under Configuration
4. Under "Project URL", copy the entire URL
   - It will look like: `https://your-project-id.supabase.co`
   - **This is your `NEXT_PUBLIC_SUPABASE_URL`**

### 1.3 Find Your Supabase Anon Key

1. In the same **Settings > API** page
2. Under "Project API keys" section
3. Copy the key labeled **"anon"** (public key)
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`**

**⚠️ IMPORTANT**: The "anon" key is PUBLIC and safe to expose. Never expose the "service_role" key.

### Example Supabase Values:
```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh12345678.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoMTIzNDU2NzgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMDAwMDAwMCwiZXhwIjoxOTM1MDAwMDAwfQ.K1xU5N3aB5c7D2e8F9g0H1i2J3k4L5m6N7o8P9q0R1s2
```

---

## Step 2: Get Upstash Redis Credentials

### 2.1 Create an Upstash Redis Database (if you don't have one)

1. Go to **https://console.upstash.com**
2. Sign up or log in
3. Click **"Create Database"** or **"Create"**
4. Fill in:
   - **Database Name**: e.g., "inventory-system"
   - **Region**: Choose a region close to you
   - **Type**: Select "Redis"
5. Click "Create" and wait for it to provision (30 seconds)

### 2.2 Find Your Redis REST URL

1. In Upstash console, you should see your database listed
2. Click on your database name to open it
3. Click the **"REST API"** tab
4. Copy the URL under "Endpoint"
   - It will look like: `https://your-unique-id.upstash.io`
   - **This is your `UPSTASH_REDIS_REST_URL`**

### 2.3 Find Your Redis Token

1. In the same **REST API** tab
2. Look for the section "Authorization" or scroll down
3. Copy the **token** value
   - It's a long string that looks like: `AZC1AZM3N9wEZxx...`
   - **This is your `UPSTASH_REDIS_REST_TOKEN`**

**⚠️ IMPORTANT**: Keep this token secret! It's like a password to your Redis database.

### Example Upstash Values:
```
UPSTASH_REDIS_REST_URL=https://zen-panda-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZC1AZM3N9wEZxxUZzZyYzYzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz
```

---

## Step 3: Create Your `.env.local` File

### 3.1 Copy the Template

```bash
# In your project directory, copy the example:
cp .env.example .env.local
```

### 3.2 Edit `.env.local`

Open `.env.local` in your editor and fill in the values you copied:

```bash
# SUPABASE CONFIGURATION
# From Supabase Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh12345678.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoMTIzNDU2NzgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMDAwMDAwMCwiZXhwIjoxOTM1MDAwMDAwfQ.K1xU5N3aB5c7D2e8F9g0H1i2J3k4L5m6N7o8P9q0R1s2

# UPSTASH REDIS CONFIGURATION
# From Upstash Console > Database > REST API
UPSTASH_REDIS_REST_URL=https://zen-panda-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZC1AZM3N9wEZxxUZzZyYzYzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz

# Optional
NODE_ENV=development
```

---

## Step 4: Verify Your Setup

### 4.1 Run the Application

```bash
npm install
# or
pnpm install

pnpm dev
```

### 4.2 Check for Errors

Look for any of these errors in the terminal. If you see them, double-check your `.env.local`:

- ❌ `Error: UPSTASH_REDIS_REST_URL is not set`
  - Your `UPSTASH_REDIS_REST_URL` is missing or wrong

- ❌ `Error: NEXT_PUBLIC_SUPABASE_URL is not set`
  - Your `NEXT_PUBLIC_SUPABASE_URL` is missing or wrong

- ❌ `Connect ECONNREFUSED` when creating reservations
  - Your Redis token or URL is incorrect

- ❌ `Invalid JWT` or `Unauthorized`
  - Your Supabase anon key is incorrect

### 4.3 Test the Connection

1. Open http://localhost:3000
2. You should see products loading
3. Try creating a reservation to test Redis and Supabase connection

---

## Reference: All Environment Variables

| Variable | Where to Get | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Console > Settings > API > Project URL | ✅ Yes | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Console > Settings > API > Project API Keys > anon | ✅ Yes | `eyJhbGc...` |
| `UPSTASH_REDIS_REST_URL` | Upstash Console > Your DB > REST API > Endpoint | ✅ Yes | `https://zen-panda-123.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console > Your DB > REST API > Token | ✅ Yes | `AZC1AZM3N9...` |
| `NODE_ENV` | Set manually | ❌ No | `development` or `production` |

---

## Troubleshooting

### "Cannot find module 'redis'"
- You forgot to run `pnpm install`

### "ENOTFOUND zen-panda-123.upstash.io"
- Your Upstash URL is wrong or your internet is down
- Verify the URL doesn't have typos

### "Unauthorized: Anon key is invalid"
- Your Supabase anon key is wrong
- Make sure you're using the "anon" key, not "service_role"

### Products don't load on homepage
- Check browser console (F12 > Console) for errors
- Verify Supabase URL and anon key are correct
- Make sure you ran the SQL schema setup in Supabase

### "Reservation failed" error when trying to reserve
- Redis connection failed: check `UPSTASH_REDIS_REST_URL` and token
- Database error: check Supabase credentials
- Check terminal logs for detailed error message

### I forgot my password / lost access to Supabase
- Go to https://app.supabase.com
- Click "Forgot Password" or sign in with a different method
- You can always create a new free project

---

## Security Best Practices

1. **Never commit `.env.local` to git**
   - Add it to `.gitignore` (already done in this project)

2. **Keep your Redis token secret**
   - Anyone with this token can access your Redis database

3. **The Supabase anon key is safe to expose**
   - It's a public key used by the browser
   - RLS policies in Supabase protect your data
   - Never expose the "service_role" key

4. **For production**
   - Use environment variables in your hosting platform (Vercel, Netlify, etc.)
   - Never hardcode secrets in your code
   - Rotate tokens regularly if compromised

---

## Getting Help

- **Supabase Issues**: https://github.com/supabase/supabase/discussions
- **Upstash Issues**: https://upstash.com/support
- **Check the main README.md** for architecture and feature details
