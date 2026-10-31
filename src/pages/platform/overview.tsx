import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ShieldCheck, AlertCircle, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_COLORS } from '@/lib/constants';
import type { Organization } from '@/lib/types';

export function PlatformOverview() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
      setOrgs((data as Organization[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const pending = orgs.filter((o) => o.verification_status === 'pending');
  const active = orgs.filter((o) => o.verification_status === 'active' || o.is_active);
  const suspended = orgs.filter((o) => o.verification_status === 'suspended');

  const stats = [
    { icon: Globe, label: 'Total Institutions', value: orgs.length, tone: 'bg-primary/10 text-primary' },
    { icon: ShieldCheck, label: 'Active', value: active.length, tone: 'bg-emerald-50 text-emerald-700' },
    { icon: AlertCircle, label: 'Pending Review', value: pending.length, tone: 'bg-amber-50 text-amber-700' },
    { icon: TrendingUp, label: 'Suspended', value: suspended.length, tone: 'bg-red-50 text-red-700' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-2">
        <p className="eyebrow">Platform Administrator</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">Platform Overview</h1>
        <p className="max-w-2xl text-muted-foreground">Monitor and manage all registered institutions.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="font-display text-3xl font-semibold tabular-nums text-primary">{s.value}</p>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/70 px-6 py-5">
          <CardTitle className="text-base font-semibold text-primary">Pending Institution Requests</CardTitle>
          <Link to="/platform/institutions" className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent/80">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        {pending.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ShieldCheck} title="No pending requests" description="All institution registrations have been reviewed." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6">Institution</TableHead>
                <TableHead className="px-6">Location</TableHead>
                <TableHead className="px-6">Contact</TableHead>
                <TableHead className="px-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((org) => (
                <TableRow key={org.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="px-6 py-4">
                    <p className="max-w-[260px] truncate font-medium text-foreground">{org.name}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    {org.city}, {org.state}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    {org.contact_email}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Badge className={VERIFICATION_STATUS_COLORS[org.verification_status]} variant="outline">
                      {VERIFICATION_STATUS_LABELS[org.verification_status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
