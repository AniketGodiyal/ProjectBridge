import { LayoutDashboard, Building2 } from 'lucide-react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';

const navItems: NavItem[] = [
  { label: 'Overview', to: '/platform', icon: LayoutDashboard },
  { label: 'Institutions', to: '/platform/institutions', icon: Building2 },
];

export function PlatformDashboard() {
  return <DashboardShell navItems={navItems} roleLabel="Platform Administrator" />;
}
