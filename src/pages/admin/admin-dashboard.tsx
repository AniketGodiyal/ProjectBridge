import { LayoutDashboard, Building2, FlaskConical, Users, BarChart3, Shield } from 'lucide-react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';

const navItems: NavItem[] = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard },
  { label: 'Departments', to: '/admin/departments', icon: Building2 },
  { label: 'Labs & Spaces', to: '/admin/labs', icon: FlaskConical },
  { label: 'Staff', to: '/admin/staff', icon: Users },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { label: 'Audit Log', to: '/admin/audit', icon: Shield },
];

export function AdminDashboard() {
  return <DashboardShell navItems={navItems} roleLabel="Institute Administrator" />;
}
