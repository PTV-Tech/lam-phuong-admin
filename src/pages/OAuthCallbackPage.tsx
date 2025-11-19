import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { verifyState, clearOAuthState } from '@/lib/airtable-oauth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// ✅ Global cache để track codes đã xử lý
const processedCodes = new Set<string>()

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleAirtableCallback } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const hasStarted = useRef(false)

  useEffect(() => {
    // ✅ Chặn nếu đã bắt đầu xử lý trong instance này
    if (hasStarted.current) {
      console.log('🛑 Already started in this instance')
      return
    }

    const processCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const errorParam = searchParams.get('error')

        console.log('🔍 Callback received:', { 
          code: code?.substring(0, 10) + '...', 
          state: state?.substring(0, 10) + '...' 
        })

        if (errorParam) {
          setError(`OAuth error: ${errorParam}`)
          setLoading(false)
          clearOAuthState()
          return
        }

        if (!code || !state) {
          setError('Missing authorization code or state parameter')
          setLoading(false)
          clearOAuthState()
          return
        }

        // ✅ Check if this code was already processed GLOBALLY
        if (processedCodes.has(code)) {
          console.log('🛑 Code already processed globally, skipping...')
          // Chờ 1 giây rồi redirect (trường hợp lần 1 đang xử lý)
          setTimeout(() => {
            navigate('/dashboard', { replace: true })
          }, 1000)
          return
        }

        // ✅ Mark code as being processed IMMEDIATELY
        console.log('✅ Marking code as processing')
        processedCodes.add(code)
        hasStarted.current = true

        // Verify state
        if (!verifyState(state)) {
          setError('Invalid state parameter. Possible CSRF attack.')
          setLoading(false)
          clearOAuthState()
          processedCodes.delete(code) // Remove from cache on error
          return
        }

        console.log('🔄 Exchanging code for token...')
        await handleAirtableCallback(code, state)
        
        console.log('✅ Success! Cleaning up and redirecting...')
        clearOAuthState()
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('❌ OAuth callback error:', err)
        setError(err instanceof Error ? err.message : 'Failed to complete authentication')
        setLoading(false)
        clearOAuthState()
        
        // Remove code from cache on error so user can retry
        const code = searchParams.get('code')
        if (code) {
          processedCodes.delete(code)
        }
      }
    }

    processCallback()
  }, [searchParams, handleAirtableCallback, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Completing Sign In...
            </CardTitle>
            <CardDescription className="text-center">
              Please wait while we complete your Airtable authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-destructive">
              Authentication Failed
            </CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => {
                // ✅ Clear cache khi user retry
                const code = searchParams.get('code')
                if (code) processedCodes.delete(code)
                navigate('/login')
              }}
              className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Return to Login
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}