/**
 * Airtable API service for fetching data
 */

import { getValidAccessToken } from './airtable-oauth'

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
  Status?: string
  [key: string]: any
}

/**
 * Product Group fields interface
 */
export interface ProductGroupFields {
  Name?: string
  Slug?: string
  [key: string]: any
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
  }
): Promise<AirtableResponse<T>> {
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

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch records: ${error}`)
  }

  return response.json()
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
 * Create a new location in Airtable
 */
export async function createLocation(fields: LocationFields): Promise<AirtableRecord<LocationFields>> {
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
    throw new Error(`Failed to create location: ${error}`)
  }

  const data = await response.json()
  return data.records[0]
}

/**
 * Update a location in Airtable
 */
export async function updateLocation(recordId: string, fields: Partial<LocationFields>): Promise<AirtableRecord<LocationFields>> {
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
    throw new Error(`Failed to update location: ${error}`)
  }

  const data = await response.json()
  return data
}

/**
 * Delete a single location from Airtable
 */
export async function deleteLocation(recordId: string): Promise<void> {
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
    throw new Error(`Failed to delete location: ${error}`)
  }
}

/**
 * Delete multiple locations from Airtable
 * Note: Airtable API allows deleting up to 10 records per request
 */
export async function deleteLocations(recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) {
    return
  }

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
      throw new Error(`Failed to delete locations: ${error}`)
    }
  }
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

