import { Box } from '@chakra-ui/react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastTest } from './components/ToastTest'
import { LoginForm } from './components/forms/LoginForm'
import { MainLayout } from './components/layout/MainLayout'
import { Toaster } from './components/ui/toaster'
import { AuthProvider } from './contexts/AuthContext'
import { Dashboard } from './pages/Dashboard'
import { PageDetail } from './pages/PageDetail'
import { CreatePage, EditPage } from './pages/PageForm'
import { Pages } from './pages/Pages'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public route - Login */}
        <Route
          path="/login"
          element={
            <Box minH="100vh" bg="gray.50" display="flex" alignItems="center">
              <LoginForm />
            </Box>
          }
        />

        {/* Public route - Toast Test */}
        <Route
          path="/toast-test"
          element={<ToastTest />}
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Placeholder protected routes */}
        <Route
          path="/articles"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Box>
                  <h1>Articles</h1>
                  <p>Gestion des articles (à implémenter)</p>
                </Box>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pages"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Pages />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pages/new"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CreatePage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pages/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PageDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pages/:id/edit"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EditPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Box>
                  <h1>Événements</h1>
                  <p>Gestion des événements (à implémenter)</p>
                </Box>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/site"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Box>
                  <h1>Configuration du site</h1>
                  <p>Configuration du site (à implémenter)</p>
                </Box>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Box>
                  <h1>Utilisateurs</h1>
                  <p>Gestion des utilisateurs (à implémenter)</p>
                </Box>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  )
}

export default App
