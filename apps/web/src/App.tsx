import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import TrialSignupPage from '@/pages/TrialSignupPage';
import TrialWelcomePage from '@/pages/TrialWelcomePage';
import TrialOnboardingPage from '@/pages/TrialOnboardingPage';
import FirstChecksReadyPage from '@/pages/FirstChecksReadyPage';
import FirstChecksCelebrationPage from '@/pages/FirstChecksCelebrationPage';
import Dashboard from '@/pages/Dashboard';
import VideosPage from '@/pages/VideosPage';
import VideoUploadPage from '@/pages/VideoUploadPage';
import VideoDetailPage from '@/pages/VideoDetailPage';
import InspectionsPage from '@/pages/InspectionsPage';
import InspectionDetailPage from '@/pages/InspectionDetailPage';
import ActionItemsPage from '@/pages/ActionItemsPage';
import BrandsPage from '@/pages/BrandsPage';
import StoresPage from '@/pages/StoresPage';
import UsersPage from '@/pages/UsersPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import MobileCapturePage from '@/pages/MobileCapturePage';
import InspectorQueuePage from '@/pages/InspectorQueuePage';
import ProcessingPage from '@/pages/ProcessingPage';
import AdminQueuePage from '@/pages/AdminQueuePage';
import MicroCheckInvitePage from '@/pages/MicroCheckInvitePage';
import MicroCheckPage from '@/pages/MicroCheckPage';
import MicroCheckHistoryPage from '@/pages/MicroCheckHistoryPage';
import MicroCheckTemplatesPage from '@/pages/MicroCheckTemplatesPage';
import InsightsPage from '@/pages/InsightsPage';
import ProfilePage from '@/pages/ProfilePage';
import LockedFeatureView from '@/components/LockedFeatureView';
import { MobileCaptureProvider } from '@/pages/MobileCaptureContext';
function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <MobileCaptureProvider>
      <Routes>
        {/* Magic link routes - no auth required */}
        <Route path="/check/:token" element={<MicroCheckInvitePage />} />
        <Route path="/micro-check" element={<MicroCheckPage />} />

        {/* Auth routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/trial-signup" element={isAuthenticated ? <Navigate to="/" replace /> : <TrialSignupPage />} />

        {/* Trial onboarding flow */}
        <Route path="/welcome" element={isAuthenticated ? <TrialWelcomePage /> : <Navigate to="/login" replace />} />
        <Route path="/onboarding" element={isAuthenticated ? <TrialOnboardingPage /> : <Navigate to="/login" replace />} />
        <Route path="/first-checks-ready" element={isAuthenticated ? <FirstChecksReadyPage /> : <Navigate to="/login" replace />} />
        <Route path="/celebration" element={isAuthenticated ? <FirstChecksCelebrationPage /> : <Navigate to="/login" replace />} />

        {/* Full-screen authenticated routes (no layout) */}
        <Route
          path="/capture"
          element={isAuthenticated ? <MobileCapturePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/processing/:uploadId"
          element={isAuthenticated ? <ProcessingPage /> : <Navigate to="/login" replace />}
        />

        {/* Regular authenticated routes (with layout) */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/videos"
          element={
            isAuthenticated ? (
              <Layout>
                <VideosPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/videos/upload"
          element={
            isAuthenticated ? (
              <Layout>
                <VideoUploadPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/videos/:id"
          element={
            isAuthenticated ? (
              <Layout>
                <VideoDetailPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/inspections"
          element={
            isAuthenticated ? (
              <Layout>
                <InspectionsPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/inspections/:id"
          element={
            isAuthenticated ? (
              <Layout>
                <InspectionDetailPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/actions"
          element={
            isAuthenticated ? (
              <Layout>
                <ActionItemsPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/brands"
          element={
            isAuthenticated ? (
              <Layout>
                <BrandsPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/stores"
          element={
            isAuthenticated ? (
              <Navigate to="/profile" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/users"
          element={
            isAuthenticated ? (
              <Layout>
                <UsersPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/inspector-queue"
          element={
            isAuthenticated ? (
              <Layout>
                <InspectorQueuePage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin/queue"
          element={
            isAuthenticated ? (
              <Layout>
                <AdminQueuePage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin/users"
          element={
            isAuthenticated ? (
              <Layout>
                <AdminUsersPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/micro-check-history"
          element={
            isAuthenticated ? (
              <Layout>
                <MicroCheckHistoryPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/micro-check-templates"
          element={
            isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'OWNER' || user?.role === 'GM') ? (
              <Layout>
                <MicroCheckTemplatesPage />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/insights"
          element={
            isAuthenticated ? (
              <Layout>
                <InsightsPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <Layout>
                <ProfilePage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/locked/:featureKey"
          element={
            isAuthenticated ? (
              <Layout>
                <LockedFeatureView />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </MobileCaptureProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;