import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Search, CalendarCheck, FolderKanban, Bell, Inbox, Clock, Package, ArrowRight, Hourglass, CalendarDays } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, formatDateTime, timeAgo } from '@/lib/constants';
import type { Booking, Notification, SavedProject } from '@/lib/types';

export function StudentOverview() {
  const { user, activeOrgId, profile } = useAuth();
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [pending, setPending] = useState<Booking[]>([]);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [bookingsRes, notifsRes, projectsRes] = await Promise.all([
        supabase.from('bookings').select('*, resource:resources(*), organization:organizations(*)').eq('user_id', user.id).order('start_time', { ascending: true }),
        supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('saved_projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(3),
      ]);
      const allBookings = (bookingsRes.data as Booking[] | null) ?? [];
      const now = new Date().toISOString();
      setUpcoming(allBookings.filter((b) => ['approved', 'checked_in'].includes(b.status) && b.start_time >= now).slice(0, 5));
      setPending(allBookings.filter((b) => b.status === 'pending').slice(0, 5));
      setProjects((projectsRes.data as SavedProject[] | null) ?? []);
      setNotifs((notifsRes.data as Notification[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [user, activeOrgId]);

  if (!activeOrgId) {
    return (
      <EmptyState
        icon={Inbox}
        title="No institution membership yet"
        description="Your institution could not be found. Try reloading the page."
      />
    );
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { icon: CalendarDays, label: 'Upcoming', value: upcoming.length, tone: 'text-accent bg-accent/10' },
    { icon: Hourglass, label: 'Awaiting approval', value: pending.length, tone: 'text-amber-700 bg-amber-100/70' },
    { icon: Bell, label: 'Unread alerts', value: notifs.length, tone: 'text-sky-700 bg-sky-100/70' },
    { icon: FolderKanban, label: 'Saved projects', value: projects.length, tone: 'text-primary bg-primary/10' },
  ];

  const quickActions = [
    { icon: Search, label: 'Find Resources', to: '/dashboard/resources', desc: 'Search equipment, labs and spaces' },
    { icon: Brain, label: 'Plan a Project', to: '/dashboard/planner', desc: 'Get AI-assisted resource plans' },
    { icon: CalendarCheck, label: 'My Bookings', to: '/dashboard/bookings', desc: 'Review and manage your requests' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-1">
        <p className="eyebrow">{greeting}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground">Here is what is happening with your resource activity.</p>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="transition-shadow duration-300 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-2xl font-semibold tabular-nums text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {quickActions.map((a) => (
          <Link key={a.to} to={a.to} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-lg">
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <a.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">{a.label}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{a.desc}</p>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pb-2 pt-5">
            <CardTitle className="text-base font-semibold text-primary">Upcoming bookings</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-accent hover:text-accent"><Link to="/dashboard/bookings">View all</Link></Button>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {upcoming.length === 0 ? (
              <EmptyState icon={Clock} title="No upcoming bookings" description="Book a resource to see it here." action={<Button size="sm" asChild><Link to="/dashboard/resources">Find resources</Link></Button>} />
            ) : (
              <ul className="divide-y divide-border/70">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-accent/[0.04]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{b.resource?.name || 'Resource'}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(b.start_time)}</p>
                    </div>
                    <Badge className={BOOKING_STATUS_COLORS[b.status]} variant="outline">{BOOKING_STATUS_LABELS[b.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pb-2 pt-5">
            <CardTitle className="text-base font-semibold text-primary">Pending requests</CardTitle>
            <Badge variant="secondary">{pending.length}</Badge>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {pending.length === 0 ? (
              <EmptyState icon={Package} title="No pending requests" description="Booking requests awaiting approval will appear here." />
            ) : (
              <ul className="divide-y divide-border/70">
                {pending.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-accent/[0.04]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{b.resource?.name || 'Resource'}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(b.start_time)}</p>
                    </div>
                    <Badge className={BOOKING_STATUS_COLORS.pending} variant="outline">Pending</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pb-2 pt-5">
            <CardTitle className="text-base font-semibold text-primary">Recent notifications</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-accent hover:text-accent"><Link to="/dashboard/notifications">View all</Link></Button>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {notifs.length === 0 ? (
              <EmptyState icon={Bell} title="No new notifications" />
            ) : (
              <ul className="divide-y divide-border/70">
                {notifs.map((n) => (
                  <li key={n.id} className="py-3 transition-colors hover:bg-accent/[0.04]">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pb-2 pt-5">
            <CardTitle className="text-base font-semibold text-primary">Recent projects</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-accent hover:text-accent"><Link to="/dashboard/projects">View all</Link></Button>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {projects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="No saved projects" description="Use the AI planner to generate and save resource plans." action={<Button size="sm" asChild><Link to="/dashboard/planner">Plan a project</Link></Button>} />
            ) : (
              <ul className="divide-y divide-border/70">
                {projects.map((p) => (
                  <li key={p.id} className="py-3 transition-colors hover:bg-accent/[0.04]">
                    <p className="text-sm font-medium text-foreground">{p.title}</p>
                    {p.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{p.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Updated {timeAgo(p.updated_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
