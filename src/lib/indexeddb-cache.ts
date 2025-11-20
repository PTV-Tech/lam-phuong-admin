/**
 * IndexedDB cache utility for persistent storage
 * Stores Airtable data with timestamps and version management
 */

import { openDB, type IDBPDatabase } from 'idb'

interface CacheEntry<T> {
  data: T
  timestamp: number
  version: number
}

const DB_NAME = 'airtable-cache'
const DB_VERSION = 1
const CACHE_VERSION = 1 // Increment this when data structure changes
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

let dbPromise: Promise<IDBPDatabase> | null = null

/**
 * Get or create the database
 */
function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache')
        }
      },
    })
  }
  return dbPromise
}

/**
 * Get cached data if it exists and is not expired
 */
export async function getCachedData<T>(
  key: string,
  expiryMs: number = DEFAULT_EXPIRY_MS
): Promise<T | null> {
  try {
    const db = await getDB()
    const entry = await db.get('cache', key)

    if (!entry) {
      return null
    }

    // Check version compatibility
    if (entry.version !== CACHE_VERSION) {
      // Version mismatch, delete old cache
      await db.delete('cache', key)
      return null
    }

    // Check if expired
    const now = Date.now()
    const age = now - entry.timestamp

    if (age > expiryMs) {
      // Cache expired, delete it
      await db.delete('cache', key)
      return null
    }

    return entry.data as T
  } catch (error) {
    console.error('Error reading from IndexedDB cache:', error)
    // If IndexedDB fails, return null to fall back to API
    return null
  }
}

/**
 * Save data to cache with current timestamp
 */
export async function setCachedData<T>(
  key: string,
  data: T
): Promise<void> {
  try {
    const db = await getDB()
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    }
    await db.put('cache', entry, key)
  } catch (error) {
    console.error('Error writing to IndexedDB cache:', error)
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Delete cached data
 */
export async function deleteCachedData(key: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('cache', key)
  } catch (error) {
    console.error('Error deleting from IndexedDB cache:', error)
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDB()
    await db.clear('cache')
  } catch (error) {
    console.error('Error clearing IndexedDB cache:', error)
  }
}

/**
 * Get cache age in milliseconds
 */
export async function getCacheAge(key: string): Promise<number | null> {
  try {
    const db = await getDB()
    const entry = await db.get('cache', key)

    if (!entry) {
      return null
    }

    return Date.now() - entry.timestamp
  } catch (error) {
    console.error('Error getting cache age:', error)
    return null
  }
}

/**
 * Cache keys for different resources
 */
export const CACHE_KEYS = {
  locations: 'locations-list',
  jobCategories: 'job-categories-list',
  jobTypes: 'job-types-list',
  productGroups: 'product-groups-list',
} as const

