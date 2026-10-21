import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard-layout';
import LandingPage from '@/pages/landing';
import LoginPage from '@/pages/login';
import ManagerOverviewPage from '@/pages/dashboard/manager/overview';
import ScheduleManagerPage from '@/pages/dashboard/manager/schedule';
import StaffPage from '@/pages/dashboard/manager/staff';
import AnalyticsPage from '@/pages/dashboard/manager/analytics';
import StaffOverviewPage from '@/pages/dashboard/staff/overview';
import SwapMarketplace from '@/pages/dashboard/staff/swaps';
import GlobalAuditPage from '@/pages/dashboard/admin/audit';
import NotificationsPage from '@/pages/dashboard/notifications';
import SettingsPage from '@/pages/dashboard/settings';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard/manager" element={<ManagerOverviewPage />} />
        <Route
          path="/dashboard/manager/schedule"
          element={<ScheduleManagerPage />}
        />
        <Route path="/dashboard/manager/staff" element={<StaffPage />} />
        <Route
          path="/dashboard/manager/analytics"
          element={<AnalyticsPage />}
        />
        <Route path="/dashboard/staff" element={<StaffOverviewPage />} />
        <Route path="/dashboard/staff/swaps" element={<SwapMarketplace />} />
        <Route path="/dashboard/admin/audit" element={<GlobalAuditPage />} />
        <Route
          path="/dashboard/notifications"
          element={<NotificationsPage />}
        />
        <Route path="/dashboard/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
