import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import TrialSignupPage from '@/pages/TrialSignupPage';
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
import { MobileCaptureProvider } from '@/pages/MobileCaptureContext';
import DemoModeIndicator from '@/components/DemoModeIndicator';
function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Unauthenticated routes (magic links, public pages)
  return (
    <Routes>
      {/* Magic link routes - no auth required */}
      <Route path="/check/:token" element={<MicroCheckInvitePage />} />
      <Route path="/micro-check" element={<MicroCheckPage />} />

      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/trial-signup" element={<TrialSignupPage />} />

      {/* Authenticated routes */}
      {isAuthenticated ? (
        <Route
          path="/*"
          element={
            <MobileCaptureProvider>
              <Routes>
                {/* Mobile capture route - full screen without layout */}
                <Route path="/capture" element={<MobileCapturePage />} />

                {/* Processing page - full screen without layout */}
                <Route path="/processing/:uploadId" element={<ProcessingPage />} />

                {/* Regular routes with layout */}
                <Route
                  path="/*"
                  element={
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/videos" element={<VideosPage />} />
                        <Route path="/videos/upload" element={<VideoUploadPage />} />
                        <Route path="/videos/:id" element={<VideoDetailPage />} />
                        <Route path="/inspections" element={<InspectionsPage />} />
                        <Route path="/inspections/:id" element={<InspectionDetailPage />} />
                        <Route path="/actions" element={<ActionItemsPage />} />
                        <Route path="/brands" element={<BrandsPage />} />
                        <Route path="/stores" element={<StoresPage />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/inspector-queue" element={<InspectorQueuePage />} />
                        <Route path="/admin/queue" element={<AdminQueuePage />} />
                        <Route path="/admin/users" element={<AdminUsersPage />} />
                        <Route path="/micro-check-history" element={<MicroCheckHistoryPage />} />
                        <Route path="/login" element={<Navigate to="/" replace />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Layout>
                  }
                />
              </Routes>
            </MobileCaptureProvider>
          }
        />
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

function App() {
  // Check if demo mode is enabled (could be from env variable or API)
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || 
                     window.location.hostname.includes('demo') ||
                     window.location.hostname.includes('getpeakops');

  return (
    <AuthProvider>
      {isDemoMode && <DemoModeIndicator />}
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;