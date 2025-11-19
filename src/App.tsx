import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  return (
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
    </AuthProvider>
  )
}

export default App
