import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminRoute } from './components/SuperAdminRoute'
import { ToastTest } from './components/ToastTest'
import { LoginForm } from './components/forms/LoginForm'
import { MainLayout } from './components/layout/MainLayout'
import { Toaster } from './components/ui/toaster'
import { AuthProvider } from './contexts/AuthContext'
import { SiteProvider } from './contexts/SiteContext'
import { UserProvider } from './contexts/UserContext'
import { ArticleDetail } from './pages/ArticleDetail'
import { CreateArticle, EditArticle } from './pages/ArticleForm'
import { Articles } from './pages/Articles'
import { Dashboard } from './pages/Dashboard'
import { Deployment } from './pages/Deployment'
import { DomainSettings } from './pages/DomainSettings'
import { EventDetail } from './pages/EventDetail'
import { CreateEvent, EditEvent } from './pages/EventForm'
import { Events } from './pages/Events'
import { PageDetail } from './pages/PageDetail'
import { CreatePage, EditPage } from './pages/PageForm'
import { Pages } from './pages/Pages'
import { ContactSubmissionDetail } from './pages/ContactSubmissionDetail'
import { ContactSubmissions } from './pages/ContactSubmissions'
import { OfficialDocumentDetail } from './pages/OfficialDocumentDetail'
import { CreateOfficialDocument, EditOfficialDocument } from './pages/OfficialDocumentForm'
import { OfficialDocuments } from './pages/OfficialDocuments'
import { TeamMembers } from './pages/TeamMembers'
import { TeamMemberDetail } from './pages/TeamMemberDetail'
import { CreateTeamMember, EditTeamMember } from './pages/TeamMemberForm'
import { Associations } from './pages/Associations'
import { AssociationDetail } from './pages/AssociationDetail'
import { CreateAssociation, EditAssociation } from './pages/AssociationForm'
import { Compliance } from './pages/Compliance'
import { SiteConfig } from './pages/SiteConfig'
import { SiteConfigEdit } from './pages/SiteConfigEdit'
import { SiteManagement } from './pages/SiteManagement'
import { Alertes } from './pages/Alertes'
import { CreateAlerte, EditAlerte } from './pages/AlerteForm'
import { MediaLibrary } from './pages/MediaLibrary'
import { Users } from './pages/Users'
import { CreateUser, EditUser } from './pages/UserForm'
import { UserDetail } from './pages/UserDetail'
import { AcceptInvitation } from './pages/AcceptInvitation'
import { ForgotPassword } from './pages/ForgotPassword'
import { Profile } from './pages/Profile'
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard'
import { Sites as SuperAdminSites } from './pages/super-admin/Sites'
import { SiteDetail as SuperAdminSiteDetail } from './pages/super-admin/SiteDetail'
import { SiteForm as SuperAdminSiteForm } from './pages/super-admin/SiteForm'
import { SuperAdminUsers } from './pages/super-admin/SuperAdminUsers'

function DefaultRedirect() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.municipality_role === 'super_admin') {
    return <Navigate to="/super-admin" replace />
  }
  return <Navigate to="/dashboard" replace />
}

function LoginPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen items-center bg-background">
      <LoginForm onForgotPassword={() => navigate('/forgot-password')} />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <SiteProvider>
        <Routes>
          {/* Public route - Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Public route - Forgot Password */}
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Public route - Accept Invitation */}
          <Route
            path="/accept-invitation"
            element={<AcceptInvitation />}
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

          {/* Actualités routes */}
          <Route
            path="/actualites"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Articles />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/actualites/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateArticle />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/actualites/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ArticleDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/actualites/:id/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EditArticle />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Events routes */}
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Events />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateEvent />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EventDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/:id/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EditEvent />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Pages routes */}
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

          {/* Messages routes */}
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ContactSubmissions />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ContactSubmissionDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Documents officiels routes */}
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <OfficialDocuments />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateOfficialDocument />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <OfficialDocumentDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents/:id/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EditOfficialDocument />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Team members routes */}
          <Route
            path="/team-members"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TeamMembers />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/team-members/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateTeamMember />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/team-members/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TeamMemberDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/team-members/:id/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EditTeamMember />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Associations routes */}
          <Route
            path="/associations"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Associations />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/associations/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateAssociation />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/associations/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AssociationDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/associations/:id/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EditAssociation />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Alertes routes */}
          <Route
            path="/alertes"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Alertes />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/alertes/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateAlerte />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/alertes/:id/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EditAlerte />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Users routes */}
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Users />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateUser />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <UserDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/:id/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EditUser />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Media library route */}
          <Route
            path="/media"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MediaLibrary />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Compliance route */}
          <Route
            path="/compliance"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Compliance />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Profile route */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Site configuration routes */}
          <Route
            path="/site"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SiteConfig />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/site/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SiteConfigEdit />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Deployment and domain management routes */}
          <Route
            path="/deployment"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Deployment />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/domain"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DomainSettings />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/site-management"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SiteManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Super Admin routes */}
          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <MainLayout>
                  <SuperAdminDashboard />
                </MainLayout>
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/sites"
            element={
              <SuperAdminRoute>
                <MainLayout>
                  <SuperAdminSites />
                </MainLayout>
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/sites/new"
            element={
              <SuperAdminRoute>
                <MainLayout>
                  <SuperAdminSiteForm />
                </MainLayout>
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/sites/:id"
            element={
              <SuperAdminRoute>
                <MainLayout>
                  <SuperAdminSiteDetail />
                </MainLayout>
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/users"
            element={
              <SuperAdminRoute>
                <MainLayout>
                  <SuperAdminUsers />
                </MainLayout>
              </SuperAdminRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<DefaultRedirect />} />

          {/* Catch-all route */}
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
        <Toaster />
        </SiteProvider>
      </UserProvider>
    </AuthProvider>
  )
}

export default App
