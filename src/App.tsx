import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/toast';
import { GuestRoute, ProtectedRoute } from '@/components/ProtectedRoute';
import { AppIndexRedirect, OrgLayout, PlainLayout } from '@/layouts/AppLayout';
import { PublicOrgLayout } from '@/layouts/PublicOrgLayout';
import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage';
import { OverviewPage } from '@/pages/admin/OverviewPage';
import { PagesPage } from '@/pages/admin/PagesPage';
import { PageEditorPage } from '@/pages/admin/PageEditorPage';
import { AnnouncementsPage } from '@/pages/admin/AnnouncementsPage';
import { DocumentsPage } from '@/pages/admin/DocumentsPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';
import { OrganizationsPage } from '@/pages/admin/OrganizationsPage';
import { AccountPage } from '@/pages/admin/AccountPage';
import { LandingPage } from '@/pages/public/LandingPage';
import { OrgHomePage } from '@/pages/public/OrgHomePage';
import { PublicPageView } from '@/pages/public/PublicPageView';
import { PublicAnnouncementsPage } from '@/pages/public/PublicAnnouncementsPage';
import { PublicDocumentsPage } from '@/pages/public/PublicDocumentsPage';
import { PublicSearchPage } from '@/pages/public/PublicSearchPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/o/:orgSlug" element={<PublicOrgLayout />}>
              <Route index element={<OrgHomePage />} />
              <Route path="pages/:pageSlug" element={<PublicPageView />} />
              <Route path="announcements" element={<PublicAnnouncementsPage />} />
              <Route path="documents" element={<PublicDocumentsPage />} />
              <Route path="search" element={<PublicSearchPage />} />
            </Route>

            {/* Auth */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<SignInPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Dashboard */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppIndexRedirect />} />
              <Route path="/app/:orgSlug" element={<OrgLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="pages" element={<PagesPage />} />
                <Route path="pages/:pageId" element={<PageEditorPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit" element={<AuditLogPage />} />
              </Route>
              <Route element={<PlainLayout />}>
                <Route path="/account" element={<AccountPage />} />
                <Route path="/platform/organizations" element={<OrganizationsPage />} />
              </Route>
            </Route>

            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
