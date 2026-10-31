import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { type LucideIcon, Menu, X, Building2, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/logo';
import { DemoRoleSwitcher } from '@/components/demo-role-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface DashboardShellProps {
  navItems: NavItem[];
  roleLabel: string;
}

export function DashboardShell({ navItems, roleLabel }: DashboardShellProps) {
  const { profile, activeOrganization } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = profile?.full_name || 'Guest User';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              active
                ? 'bg-white/10 text-white'
                : 'text-sidebar-foreground hover:bg-white/5 hover:text-white'
            )}
          >
            <span
              className={cn(
                'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent transition-opacity duration-200',
                active ? 'opacity-100' : 'opacity-0'
              )}
            />
            <item.icon className={cn('h-4 w-4 shrink-0 transition-colors', active ? 'text-accent' : 'text-sidebar-foreground/70 group-hover:text-white')} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const UserCard = () => (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-inset ring-white/10">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-white">{displayName}</p>
        <p className="truncate text-xs text-sidebar-foreground/70">{roleLabel}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border/70 bg-card/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <DemoRoleSwitcher compact />
          <Button variant="outline" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-sidebar shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo className="[&>span]:text-white" />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="text-sidebar-foreground hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">{roleLabel}</p>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="p-3">
              <UserCard />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-64 flex-col bg-sidebar lg:flex">
        <div className="px-5 py-6">
          <Logo className="[&>span]:text-white" />
        </div>
        <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">{roleLabel}</p>
        <div className="flex-1 overflow-y-auto py-2">
          <NavLinks />
        </div>
        <div className="p-3">
          <UserCard />
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden items-center justify-between gap-4 border-b border-border/70 bg-card/85 px-8 py-3.5 backdrop-blur-md lg:flex">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Institution</p>
              <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                {activeOrganization?.name ?? 'No institution'}
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <DemoRoleSwitcher />
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div key={location.pathname} className="mx-auto w-full max-w-7xl animate-page-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
