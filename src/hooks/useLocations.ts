/**
 * Custom hook for Locations with 3-layer caching:
 * 1. React Query (in-memory cache)
 * 2. IndexedDB (persistent cache)
 * 3. Rate Limiter (API protection)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLocations, type AirtableRecord, type LocationFields } from '@/lib/airtable-api'
import { getCachedData, setCachedData, CACHE_KEYS } from '@/lib/indexeddb-cache'

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Fetch locations with IndexedDB cache check and rate limiting
 */
async function fetchLocationsWithCache(): Promise<AirtableRecord<LocationFields>[]> {
  // Layer 2: Check IndexedDB cache first
  const cachedData = await getCachedData<AirtableRecord<LocationFields>[]>(
    CACHE_KEYS.locations,
    CACHE_EXPIRY_MS
  )

  if (cachedData) {
    console.log('[Locations Cache] Using IndexedDB cache')
    return cachedData
  }

  // Layer 3: Fetch from API (rate limiter is applied in airtable-api.ts)
  console.log('[Locations Cache] Fetching from API')
  const response = await getLocations()
  const records = response.records

  // Save to IndexedDB cache
  await setCachedData(CACHE_KEYS.locations, records)
  console.log('[Locations Cache] Saved to IndexedDB')

  return records
}

/**
 * Hook to use Locations with 3-layer caching
 */
export function useLocations() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocationsWithCache,
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
   * Invalidate cache (useful when locations are created/updated/deleted)
   */
  const invalidateCache = async () => {
    // Invalidate React Query cache
    await queryClient.invalidateQueries({ queryKey: ['locations'] })
    // Clear IndexedDB cache
    const { deleteCachedData } = await import('@/lib/indexeddb-cache')
    await deleteCachedData(CACHE_KEYS.locations)
  }

  /**
   * Refetch locations (force refresh)
   */
  const refetch = async () => {
    // Clear IndexedDB cache first to force fresh fetch
    const { deleteCachedData } = await import('@/lib/indexeddb-cache')
    await deleteCachedData(CACHE_KEYS.locations)
    return query.refetch()
  }

  return {
    locations: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
    invalidateCache,
  }
}

