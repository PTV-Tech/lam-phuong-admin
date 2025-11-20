/**
 * Custom hook for Job Categories with 3-layer caching:
 * 1. React Query (in-memory cache)
 * 2. IndexedDB (persistent cache)
 * 3. Rate Limiter (API protection)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getJobCategories, type AirtableRecord, type JobCategoryFields } from '@/lib/airtable-api'
import { getCachedData, setCachedData, CACHE_KEYS } from '@/lib/indexeddb-cache'

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Fetch job categories with IndexedDB cache check and rate limiting
 */
async function fetchJobCategoriesWithCache(): Promise<AirtableRecord<JobCategoryFields>[]> {
  // Layer 2: Check IndexedDB cache first
  const cachedData = await getCachedData<AirtableRecord<JobCategoryFields>[]>(
    CACHE_KEYS.jobCategories,
    CACHE_EXPIRY_MS
  )

  if (cachedData) {
    console.log('[Job Categories Cache] Using IndexedDB cache')
    return cachedData
  }

  // Layer 3: Fetch from API (rate limiter is applied in airtable-api.ts)
  console.log('[Job Categories Cache] Fetching from API')
  const response = await getJobCategories()
  const records = response.records

  // Save to IndexedDB cache
  await setCachedData(CACHE_KEYS.jobCategories, records)
  console.log('[Job Categories Cache] Saved to IndexedDB')

  return records
}

/**
 * Hook to use Job Categories with 3-layer caching
 */
export function useJobCategories() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['jobCategories'],
    queryFn: fetchJobCategoriesWithCache,
    staleTime: 30 * 60 * 1000, // 30 minutes - data is considered fresh
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in memory cache
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors immediately
      if (error instanceof Error && error.message.includes('RATE_LIMIT')) {
        return failureCount < 3 // Retry up to 3 times with exponential backoff
      }
      return failureCount < 2 // Retry up to 2 times for other errors
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000)
    },
  })

  /**
   * Invalidate cache (useful when job categories are created/updated/deleted)
   */
  const invalidateCache = async () => {
    // Invalidate React Query cache
    await queryClient.invalidateQueries({ queryKey: ['jobCategories'] })
    // Clear IndexedDB cache
    const { deleteCachedData } = await import('@/lib/indexeddb-cache')
    await deleteCachedData(CACHE_KEYS.jobCategories)
  }

  /**
   * Refetch job categories (force refresh)
   */
  const refetch = async () => {
    // Clear IndexedDB cache first to force fresh fetch
    const { deleteCachedData } = await import('@/lib/indexeddb-cache')
    await deleteCachedData(CACHE_KEYS.jobCategories)
    return query.refetch()
  }

  return {
    jobCategories: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
    invalidateCache,
  }
}

