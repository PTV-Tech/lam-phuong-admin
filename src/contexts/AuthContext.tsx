import { createContext, useContext, useState, type ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user is already logged in (from localStorage)
    return localStorage.getItem('isAuthenticated') === 'true'
  })

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

  const logout = () => {
    localStorage.removeItem('isAuthenticated')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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

