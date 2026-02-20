import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastTest } from './components/ToastTest'
import { LoginForm } from './components/forms/LoginForm'
import { MainLayout } from './components/layout/MainLayout'
import { Toaster } from './components/ui/toaster'
import { AuthProvider } from './contexts/AuthContext'
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

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <Routes>
          {/* Public route - Login */}
          <Route
            path="/login"
            element={
              <div className="flex min-h-screen items-center bg-background">
                <LoginForm />
              </div>
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

          {/* Articles routes */}
          <Route
            path="/articles"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Articles />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/articles/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateArticle />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/articles/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ArticleDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/articles/:id/edit"
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

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster />
      </UserProvider>
    </AuthProvider>
  )
}

export default App
