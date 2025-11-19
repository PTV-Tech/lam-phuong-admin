import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import {
  getAirtableAuthUrl,
  exchangeCodeForToken,
  storeAirtableTokens,
  getStoredAirtableTokens,
  clearAirtableTokens,
  getAirtableUserInfo,
  getValidAccessToken,
  type AirtableUserInfo,
} from '@/lib/airtable-oauth'

interface AuthContextType {
  isAuthenticated: boolean
  user: AirtableUserInfo | null
  login: (email: string, password: string) => Promise<void>
  loginWithAirtable: () => void
  handleAirtableCallback: (code: string, state: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user is already logged in (from localStorage or Airtable tokens)
    const hasLocalAuth = localStorage.getItem('isAuthenticated') === 'true'
    const hasAirtableTokens = getStoredAirtableTokens() !== null
    return hasLocalAuth || hasAirtableTokens
  })

  const [user, setUser] = useState<AirtableUserInfo | null>(() => {
    const storedUser = localStorage.getItem('airtable_user')
    return storedUser ? JSON.parse(storedUser) : null
  })

  // Ref to prevent duplicate calls during StrictMode double render
  const checkingAuthRef = useRef(false)
  const hasCheckedRef = useRef(false)

  // Check for valid Airtable token on mount
  useEffect(() => {
    // Prevent duplicate calls
    if (checkingAuthRef.current || hasCheckedRef.current) {
      console.log('[AuthContext] Already checking auth or already checked, skipping duplicate call')
      return
    }

    const checkAirtableAuth = async () => {
      checkingAuthRef.current = true
      console.log('[AuthContext] Checking Airtable authentication...')

      const tokens = getStoredAirtableTokens()
      if (tokens) {
        try {
          const accessToken = await getValidAccessToken()
          if (accessToken) {
            console.log('[AuthContext] Valid access token found, fetching user info...')
            const userInfo = await getAirtableUserInfo(accessToken)
            console.log('[AuthContext] User info fetched successfully:', userInfo.email)
            setUser(userInfo)
            setIsAuthenticated(true)
          } else {
            // Token expired and refresh failed
            console.log('[AuthContext] Token expired and refresh failed')
            clearAirtableTokens()
            setIsAuthenticated(false)
            setUser(null)
          }
        } catch (error) {
          console.error('[AuthContext] Failed to verify Airtable authentication:', error)
          clearAirtableTokens()
          setIsAuthenticated(false)
          setUser(null)
        }
      } else {
        console.log('[AuthContext] No Airtable tokens found')
      }

      checkingAuthRef.current = false
      hasCheckedRef.current = true
    }

    checkAirtableAuth()
  }, [])

  const login = async (email: string, password: string) => {
    // Simulate API call
    // In a real app, you would make an actual API request here
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // For demo purposes, accept any credentials
    // In production, validate against your backend
    if (email && password) {
      localStorage.setItem('isAuthenticated', 'true')
      setIsAuthenticated(true)
    } else {
      throw new Error('Invalid credentials')
    }
  }

  const loginWithAirtable = async () => {
    try {
      const authUrl = await getAirtableAuthUrl()
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to initiate Airtable OAuth:', error)
      throw error
    }
  }

  const handleAirtableCallback = async (code: string, state: string) => {
    try {
      // Exchange authorization code for tokens
      const tokens = await exchangeCodeForToken(code)
      storeAirtableTokens(tokens)

      // Get user information
      const userInfo = await getAirtableUserInfo(tokens.access_token)
      setUser(userInfo)
      localStorage.setItem('airtable_user', JSON.stringify(userInfo))
      
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Failed to complete Airtable OAuth:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('isAuthenticated')
    clearAirtableTokens()
    localStorage.removeItem('airtable_user')
    setIsAuthenticated(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user,
      login, 
      loginWithAirtable,
      handleAirtableCallback,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

