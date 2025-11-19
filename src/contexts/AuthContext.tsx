import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
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

  // Check for valid Airtable token on mount
  useEffect(() => {
    const checkAirtableAuth = async () => {
      const tokens = getStoredAirtableTokens()
      if (tokens) {
        try {
          const accessToken = await getValidAccessToken()
          if (accessToken) {
            const userInfo = await getAirtableUserInfo(accessToken)
            setUser(userInfo)
            setIsAuthenticated(true)
          } else {
            // Token expired and refresh failed
            clearAirtableTokens()
            setIsAuthenticated(false)
            setUser(null)
          }
        } catch (error) {
          console.error('Failed to verify Airtable authentication:', error)
          clearAirtableTokens()
          setIsAuthenticated(false)
          setUser(null)
        }
      }
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

