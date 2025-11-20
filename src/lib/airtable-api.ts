/**
 * Airtable API service for fetching data
 */

import { getValidAccessToken } from './airtable-oauth'
import slugify from 'slugify'
import { airtableRateLimiter } from './rate-limiter'

const AIRTABLE_API_BASE_URL = 'https://api.airtable.com/v0'

/**
 * Get Airtable base ID from environment variables
 */
function getAirtableBaseId(): string {
  const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID
  if (!baseId) {
    throw new Error('VITE_AIRTABLE_BASE_ID is not configured')
  }
  return baseId
}

/**
 * Get table name from environment variables or use default
 */
function getLocationsTableName(): string {
  return import.meta.env.VITE_AIRTABLE_LOCATIONS_TABLE || 'Locations'
}

/**
 * Get product groups table name from environment variables or use default
 */
function getProductGroupsTableName(): string {
  return import.meta.env.VITE_AIRTABLE_PRODUCT_GROUPS_TABLE || 'Product Groups'
}

/**
 * Get job categories table name from environment variables or use default
 */
function getJobCategoriesTableName(): string {
  return import.meta.env.VITE_AIRTABLE_JOB_CATEGORIES_TABLE || 'Job Categories'
}

/**
 * Get job types table name from environment variables or use default
 */
function getJobTypesTableName(): string {
  return import.meta.env.VITE_AIRTABLE_JOB_TYPES_TABLE || 'Job Types'
}

/**
 * Get job postings table name from environment variables or use default
 */
function getJobPostingsTableName(): string {
  return import.meta.env.VITE_AIRTABLE_JOB_POSTINGS_TABLE || 'Job Postings'
}

/**
 * Airtable record interface
 */
export interface AirtableRecord<T = Record<string, any>> {
  id: string
  fields: T
  createdTime: string
}

/**
 * Airtable API response interface
 */
export interface AirtableResponse<T = Record<string, any>> {
  records: AirtableRecord<T>[]
  offset?: string
}

/**
 * Location fields interface
 */
export interface LocationFields {
  Name?: string
  Slug?: string
  Status?: string
  [key: string]: any
}

/**
 * Product Group fields interface
 */
export interface ProductGroupFields {
  Name?: string
  Slug?: string
  Status?: string
  [key: string]: any
}

/**
 * Job Category fields interface
 */
export interface JobCategoryFields {
  Name?: string
  Slug?: string
  Status?: string
  [key: string]: any
}

/**
 * Job Type fields interface
 */
export interface JobTypeFields {
  Name?: string
  Slug?: string
  Status?: string
  [key: string]: any
}

/**
 * Job Posting fields interface
 */
export interface JobPostingFields {
  'Tiêu đề'?: string
  Slug?: string
  'Giới thiệu'?: string
  'Mô tả công việc'?: string
  'Yêu cầu'?: string
  'Quyền lợi'?: string
  'Cách thức ứng tuyển'?: string
  'Hạn chót nhận'?: string // ISO 8601 date string
  'Khu vực'?: string[] // Array of location record IDs
  'Danh mục công việc'?: string[] // Array of job category record IDs
  'Loại công việc'?: string[] // Array of job type record IDs
  'Nhóm sản phẩm'?: string[] // Array of product group record IDs
  Status?: string
  [key: string]: any
}

/**
 * Helper function to execute any Airtable API call with rate limiting
 */
async function executeAirtableRequest<T>(
  requestFn: () => Promise<T>
): Promise<T> {
  return airtableRateLimiter.execute(async () => {
    try {
      return await requestFn()
    } catch (error) {
      // Re-throw rate limit errors
      if (error instanceof Error && error.message.includes('RATE_LIMIT')) {
        throw error
      }
      // Check response status for rate limit
      if (error instanceof Response && error.status === 429) {
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.')
      }
      throw error
    }
  })
}

/**
 * Fetch records from an Airtable table
 */
async function fetchAirtableRecords<T = Record<string, any>>(
  tableName: string,
  options?: {
    maxRecords?: number
    view?: string
    filterByFormula?: string
    sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
    fields?: string[]
  }
): Promise<AirtableResponse<T>> {
  return executeAirtableRequest(async () => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid access token. Please log in again.')
    }

    const baseId = getAirtableBaseId()
    const url = new URL(`${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`)

    if (options?.maxRecords) {
      url.searchParams.append('maxRecords', options.maxRecords.toString())
    }
    if (options?.view) {
      url.searchParams.append('view', options.view)
    }
    if (options?.filterByFormula) {
      url.searchParams.append('filterByFormula', options.filterByFormula)
    }
    if (options?.sort) {
      options.sort.forEach((sort, index) => {
        url.searchParams.append(`sort[${index}][field]`, sort.field)
        url.searchParams.append(`sort[${index}][direction]`, sort.direction)
      })
    }
    if (options?.fields && options.fields.length > 0) {
      options.fields.forEach(field => {
        url.searchParams.append('fields[]', field)
      })
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      // Check for rate limit errors
      if (response.status === 429 || error.includes('RATE_LIMIT')) {
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.')
      }
      throw new Error(`Failed to fetch records: ${error}`)
    }

    return response.json()
  })
}

/**
 * Fetch all locations from Airtable
 */
export async function getLocations(options?: {
  maxRecords?: number
  view?: string
  filterByFormula?: string
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
}): Promise<AirtableResponse<LocationFields>> {
  const tableName = getLocationsTableName()
  return fetchAirtableRecords<LocationFields>(tableName, options)
}

/**
 * Check if a slug exists in Airtable
 */
export async function checkSlugExists(slug: string): Promise<boolean> {
  try {
    const tableName = getLocationsTableName()
    // Escape single quotes in slug for Airtable formula
    const escapedSlug = slug.replace(/'/g, "''")
    const filterFormula = `{Slug} = '${escapedSlug}'`
    
    const response = await getLocations({
      filterByFormula: filterFormula,
      maxRecords: 1,
    })
    
    return response.records.length > 0
  } catch (err) {
    console.error('Error checking slug existence:', err)
    // If there's an error checking, assume it doesn't exist to allow creation
    return false
  }
}

/**
 * Generate a unique slug by checking Airtable and appending suffix if needed
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name.trim(), {
    lower: true,
    strict: true,
  })

  // Check if base slug exists
  const baseExists = await checkSlugExists(baseSlug)
  if (!baseExists) {
    return baseSlug
  }

  // Try with suffix starting from 2
  let counter = 2
  let uniqueSlug = `${baseSlug}-${counter}`
  
  while (await checkSlugExists(uniqueSlug)) {
    counter++
    uniqueSlug = `${baseSlug}-${counter}`
    
    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug after many attempts')
    }
  }

  return uniqueSlug
}

/**
 * Create a new location in Airtable
 */
export async function createLocation(fields: LocationFields): Promise<AirtableRecord<LocationFields>> {
  return executeAirtableRequest(async () => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid access token. Please log in again.')
    }

    const baseId = getAirtableBaseId()
    const tableName = getLocationsTableName()
    const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: fields,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      if (response.status === 429 || error.includes('RATE_LIMIT')) {
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.')
      }
      throw new Error(`Failed to create location: ${error}`)
    }

    const data = await response.json()
    return data.records[0]
  })
}

/**
 * Update a location in Airtable
 */
export async function updateLocation(recordId: string, fields: Partial<LocationFields>): Promise<AirtableRecord<LocationFields>> {
  return executeAirtableRequest(async () => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid access token. Please log in again.')
    }

    const baseId = getAirtableBaseId()
    const tableName = getLocationsTableName()
    const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: fields,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      if (response.status === 429 || error.includes('RATE_LIMIT')) {
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.')
      }
      throw new Error(`Failed to update location: ${error}`)
    }

    const data = await response.json()
    return data
  })
}

/**
 * Delete a single location from Airtable
 */
export async function deleteLocation(recordId: string): Promise<void> {
  return executeAirtableRequest(async () => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid access token. Please log in again.')
    }

    const baseId = getAirtableBaseId()
    const tableName = getLocationsTableName()
    const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      if (response.status === 429 || error.includes('RATE_LIMIT')) {
        throw new Error('RATE_LIMIT: Too many requests. Please try again later.')
      }
      throw new Error(`Failed to delete location: ${error}`)
    }
  })
}

/**
 * Delete multiple locations from Airtable
 * Note: Airtable API allows deleting up to 10 records per request
 */
export async function deleteLocations(recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) {
    return
  }

  return executeAirtableRequest(async () => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid access token. Please log in again.')
    }

    const baseId = getAirtableBaseId()
    const tableName = getLocationsTableName()
    const MAX_RECORDS_PER_REQUEST = 10
    
    // Split into chunks of 10 (Airtable's limit)
    for (let i = 0; i < recordIds.length; i += MAX_RECORDS_PER_REQUEST) {
      const chunk = recordIds.slice(i, i + MAX_RECORDS_PER_REQUEST)
      const url = new URL(`${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`)
      
      // Add record IDs as query parameters
      chunk.forEach(id => {
        url.searchParams.append('records[]', id)
      })

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const error = await response.text()
        if (response.status === 429 || error.includes('RATE_LIMIT')) {
          throw new Error('RATE_LIMIT: Too many requests. Please try again later.')
        }
        throw new Error(`Failed to delete locations: ${error}`)
      }
    }
  })
}

/**
 * Fetch all product groups from Airtable
 */
export async function getProductGroups(options?: {
  maxRecords?: number
  view?: string
  filterByFormula?: string
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
}): Promise<AirtableResponse<ProductGroupFields>> {
  const tableName = getProductGroupsTableName()
  return fetchAirtableRecords<ProductGroupFields>(tableName, options)
}

/**
 * Create a new product group in Airtable
 */
export async function createProductGroup(fields: ProductGroupFields): Promise<AirtableRecord<ProductGroupFields>> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getProductGroupsTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [
        {
          fields: fields,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create product group: ${error}`)
  }

  const data = await response.json()
  return data.records[0]
}

/**
 * Delete a single product group from Airtable
 */
export async function deleteProductGroup(recordId: string): Promise<void> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getProductGroupsTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete product group: ${error}`)
  }
}

/**
 * Delete multiple product groups from Airtable
 * Note: Airtable API allows deleting up to 10 records per request
 */
export async function deleteProductGroups(recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) {
    return
  }

  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getProductGroupsTableName()
  const MAX_RECORDS_PER_REQUEST = 10
  
  // Split into chunks of 10 (Airtable's limit)
  for (let i = 0; i < recordIds.length; i += MAX_RECORDS_PER_REQUEST) {
    const chunk = recordIds.slice(i, i + MAX_RECORDS_PER_REQUEST)
    const url = new URL(`${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`)
    
    // Add record IDs as query parameters
    chunk.forEach(id => {
      url.searchParams.append('records[]', id)
    })

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete product groups: ${error}`)
    }
  }
}

/**
 * Update a product group in Airtable
 */
export async function updateProductGroup(recordId: string, fields: Partial<ProductGroupFields>): Promise<AirtableRecord<ProductGroupFields>> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getProductGroupsTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: fields,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update product group: ${error}`)
  }

  const data = await response.json()
  return data
}

/**
 * Check if a slug exists in Product Groups Airtable table
 */
export async function checkProductGroupSlugExists(slug: string): Promise<boolean> {
  try {
    const tableName = getProductGroupsTableName()
    // Escape single quotes in slug for Airtable formula
    const escapedSlug = slug.replace(/'/g, "''")
    const filterFormula = `{Slug} = '${escapedSlug}'`
    
    const response = await getProductGroups({
      filterByFormula: filterFormula,
      maxRecords: 1,
    })
    
    return response.records.length > 0
  } catch (err) {
    console.error('Error checking product group slug existence:', err)
    // If there's an error checking, assume it doesn't exist to allow creation
    return false
  }
}

/**
 * Generate a unique slug for product groups by checking Airtable and appending suffix if needed
 */
export async function generateUniqueProductGroupSlug(name: string): Promise<string> {
  const baseSlug = slugify(name.trim(), {
    lower: true,
    strict: true,
  })

  // Check if base slug exists
  const baseExists = await checkProductGroupSlugExists(baseSlug)
  if (!baseExists) {
    return baseSlug
  }

  // Try with suffix starting from 2
  let counter = 2
  let uniqueSlug = `${baseSlug}-${counter}`
  
  while (await checkProductGroupSlugExists(uniqueSlug)) {
    counter++
    uniqueSlug = `${baseSlug}-${counter}`
    
    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug after many attempts')
    }
  }

  return uniqueSlug
}


/**
 * Fetch all job categories from Airtable
 */
export async function getJobCategories(options?: {
  maxRecords?: number
  view?: string
  filterByFormula?: string
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
}): Promise<AirtableResponse<JobCategoryFields>> {
  const tableName = getJobCategoriesTableName()
  return fetchAirtableRecords<JobCategoryFields>(tableName, options)
}

/**
 * Create a new job category in Airtable
 */
export async function createJobCategory(fields: JobCategoryFields): Promise<AirtableRecord<JobCategoryFields>> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobCategoriesTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [
        {
          fields: fields,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create job category: ${error}`)
  }

  const data = await response.json()
  return data.records[0]
}

/**
 * Update a job category in Airtable
 */
export async function updateJobCategory(recordId: string, fields: Partial<JobCategoryFields>): Promise<AirtableRecord<JobCategoryFields>> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobCategoriesTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: fields,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update job category: ${error}`)
  }

  const data = await response.json()
  return data
}

/**
 * Delete a single job category from Airtable
 */
export async function deleteJobCategory(recordId: string): Promise<void> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobCategoriesTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete job category: ${error}`)
  }
}

/**
 * Delete multiple job categories from Airtable
 * Note: Airtable API allows deleting up to 10 records per request
 */
export async function deleteJobCategories(recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) {
    return
  }

  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobCategoriesTableName()
  const MAX_RECORDS_PER_REQUEST = 10
  
  // Split into chunks of 10 (Airtable's limit)
  for (let i = 0; i < recordIds.length; i += MAX_RECORDS_PER_REQUEST) {
    const chunk = recordIds.slice(i, i + MAX_RECORDS_PER_REQUEST)
    const url = new URL(`${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`)
    
    // Add record IDs as query parameters
    chunk.forEach(id => {
      url.searchParams.append('records[]', id)
    })

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete job categories: ${error}`)
    }
  }
}

/**
 * Check if a slug exists in Job Categories Airtable table
 */
export async function checkJobCategorySlugExists(slug: string): Promise<boolean> {
  try {
    const tableName = getJobCategoriesTableName()
    // Escape single quotes in slug for Airtable formula
    const escapedSlug = slug.replace(/'/g, "''")
    const filterFormula = `{Slug} = '${escapedSlug}'`
    
    const response = await getJobCategories({
      filterByFormula: filterFormula,
      maxRecords: 1,
    })
    
    return response.records.length > 0
  } catch (err) {
    console.error('Error checking job category slug existence:', err)
    // If there's an error checking, assume it doesn't exist to allow creation
    return false
  }
}

/**
 * Generate a unique slug for job categories by checking Airtable and appending suffix if needed
 */
export async function generateUniqueJobCategorySlug(name: string): Promise<string> {
  const baseSlug = slugify(name.trim(), {
    lower: true,
    strict: true,
  })

  // Check if base slug exists
  const baseExists = await checkJobCategorySlugExists(baseSlug)
  if (!baseExists) {
    return baseSlug
  }

  // Try with suffix starting from 2
  let counter = 2
  let uniqueSlug = `${baseSlug}-${counter}`
  
  while (await checkJobCategorySlugExists(uniqueSlug)) {
    counter++
    uniqueSlug = `${baseSlug}-${counter}`
    
    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug after many attempts')
    }
  }

  return uniqueSlug
}

/**
 * Fetch all job types from Airtable
 */
export async function getJobTypes(options?: {
  maxRecords?: number
  view?: string
  filterByFormula?: string
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
}): Promise<AirtableResponse<JobTypeFields>> {
  const tableName = getJobTypesTableName()
  return fetchAirtableRecords<JobTypeFields>(tableName, options)
}

/**
 * Create a new job type in Airtable
 */
export async function createJobType(fields: JobTypeFields): Promise<AirtableRecord<JobTypeFields>> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobTypesTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [
        {
          fields: fields,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create job type: ${error}`)
  }

  const data = await response.json()
  return data.records[0]
}

/**
 * Update a job type in Airtable
 */
export async function updateJobType(recordId: string, fields: Partial<JobTypeFields>): Promise<AirtableRecord<JobTypeFields>> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobTypesTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: fields,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update job type: ${error}`)
  }

  const data = await response.json()
  return data
}

/**
 * Delete a single job type from Airtable
 */
export async function deleteJobType(recordId: string): Promise<void> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobTypesTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete job type: ${error}`)
  }
}

/**
 * Delete multiple job types from Airtable
 * Note: Airtable API allows deleting up to 10 records per request
 */
export async function deleteJobTypes(recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) {
    return
  }

  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobTypesTableName()
  const MAX_RECORDS_PER_REQUEST = 10
  
  // Split into chunks of 10 (Airtable's limit)
  for (let i = 0; i < recordIds.length; i += MAX_RECORDS_PER_REQUEST) {
    const chunk = recordIds.slice(i, i + MAX_RECORDS_PER_REQUEST)
    const url = new URL(`${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`)
    
    // Add record IDs as query parameters
    chunk.forEach(id => {
      url.searchParams.append('records[]', id)
    })

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete job types: ${error}`)
    }
  }
}

/**
 * Check if a slug exists in Job Types Airtable table
 */
export async function checkJobTypeSlugExists(slug: string): Promise<boolean> {
  try {
    const tableName = getJobTypesTableName()
    // Escape single quotes in slug for Airtable formula
    const escapedSlug = slug.replace(/'/g, "''")
    const filterFormula = `{Slug} = '${escapedSlug}'`
    
    const response = await getJobTypes({
      filterByFormula: filterFormula,
      maxRecords: 1,
    })
    
    return response.records.length > 0
  } catch (err) {
    console.error('Error checking job type slug existence:', err)
    // If there's an error checking, assume it doesn't exist to allow creation
    return false
  }
}

/**
 * Generate a unique slug for job types by checking Airtable and appending suffix if needed
 */
export async function generateUniqueJobTypeSlug(name: string): Promise<string> {
  const baseSlug = slugify(name.trim(), {
    lower: true,
    strict: true,
  })

  // Check if base slug exists
  const baseExists = await checkJobTypeSlugExists(baseSlug)
  if (!baseExists) {
    return baseSlug
  }

  // Try with suffix starting from 2
  let counter = 2
  let uniqueSlug = `${baseSlug}-${counter}`
  
  while (await checkJobTypeSlugExists(uniqueSlug)) {
    counter++
    uniqueSlug = `${baseSlug}-${counter}`
    
    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug after many attempts')
    }
  }

  return uniqueSlug
}

/**
 * Fetch all job postings from Airtable
 */
export async function getJobPostings(options?: {
  maxRecords?: number
  view?: string
  filterByFormula?: string
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
  fields?: string[]
}): Promise<AirtableResponse<JobPostingFields>> {
  const tableName = getJobPostingsTableName()
  return fetchAirtableRecords<JobPostingFields>(tableName, options)
}

/**
 * Create a new job posting in Airtable
 */
export async function createJobPosting(fields: JobPostingFields): Promise<AirtableRecord<JobPostingFields>> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobPostingsTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [
        {
          fields: fields,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create job posting: ${error}`)
  }

  const data = await response.json()
  return data.records[0]
}

/**
 * Update a job posting in Airtable
 */
export async function updateJobPosting(recordId: string, fields: Partial<JobPostingFields>): Promise<AirtableRecord<JobPostingFields>> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobPostingsTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: fields,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update job posting: ${error}`)
  }

  const data = await response.json()
  return data
}

/**
 * Delete a single job posting from Airtable
 */
export async function deleteJobPosting(recordId: string): Promise<void> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobPostingsTableName()
  const url = `${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete job posting: ${error}`)
  }
}

/**
 * Delete multiple job postings from Airtable
 * Note: Airtable API allows deleting up to 10 records per request
 */
export async function deleteJobPostings(recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) {
    return
  }

  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('No valid access token. Please log in again.')
  }

  const baseId = getAirtableBaseId()
  const tableName = getJobPostingsTableName()
  const MAX_RECORDS_PER_REQUEST = 10
  
  // Split into chunks of 10 (Airtable's limit)
  for (let i = 0; i < recordIds.length; i += MAX_RECORDS_PER_REQUEST) {
    const chunk = recordIds.slice(i, i + MAX_RECORDS_PER_REQUEST)
    const url = new URL(`${AIRTABLE_API_BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`)
    
    // Add record IDs as query parameters
    chunk.forEach(id => {
      url.searchParams.append('records[]', id)
    })

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete job postings: ${error}`)
    }
  }
}

/**
 * Check if a slug exists in Job Postings Airtable table
 */
export async function checkJobPostingSlugExists(slug: string): Promise<boolean> {
  try {
    const tableName = getJobPostingsTableName()
    // Escape single quotes in slug for Airtable formula
    const escapedSlug = slug.replace(/'/g, "''")
    const filterFormula = `{Slug} = '${escapedSlug}'`
    
    const response = await getJobPostings({
      filterByFormula: filterFormula,
      maxRecords: 1,
    })
    
    return response.records.length > 0
  } catch (err) {
    console.error('Error checking job posting slug existence:', err)
    // If there's an error checking, assume it doesn't exist to allow creation
    return false
  }
}

/**
 * Generate a unique slug for job postings by checking Airtable and appending suffix if needed
 */
export async function generateUniqueJobPostingSlug(title: string): Promise<string> {
  const baseSlug = slugify(title.trim(), {
    lower: true,
    strict: true,
  })

  // Check if base slug exists
  const baseExists = await checkJobPostingSlugExists(baseSlug)
  if (!baseExists) {
    return baseSlug
  }

  // Try with suffix starting from 2
  let counter = 2
  let uniqueSlug = `${baseSlug}-${counter}`
  
  while (await checkJobPostingSlugExists(uniqueSlug)) {
    counter++
    uniqueSlug = `${baseSlug}-${counter}`
    
    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug after many attempts')
    }
  }

  return uniqueSlug
}
