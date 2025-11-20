import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'

// Lazy load heavy pages for code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const LocationsPage = lazy(() => import('@/pages/LocationsPage').then(m => ({ default: m.LocationsPage })))
const ProductGroupsPage = lazy(() => import('@/pages/ProductGroupsPage').then(m => ({ default: m.ProductGroupsPage })))
const JobCategoriesPage = lazy(() => import('@/pages/JobCategoriesPage').then(m => ({ default: m.JobCategoriesPage })))
const JobTypesPage = lazy(() => import('@/pages/JobTypesPage').then(m => ({ default: m.JobTypesPage })))
const JobPostingsPage = lazy(() => import('@/pages/JobPostingsPage').then(m => ({ default: m.JobPostingsPage })))
const JobPostingFormPage = lazy(() => import('@/pages/JobPostingFormPage').then(m => ({ default: m.JobPostingFormPage })))

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
  </div>
)

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
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <LocationsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/product-groups"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ProductGroupsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-categories"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <JobCategoriesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-types"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <JobTypesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-postings"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <JobPostingsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-postings/new"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <JobPostingFormPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-postings/:id/edit"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <JobPostingFormPage />
                </Suspense>
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
