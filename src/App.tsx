import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

import { StudentDashboard } from '@/pages/student/student-dashboard';
import { StudentOverview } from '@/pages/student/overview';
import { AIPlannerPage } from '@/pages/student/ai-planner';
import { ResourceFinderPage } from '@/pages/student/resource-finder';
import { ResourceDetailsPage } from '@/pages/student/resource-details';
import { MyBookingsPage } from '@/pages/student/bookings';
import { MyProjectsPage } from '@/pages/student/projects';
import { NotificationsPage } from '@/pages/student/notifications';
import { ProfilePage } from '@/pages/student/profile';

import { ManagerDashboard } from '@/pages/manager/manager-dashboard';
import { ManagerOverview } from '@/pages/manager/overview';
import { ManageResourcesPage } from '@/pages/manager/resources';
import { ResourceEditorPage } from '@/pages/manager/resource-editor';
import { ManagerBookingsPage } from '@/pages/manager/bookings';
import { ManagerIncidentsPage } from '@/pages/manager/incidents';

import { AdminDashboard } from '@/pages/admin/admin-dashboard';
import { AdminOverview } from '@/pages/admin/overview';
import { AdminDepartmentsPage } from '@/pages/admin/departments';
import { AdminLabsPage } from '@/pages/admin/labs';
import { AdminStaffPage } from '@/pages/admin/staff';
import { AdminAnalyticsPage } from '@/pages/admin/analytics';
import { AdminAuditPage } from '@/pages/admin/audit';

import { PlatformDashboard } from '@/pages/platform/platform-dashboard';
import { PlatformOverview } from '@/pages/platform/overview';
import { PlatformInstitutionsPage } from '@/pages/platform/institutions';

import { RoleRoute } from '@/components/role-route';
import { DemoBanner } from '@/components/demo-banner';
import { LoadingScreen } from '@/components/loading-screen';
import { Button } from '@/components/ui/button';
import { LandingPage } from '@/pages/landing';

function DemoLoadError({ message }: { message: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="font-display text-xl font-bold">Sample data is unavailable</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {message ?? 'The sample data could not be loaded. Check your connection and try again.'}
      </p>
      <Button onClick={() => window.location.reload()}>Try again</Button>
    </div>
  );
}

const MIN_LOADING_MS = 1800;

function App() {
  const { loading, error, activePersona } = useAuth();
  const [minTimerDone, setMinTimerDone] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimerDone(true), MIN_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  const showLoading = loading || !minTimerDone;

  useEffect(() => {
    if (!showLoading && !fadingOut) {
      setFadingOut(true);
      const t = setTimeout(() => setFadingOut(false), 600);
      return () => clearTimeout(t);
    }
  }, [showLoading, fadingOut]);

  if (showLoading) return <LoadingScreen />;
  if (!activePersona) return <DemoLoadError message={error} />;

  return (
    <div className={fadingOut ? 'animate-dashboard-fade-in' : ''}>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />

        <Route
          path="/dashboard"
          element={
            <RoleRoute roles={['student']}>
              <StudentDashboard />
            </RoleRoute>
          }
        >
          <Route index element={<StudentOverview />} />
          <Route path="planner" element={<AIPlannerPage />} />
          <Route path="resources" element={<ResourceFinderPage />} />
          <Route path="resources/:id" element={<ResourceDetailsPage />} />
          <Route path="bookings" element={<MyBookingsPage />} />
          <Route path="projects" element={<MyProjectsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route
          path="/manage"
          element={
            <RoleRoute roles={['manager', 'institute_admin']}>
              <ManagerDashboard />
            </RoleRoute>
          }
        >
          <Route index element={<ManagerOverview />} />
          <Route path="resources" element={<ManageResourcesPage />} />
          <Route path="resources/new" element={<ResourceEditorPage />} />
          <Route path="resources/:id/edit" element={<ResourceEditorPage />} />
          <Route path="bookings" element={<ManagerBookingsPage />} />
          <Route path="incidents" element={<ManagerIncidentsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RoleRoute roles={['institute_admin']}>
              <AdminDashboard />
            </RoleRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="departments" element={<AdminDepartmentsPage />} />
          <Route path="labs" element={<AdminLabsPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>

        <Route
          path="/platform"
          element={
            <RoleRoute roles={['platform_admin']}>
              <PlatformDashboard />
            </RoleRoute>
          }
        >
          <Route index element={<PlatformOverview />} />
          <Route path="institutions" element={<PlatformInstitutionsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
