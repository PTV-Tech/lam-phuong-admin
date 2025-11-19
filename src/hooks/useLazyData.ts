import { useState, useCallback, useRef } from 'react'
import {
  getLocations,
  getJobCategories,
  getJobTypes,
  getProductGroups,
  type AirtableRecord,
  type LocationFields,
  type JobCategoryFields,
  type JobTypeFields,
  type ProductGroupFields,
} from '@/lib/airtable-api'

type DataType = 'locations' | 'jobCategories' | 'jobTypes' | 'productGroups'

interface DataCache {
  locations: AirtableRecord<LocationFields>[] | null
  jobCategories: AirtableRecord<JobCategoryFields>[] | null
  jobTypes: AirtableRecord<JobTypeFields>[] | null
  productGroups: AirtableRecord<ProductGroupFields>[] | null
}

interface LoadingState {
  locations: boolean
  jobCategories: boolean
  jobTypes: boolean
  productGroups: boolean
}

export const useLazyData = () => {
  const [dataCache, setDataCache] = useState<DataCache>({
    locations: null,
    jobCategories: null,
    jobTypes: null,
    productGroups: null,
  })

  const [loading, setLoading] = useState<LoadingState>({
    locations: false,
    jobCategories: false,
    jobTypes: false,
    productGroups: false,
  })

  // Use refs to track cache and loading state without causing re-renders
  const cacheRef = useRef<DataCache>({
    locations: null,
    jobCategories: null,
    jobTypes: null,
    productGroups: null,
  })

  const loadingRef = useRef<LoadingState>({
    locations: false,
    jobCategories: false,
    jobTypes: false,
    productGroups: false,
  })

  // Sync refs with state
  cacheRef.current = dataCache
  loadingRef.current = loading

  const fetchData = useCallback(async (
    type: DataType,
    fetchFn: () => Promise<{ records: AirtableRecord<any>[] }>,
    retries = 2
  ): Promise<AirtableRecord<any>[] | null> => {
    // Return cached data if exists
    if (cacheRef.current[type]) {
      return cacheRef.current[type]
    }

    // Prevent duplicate requests
    if (loadingRef.current[type]) {
      return null
    }

    setLoading(prev => ({ ...prev, [type]: true }))

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetchFn()
        // Filter to only active records
        const activeRecords = response.records.filter((record: AirtableRecord<any>) => {
          return record.fields.Status === 'Active'
        })

        // Cache the result
        setDataCache(prev => ({ ...prev, [type]: activeRecords }))

        return activeRecords
      } catch (error) {
        // If rate limit error and not last retry
        if (i < retries && error instanceof Error && error.message?.includes('RATE_LIMIT')) {
          // Wait before retry (exponential backoff)
          const delay = 1000 * Math.pow(2, i) // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // Show error to user
        console.error(`Error fetching ${type}:`, error)
        throw error
      } finally {
        if (i === retries) {
          setLoading(prev => ({ ...prev, [type]: false }))
        }
      }
    }

    return null
  }, [])

  const fetchLocations = useCallback(async () => {
    return fetchData('locations', getLocations)
  }, [fetchData])

  const fetchJobCategories = useCallback(async () => {
    return fetchData('jobCategories', getJobCategories)
  }, [fetchData])

  const fetchJobTypes = useCallback(async () => {
    return fetchData('jobTypes', getJobTypes)
  }, [fetchData])

  const fetchProductGroups = useCallback(async () => {
    return fetchData('productGroups', getProductGroups)
  }, [fetchData])

  return {
    dataCache,
    loading,
    fetchLocations,
    fetchJobCategories,
    fetchJobTypes,
    fetchProductGroups,
  }
}

