/**
 * Custom hook for Product Groups with 3-layer caching:
 * 1. React Query (in-memory cache)
 * 2. IndexedDB (persistent cache)
 * 3. Rate Limiter (API protection)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProductGroups, type AirtableRecord, type ProductGroupFields } from '@/lib/airtable-api'
import { getCachedData, setCachedData, CACHE_KEYS } from '@/lib/indexeddb-cache'

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Fetch product groups with IndexedDB cache check and rate limiting
 */
async function fetchProductGroupsWithCache(): Promise<AirtableRecord<ProductGroupFields>[]> {
  // Layer 2: Check IndexedDB cache first
  const cachedData = await getCachedData<AirtableRecord<ProductGroupFields>[]>(
    CACHE_KEYS.productGroups,
    CACHE_EXPIRY_MS
  )

  if (cachedData) {
    console.log('[Product Groups Cache] Using IndexedDB cache')
    return cachedData
  }

  // Layer 3: Fetch from API (rate limiter is applied in airtable-api.ts)
  console.log('[Product Groups Cache] Fetching from API')
  const response = await getProductGroups({
    fields: ['Name'], // Only fetch name field needed for display
  })
  const records = response.records

  // Save to IndexedDB cache
  await setCachedData(CACHE_KEYS.productGroups, records)
  console.log('[Product Groups Cache] Saved to IndexedDB')

  return records
}

/**
 * Hook to use Product Groups with 3-layer caching
 */
export function useProductGroups() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['productGroups'],
    queryFn: fetchProductGroupsWithCache,
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
   * Invalidate cache (useful when product groups are created/updated/deleted)
   */
  const invalidateCache = async () => {
    console.log('[Product Groups Cache] Invalidating cache...')
    
    // Clear IndexedDB cache first
    const { deleteCachedData } = await import('@/lib/indexeddb-cache')
    await deleteCachedData(CACHE_KEYS.productGroups)
    console.log('[Product Groups Cache] IndexedDB cache cleared')
    
    // Remove the query from cache to force fresh fetch
    queryClient.removeQueries({ queryKey: ['productGroups'] })
    console.log('[Product Groups Cache] React Query cache removed')
    
    // Refetch all queries with this key (will fetch fresh data since cache is cleared)
    await queryClient.refetchQueries({ queryKey: ['productGroups'] })
    console.log('[Product Groups Cache] React Query refetched')
  }

  /**
   * Refetch product groups (force refresh)
   */
  const refetch = async () => {
    // Clear IndexedDB cache first to force fresh fetch
    const { deleteCachedData } = await import('@/lib/indexeddb-cache')
    await deleteCachedData(CACHE_KEYS.productGroups)
    return query.refetch()
  }

  return {
    productGroups: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
    invalidateCache,
  }
}

/**
 * Clear product groups cache (exported for use in Product Groups management page)
 */
export async function clearProductGroupsCache(): Promise<void> {
  const { deleteCachedData } = await import('@/lib/indexeddb-cache')
  await deleteCachedData(CACHE_KEYS.productGroups)
  console.log('[Product Groups Cache] Cache cleared via clearProductGroupsCache()')
}

