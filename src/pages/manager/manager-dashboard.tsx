import { LayoutDashboard, Package, CalendarCheck, AlertTriangle, Bell } from 'lucide-react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';

const navItems: NavItem[] = [
  { label: 'Overview', to: '/manage', icon: LayoutDashboard },
  { label: 'Resources', to: '/manage/resources', icon: Package },
  { label: 'Bookings', to: '/manage/bookings', icon: CalendarCheck },
  { label: 'Incidents', to: '/manage/incidents', icon: AlertTriangle },
  { label: 'Notifications', to: '/manage/notifications', icon: Bell },
];

export function ManagerDashboard() {
  return <DashboardShell navItems={navItems} roleLabel="Resource Manager" />;
}
