import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, AlertTriangle, Plus, ArrowRight, Boxes, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { formatDateTime } from '@/lib/constants';
import type { Resource, Booking, Incident } from '@/lib/types';

export function ManagerOverview() {
  const { activeOrgId } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeOrgId) { setLoading(false); return; }
      const [res, books, incs] = await Promise.all([
        supabase.from('resources').select('*').eq('organization_id', activeOrgId).order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, resource:resources(*)').eq('organization_id', activeOrgId).eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
        supabase.from('incidents').select('*, resource:resources(*)').eq('organization_id', activeOrgId).order('created_at', { ascending: false }).limit(5),
      ]);
      setResources((res.data as Resource[] | null) ?? []);
      setPendingBookings((books.data as Booking[] | null) ?? []);
      setIncidents((incs.data as Incident[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [activeOrgId]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;

  const operationalCount = resources.filter((r) => r.operational_status === 'operational').length;

  const stats = [
    { icon: Boxes, label: 'Total Resources', value: resources.length, tone: 'bg-primary/10 text-primary' },
    { icon: Clock, label: 'Pending Requests', value: pendingBookings.length, tone: 'bg-amber-50 text-amber-700' },
    { icon: AlertTriangle, label: 'Open Incidents', value: incidents.length, tone: 'bg-destructive/10 text-destructive' },
    { icon: Activity, label: 'Operational', value: operationalCount, tone: 'bg-accent/10 text-accent' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Resource Manager</p>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">Manager Overview</h1>
          <p className="text-muted-foreground">Manage your resources, bookings, and incidents.</p>
        </div>
        <div className="flex sm:justify-end">
          <Button asChild className="rounded-lg">
            <Link to="/manage/resources/new"><Plus className="mr-1.5 h-4 w-4" />Add Resource</Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="transition-shadow duration-300 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-3xl font-semibold leading-none tracking-tight text-primary">{s.value}</p>
                <p className="mt-1.5 truncate text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-primary">Pending Booking Requests</h2>
            <Button variant="ghost" size="sm" asChild className="text-accent hover:bg-accent/10 hover:text-accent">
              <Link to="/manage/bookings">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="p-2">
            {pendingBookings.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={Clock} title="No pending requests" />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {pendingBookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 transition-colors duration-150 hover:bg-muted/50">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{b.resource?.name || 'Resource'}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(b.start_time)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild className="shrink-0">
                      <Link to="/manage/bookings">Review</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-primary">Recent Incidents</h2>
            <Button variant="ghost" size="sm" asChild className="text-accent hover:bg-accent/10 hover:text-accent">
              <Link to="/manage/incidents">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="p-2">
            {incidents.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={ShieldCheck} title="No incidents reported" description="All clear — no incidents logged." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {incidents.map((inc) => (
                  <li key={inc.id} className="rounded-xl px-4 py-3.5 transition-colors duration-150 hover:bg-muted/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{inc.resource?.name || 'Resource'}</p>
                      <Badge variant="outline" className="text-xs capitalize">{inc.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{inc.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
