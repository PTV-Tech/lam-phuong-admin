/**
 * Airtable OAuth 2.0 implementation with PKCE
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
 * Generate PKCE code verifier (random string)
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

/**
 * Base64 URL encode (without padding)
 */
function base64URLEncode(buffer: Uint8Array): string {
  const bytes = Array.from(buffer)
  const binary = String.fromCharCode(...bytes)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generate PKCE code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(hash))
}

/**
 * Generate the authorization URL for Airtable OAuth
 */
export async function getAirtableAuthUrl(): Promise<string> {
  const { clientId, redirectUri } = getAirtableConfig()
  
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  // Store code verifier for later use in token exchange
  sessionStorage.setItem('airtable_code_verifier', codeVerifier)
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'schema.bases:read schema.bases:write data.records:read data.records:write',
    state: generateState(),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
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
  return storedState === state
}

/**
 * Clear the stored OAuth state after successful verification
 */
export function clearOAuthState(): void {
  sessionStorage.removeItem('airtable_oauth_state')
  sessionStorage.removeItem('airtable_code_verifier')
}

/**
 * Get token exchange endpoint based on environment
 */
function getTokenEndpoint(): string {
  // Development: Dùng Vite proxy
  if (import.meta.env.DEV) {
    return '/api/airtable/oauth2/v1/token'
  }
  
  // Production: Dùng serverless function hoặc backend API
  // Bạn cần deploy một trong các options bên dưới
  return AIRTABLE_OAUTH_BASE_URL || '/api/airtable-token'
}


/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<AirtableTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getAirtableConfig()
  
  // Get the stored code verifier
  const codeVerifier = sessionStorage.getItem('airtable_code_verifier')
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the OAuth flow.')
  }
  
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  }
  
  // Only add client_secret if it exists (optional for PKCE)
  if (clientSecret) {
    body.client_secret = clientSecret
  }

  const endpoint = getTokenEndpoint();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
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

  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  }
  
  if (clientSecret) {
    body.client_secret = clientSecret
  }

  const endpoint = getTokenEndpoint();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
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
  console.log('[getAirtableUserInfo] Calling whoami API endpoint...')
  const response = await fetch(`${AIRTABLE_API_BASE_URL}/meta/whoami`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[getAirtableUserInfo] API call failed:', error)
    throw new Error(`Failed to get user info: ${error}`)
  }

  const data = await response.json()
  console.log('[getAirtableUserInfo] API call successful')
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