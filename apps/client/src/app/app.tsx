import { Routes, Route, Navigate } from 'react-router-dom';

import GlobalAuditPage from '@/app/routes/dashboard/admin/audit';
import { DashboardLayout } from '@/app/routes/dashboard/dashboard-layout';
import AnalyticsPage from '@/app/routes/dashboard/manager/analytics';
import ManagerOverviewPage from '@/app/routes/dashboard/manager/overview';
import ScheduleManagerPage from '@/app/routes/dashboard/manager/schedule';
import StaffPage from '@/app/routes/dashboard/manager/staff';
import NotificationsPage from '@/app/routes/dashboard/notifications';
import SettingsPage from '@/app/routes/dashboard/settings';
import StaffOverviewPage from '@/app/routes/dashboard/staff/overview';
import SwapMarketplace from '@/app/routes/dashboard/staff/swaps';
import LandingPage from '@/app/routes/landing';
import LoginPage from '@/app/routes/login';

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
