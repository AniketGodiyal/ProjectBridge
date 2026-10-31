import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FlaskConical, Package, Wrench, Clock, AlertTriangle, CalendarCheck, ArrowRight, Layers } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';

export function AdminOverview() {
  const { activeOrgId } = useAuth();
  const [stats, setStats] = useState({ depts: 0, labs: 0, resources: 0, maintenance: 0, pendingBookings: 0, upcoming: 0, incidents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeOrgId) { setLoading(false); return; }
      const [d, l, r, mb, pb, ub, inc] = await Promise.all([
        supabase.from('departments').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId),
        supabase.from('labs').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId),
        supabase.from('resources').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId),
        supabase.from('resources').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId).eq('operational_status', 'maintenance'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId).eq('status', 'pending'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId).in('status', ['approved', 'checked_in']),
        supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId),
      ]);
      setStats({
        depts: d.count || 0, labs: l.count || 0, resources: r.count || 0, maintenance: mb.count || 0,
        pendingBookings: pb.count || 0, upcoming: ub.count || 0, incidents: inc.count || 0,
      });
      setLoading(false);
    }
    load();
  }, [activeOrgId]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  if (!activeOrgId) return <EmptyState icon={Building2} title="No institution selected" />;

  const cards = [
    { icon: Building2, label: 'Departments', value: stats.depts, tone: 'bg-primary/10 text-primary' },
    { icon: FlaskConical, label: 'Labs & Spaces', value: stats.labs, tone: 'bg-teal-50 text-teal-700' },
    { icon: Package, label: 'Resources', value: stats.resources, tone: 'bg-sky-50 text-sky-700' },
    { icon: Wrench, label: 'Under Maintenance', value: stats.maintenance, tone: 'bg-amber-50 text-amber-700' },
    { icon: Clock, label: 'Pending Requests', value: stats.pendingBookings, tone: 'bg-orange-50 text-orange-700' },
    { icon: CalendarCheck, label: 'Upcoming Bookings', value: stats.upcoming, tone: 'bg-emerald-50 text-emerald-700' },
    { icon: AlertTriangle, label: 'Incidents', value: stats.incidents, tone: 'bg-red-50 text-red-700' },
    { icon: Layers, label: 'Total Resources', value: stats.resources, tone: 'bg-primary/10 text-primary' },
  ];

  const shortcuts = [
    { to: '/manage/departments', label: 'Manage Departments' },
    { to: '/manage/labs', label: 'Manage Labs' },
    { to: '/manage/staff', label: 'Manage Staff' },
    { to: '/manage/analytics', label: 'View Analytics' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <p className="eyebrow">Institute Administrator</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Institute Overview</h1>
        <p className="mt-1.5 text-muted-foreground">Your institution's operational summary.</p>
      </header>

      {stats.resources === 0 && stats.depts === 0 ? (
        <EmptyState icon={Building2} title="Welcome to your workspace" description="Start by creating departments, labs, and resources to enable sharing." />
      ) : null}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="transition-shadow duration-300 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((s) => (
          <Link key={s.to} to={s.to} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm font-medium text-foreground">{s.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
