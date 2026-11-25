import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import MainLayout from '../shared/layouts/MainLayout.jsx';
import ProtectedRoute from '../shared/components/auth/ProtectedRoute.jsx';
import { useCurrentUser } from '../shared/hooks/useCurrentUser.js';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import HomeHeroPage from '../features/lost_and_found/pages/PublicPortal/HomeHeroPage.jsx';
import ExploreItemsPage from '../features/lost_and_found/pages/PublicPortal/ExploreItemsPage.jsx';
import LeaderboardPage from '../features/lost_and_found/pages/PublicPortal/LeaderboardPage.jsx';
import ReportLostItemPage from '../features/lost_and_found/pages/Student/ReportLostItemPage.jsx';
import ReportFoundItemPage from '../features/lost_and_found/pages/Student/ReportFoundItemPage.jsx';
import MyRecordsPage from '../features/lost_and_found/pages/Student/MyRecordsPage.jsx';
import ClaimGuidePage from '../features/lost_and_found/pages/Student/ClaimGuidePage.jsx';
import AdminDashboardPage from '../features/lost_and_found/pages/Admin/AdminDashboardPage.jsx';
import AdminReportFoundPage from '../features/lost_and_found/pages/Admin/AdminReportFoundPage.jsx';
import AdminProcessClaimPage from '../features/lost_and_found/pages/Admin/AdminProcessClaimPage.jsx';
import AdminItemsDirectoryPage from '../features/lost_and_found/pages/Admin/AdminItemsDirectoryPage.jsx';
import AdminSettingsPage from '../features/lost_and_found/pages/Admin/AdminSettingsPage.jsx';
import AdminUsersPage from '../features/users/pages/AdminUsersPage.jsx';

/**
 * Keeps the Public / Student Portal completely separate from the OSAS Admin workspace:
 * authenticated OSAS Admins hitting student/public portal routes are redirected to /admin/dashboard.
 */
function PublicOrStudentRoute() {
  const { data: user } = useCurrentUser();
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />

      <Route element={<MainLayout />}>
        {/* Public & Student Open Routes (OSAS Admins are routed strictly to /admin/dashboard) */}
        <Route element={<PublicOrStudentRoute />}>
          <Route path="/" element={<HomeHeroPage />} />
          <Route path="/explore" element={<ExploreItemsPage />} />
          <Route path="/claim" element={<ClaimGuidePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Route>

        {/* Authenticated Student-Only Routes */}
        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route path="/report-lost" element={<ReportLostItemPage />} />
          <Route path="/report-found" element={<ReportFoundItemPage />} />
          <Route path="/my-records" element={<MyRecordsPage />} />
        </Route>

        {/* OSAS Admin-Only Workspace */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/report-found" element={<AdminReportFoundPage />} />
          <Route path="/admin/claim" element={<AdminProcessClaimPage />} />
          <Route path="/admin/directory" element={<AdminItemsDirectoryPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
