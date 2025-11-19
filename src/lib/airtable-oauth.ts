/**
 * Airtable OAuth 2.0 implementation
 * Reference: https://airtable.com/developers/web/api/oauth-reference
 */

const AIRTABLE_OAUTH_BASE_URL = 'https://airtable.com/oauth2/v1'
const AIRTABLE_API_BASE_URL = 'https://api.airtable.com/v0'

export interface AirtableTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export interface AirtableUserInfo {
  id: string
  email: string
  name: string
}

/**
 * Get Airtable OAuth configuration from environment variables
 */
function getAirtableConfig() {
  const clientId = import.meta.env.VITE_AIRTABLE_CLIENT_ID
  const clientSecret = import.meta.env.VITE_AIRTABLE_CLIENT_SECRET
  const redirectUri = import.meta.env.VITE_AIRTABLE_REDIRECT_URI || `${window.location.origin}/oauth/callback`

  if (!clientId) {
    throw new Error('VITE_AIRTABLE_CLIENT_ID is not configured')
  }

  return { clientId, clientSecret, redirectUri }
}

/**
 * Generate the authorization URL for Airtable OAuth
 */
export function getAirtableAuthUrl(): string {
  const { clientId, redirectUri } = getAirtableConfig()
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'schema.bases:read schema.bases:write data.records:read data.records:write',
    state: generateState(),
  })

  return `${AIRTABLE_OAUTH_BASE_URL}/authorize?${params.toString()}`
}

/**
 * Generate a random state parameter for OAuth security
 */
function generateState(): string {
  const state = crypto.randomUUID()
  sessionStorage.setItem('airtable_oauth_state', state)
  return state
}

/**
 * Verify the state parameter matches the one we stored
 */
export function verifyState(state: string): boolean {
  const storedState = sessionStorage.getItem('airtable_oauth_state')
  sessionStorage.removeItem('airtable_oauth_state')
  return storedState === state
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<AirtableTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getAirtableConfig()

  const response = await fetch(`${AIRTABLE_OAUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      ...(clientSecret && { client_secret: clientSecret }),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for token: ${error}`)
  }

  return response.json()
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AirtableTokenResponse> {
  const { clientId, clientSecret } = getAirtableConfig()

  const response = await fetch(`${AIRTABLE_OAUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      ...(clientSecret && { client_secret: clientSecret }),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }

  return response.json()
}

/**
 * Get user information from Airtable API
 */
export async function getAirtableUserInfo(accessToken: string): Promise<AirtableUserInfo> {
  const response = await fetch(`${AIRTABLE_API_BASE_URL}/meta/whoami`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user info: ${error}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    email: data.email,
    name: data.name || data.email,
  }
}

/**
 * Store tokens in localStorage
 */
export function storeAirtableTokens(tokens: AirtableTokenResponse): void {
  const tokenData = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    tokenType: tokens.token_type,
    scope: tokens.scope,
  }
  localStorage.setItem('airtable_tokens', JSON.stringify(tokenData))
}

/**
 * Get stored tokens from localStorage
 */
export function getStoredAirtableTokens(): {
  accessToken: string
  refreshToken: string
  expiresAt: number
  tokenType: string
  scope: string
} | null {
  const stored = localStorage.getItem('airtable_tokens')
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Check if access token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(tokens: { expiresAt: number } | null): boolean {
  if (!tokens) return true
  // Consider token expired if it expires within 5 minutes
  return Date.now() >= tokens.expiresAt - 5 * 60 * 1000
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredAirtableTokens()
  if (!tokens) return null

  if (isTokenExpired(tokens)) {
    try {
      const newTokens = await refreshAccessToken(tokens.refreshToken)
      storeAirtableTokens(newTokens)
      return newTokens.access_token
    } catch (error) {
      console.error('Failed to refresh token:', error)
      clearAirtableTokens()
      return null
    }
  }

  return tokens.accessToken
}

/**
 * Clear stored tokens
 */
export function clearAirtableTokens(): void {
  localStorage.removeItem('airtable_tokens')
}

