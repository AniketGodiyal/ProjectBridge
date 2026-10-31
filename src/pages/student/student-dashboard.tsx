import { LayoutDashboard, Brain, Search, CalendarCheck, FolderKanban, Bell, User } from 'lucide-react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';

const navItems: NavItem[] = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Project Planner', to: '/dashboard/planner', icon: Brain },
  { label: 'Find Resources', to: '/dashboard/resources', icon: Search },
  { label: 'My Bookings', to: '/dashboard/bookings', icon: CalendarCheck },
  { label: 'My Projects', to: '/dashboard/projects', icon: FolderKanban },
  { label: 'Notifications', to: '/dashboard/notifications', icon: Bell },
  { label: 'Profile', to: '/dashboard/profile', icon: User },
];

export function StudentDashboard() {
  return <DashboardShell navItems={navItems} roleLabel="Student" />;
}
