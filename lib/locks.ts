import redis from './redis'

const LOCK_TTL = 5 // seconds
const LOCK_TIMEOUT = 1000 // milliseconds

export async function acquireLock(
  key: string,
  maxRetries = 10
): Promise<string | null> {
  const lockId = Math.random().toString(36).substring(2, 15)
  const lockKey = `lock:${key}`

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await redis.set(lockKey, lockId, {
        nx: true,
        ex: LOCK_TTL,
      })

      if (result === 'OK') {
        return lockId
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      console.error('Error acquiring lock:', error)
      throw error
    }
  }

  return null
}

export async function releaseLock(
  key: string,
  lockId: string
): Promise<boolean> {
  const lockKey = `lock:${key}`

  try {
    // Only delete if the lock ID matches (prevents releasing someone else's lock)
    const storedId = await redis.get<string>(lockKey)
    if (storedId === lockId) {
      await redis.del(lockKey)
      return true
    }
    return false
  } catch (error) {
    console.error('Error releasing lock:', error)
    throw error
  }
}

export async function withLock<T>(
  key: string,
  callback: () => Promise<T>
): Promise<T> {
  const lockId = await acquireLock(key)
  if (!lockId) {
    throw new Error(`Failed to acquire lock for key: ${key}`)
  }

  try {
    return await callback()
  } finally {
    await releaseLock(key, lockId)
  }
}
