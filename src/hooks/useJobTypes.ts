/**
 * Custom hook for Job Types with 3-layer caching:
 * 1. React Query (in-memory cache)
 * 2. IndexedDB (persistent cache)
 * 3. Rate Limiter (API protection)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getJobTypes, type AirtableRecord, type JobTypeFields } from '@/lib/airtable-api'
import { getCachedData, setCachedData, CACHE_KEYS } from '@/lib/indexeddb-cache'

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Fetch job types with IndexedDB cache check and rate limiting
 */
async function fetchJobTypesWithCache(): Promise<AirtableRecord<JobTypeFields>[]> {
  // Layer 2: Check IndexedDB cache first
  const cachedData = await getCachedData<AirtableRecord<JobTypeFields>[]>(
    CACHE_KEYS.jobTypes,
    CACHE_EXPIRY_MS
  )

  if (cachedData) {
    console.log('[Job Types Cache] Using IndexedDB cache')
    return cachedData
  }

  // Layer 3: Fetch from API (rate limiter is applied in airtable-api.ts)
  console.log('[Job Types Cache] Fetching from API')
  const response = await getJobTypes({
    fields: ['Name'], // Only fetch name field needed for display
  })
  const records = response.records

  // Save to IndexedDB cache
  await setCachedData(CACHE_KEYS.jobTypes, records)
  console.log('[Job Types Cache] Saved to IndexedDB')

  return records
}

/**
 * Hook to use Job Types with 3-layer caching
 */
export function useJobTypes() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['jobTypes'],
    queryFn: fetchJobTypesWithCache,
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
   * Invalidate cache (useful when job types are created/updated/deleted)
   */
  const invalidateCache = async () => {
    console.log('[Job Types Cache] Invalidating cache...')
    
    // Clear IndexedDB cache first
    const { deleteCachedData } = await import('@/lib/indexeddb-cache')
    await deleteCachedData(CACHE_KEYS.jobTypes)
    console.log('[Job Types Cache] IndexedDB cache cleared')
    
    // Remove the query from cache to force fresh fetch
    queryClient.removeQueries({ queryKey: ['jobTypes'] })
    console.log('[Job Types Cache] React Query cache removed')
    
    // Refetch all queries with this key (will fetch fresh data since cache is cleared)
    await queryClient.refetchQueries({ queryKey: ['jobTypes'] })
    console.log('[Job Types Cache] React Query refetched')
  }

  /**
   * Refetch job types (force refresh)
   */
  const refetch = async () => {
    // Clear IndexedDB cache first to force fresh fetch
    const { deleteCachedData } = await import('@/lib/indexeddb-cache')
    await deleteCachedData(CACHE_KEYS.jobTypes)
    return query.refetch()
  }

  return {
    jobTypes: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
    invalidateCache,
  }
}

/**
 * Clear job types cache (exported for use in Job Types management page)
 */
export async function clearJobTypesCache(): Promise<void> {
  const { deleteCachedData } = await import('@/lib/indexeddb-cache')
  await deleteCachedData(CACHE_KEYS.jobTypes)
  console.log('[Job Types Cache] Cache cleared via clearJobTypesCache()')
}

