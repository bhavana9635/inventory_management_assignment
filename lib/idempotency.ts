import redis from './redis'

const IDEMPOTENCY_TTL = 86400 // 24 hours in seconds

export interface IdempotencyResponse {
  status: number
  body: unknown
}

export async function getIdempotencyResponse(
  key: string
): Promise<IdempotencyResponse | null> {
  try {
    const cached = await redis.get<string>(key)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (error) {
    console.error('Error fetching idempotency response:', error)
  }
  return null
}

export async function storeIdempotencyResponse(
  key: string,
  response: IdempotencyResponse
): Promise<void> {
  try {
    await redis.setex(key, IDEMPOTENCY_TTL, JSON.stringify(response))
  } catch (error) {
    console.error('Error storing idempotency response:', error)
  }
}

export async function markIdempotencyPending(key: string): Promise<void> {
  try {
    // Mark as pending in Redis with a special prefix
    await redis.setex(`${key}:pending`, 30, 'true')
  } catch (error) {
    console.error('Error marking idempotency pending:', error)
  }
}
