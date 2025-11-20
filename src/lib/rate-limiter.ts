/**
 * Rate limiter for Airtable API requests
 * Ensures no more than 5 requests per second per Airtable base
 */

interface QueuedRequest<T> {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

class RateLimiter {
  private requestTimestamps: number[] = []
  private queue: QueuedRequest<any>[] = []
  private processing = false
  private readonly maxRequestsPerSecond = 5
  private readonly windowMs = 1000

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this.processQueue()
    })
  }

  /**
   * Process the queue of requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      // Remove timestamps older than 1 second
      const now = Date.now()
      this.requestTimestamps = this.requestTimestamps.filter(
        (timestamp) => now - timestamp < this.windowMs
      )

      // If we're at the limit, wait until we can make another request
      if (this.requestTimestamps.length >= this.maxRequestsPerSecond) {
        const oldestTimestamp = this.requestTimestamps[0]
        const waitTime = this.windowMs - (now - oldestTimestamp) + 10 // Add 10ms buffer
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      // Process the next request
      const request = this.queue.shift()
      if (!request) break

      // Add timestamp for this request
      this.requestTimestamps.push(Date.now())

      // Execute the request
      request
        .fn()
        .then(request.resolve)
        .catch(request.reject)
    }

    this.processing = false
  }

  /**
   * Clear the queue (useful for testing or error recovery)
   */
  clearQueue(): void {
    this.queue.forEach((request) => {
      request.reject(new Error('Rate limiter queue cleared'))
    })
    this.queue = []
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * Get current active requests in the window
   */
  getActiveRequests(): number {
    const now = Date.now()
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.windowMs
    )
    return this.requestTimestamps.length
  }
}

// Singleton instance to share across the app
export const airtableRateLimiter = new RateLimiter()

