import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LocationsPage } from '@/pages/LocationsPage'
import { ProductGroupsPage } from '@/pages/ProductGroupsPage'
import { JobCategoriesPage } from '@/pages/JobCategoriesPage'
import { JobTypesPage } from '@/pages/JobTypesPage'
import { JobPostingsPage } from '@/pages/JobPostingsPage'
import { JobPostingFormPage } from '@/pages/JobPostingFormPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'

// Create a QueryClient with default options optimized for caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes - data is considered fresh
      gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in memory cache
      refetchOnWindowFocus: false, // Don't refetch when user returns to tab
      refetchOnReconnect: false, // Don't refetch on network reconnect
      retry: (failureCount, error) => {
        // Don't retry on rate limit errors immediately
        if (error instanceof Error && error.message.includes('RATE_LIMIT')) {
          return failureCount < 3 // Retry up to 3 times with exponential backoff
        }
        return failureCount < 2 // Retry up to 2 times for other errors
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s
        return Math.min(1000 * Math.pow(2, attemptIndex), 4000)
      },
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <LocationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/product-groups"
            element={
              <ProtectedRoute>
                <ProductGroupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-categories"
            element={
              <ProtectedRoute>
                <JobCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-types"
            element={
              <ProtectedRoute>
                <JobTypesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-postings"
            element={
              <ProtectedRoute>
                <JobPostingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-postings/new"
            element={
              <ProtectedRoute>
                <JobPostingFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-postings/:id/edit"
            element={
              <ProtectedRoute>
                <JobPostingFormPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
