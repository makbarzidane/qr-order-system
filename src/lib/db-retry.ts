function isTransientDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return false
  const withCode = error as Error & { code?: string }
  return (
    withCode.code === 'P1001' ||
    error.name === 'PrismaClientInitializationError' ||
    error.message.includes("Can't reach database server")
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isTransientDatabaseError(error) || attempt === retries) break
      await sleep(350 * (attempt + 1))
    }
  }
  throw lastError
}

export { isTransientDatabaseError }
