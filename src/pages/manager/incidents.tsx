import { Fragment, useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Loader2, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import { INCIDENT_STATUS_LABELS, INCIDENT_STATUS_COLORS, formatDateTime } from '@/lib/constants';
import type { Incident, IncidentStatus } from '@/lib/types';

type Tab = 'open' | 'resolved';

const OPEN_STATUSES: IncidentStatus[] = ['reported', 'under_review', 'awaiting_response', 'escalated'];

export function ManagerIncidentsPage() {
  const { activeOrgId, user } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState({ status: '', resolution: '' });
  const [tab, setTab] = useState<Tab>('open');

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    const { data } = await supabase.from('incidents').select('*, resource:resources(*)').eq('organization_id', activeOrgId).order('created_at', { ascending: false });
    setIncidents((data as Incident[] | null) ?? []);
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('incidents').update({
      status: updateForm.status, resolution_notes: updateForm.resolution || null, reviewer_id: user.id,
    }).eq('id', id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'incident_updated', organization_id: activeOrgId, booking_id: id, reason: updateForm.resolution });
    toast({ title: 'Incident updated' });
    setUpdatingId(null); setUpdateForm({ status: '', resolution: '' });
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const openIncidents = incidents.filter((i) => OPEN_STATUSES.includes(i.status));
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');
  const visibleIncidents = tab === 'open' ? openIncidents : resolvedIncidents;
  const openCount = openIncidents.length;
  const resolvedCount = resolvedIncidents.length;

  const stats = [
    { icon: AlertTriangle, label: 'Total Incidents', value: incidents.length, tone: 'bg-destructive/10 text-destructive' },
    { icon: Clock, label: 'Open / Active', value: openCount, tone: 'bg-amber-50 text-amber-700' },
    { icon: CheckCircle2, label: 'Resolved', value: resolvedCount, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-1">
        <p className="eyebrow">Safety & Reports</p>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">Incidents</h1>
        <p className="text-muted-foreground">Review and resolve reported incidents.</p>
      </header>

      {incidents.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="transition-shadow duration-300 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-3xl font-semibold leading-none tracking-tight text-primary">{s.value}</p>
                  <p className="mt-1.5 text-xs font-medium text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {incidents.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No incidents reported" description="Reported incidents will appear here for review." />
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <button
              onClick={() => setTab('open')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                tab === 'open' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setTab('resolved')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                tab === 'resolved' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          {visibleIncidents.length === 0 ? (
            <EmptyState
              icon={tab === 'open' ? ShieldCheck : CheckCircle2}
              title={tab === 'open' ? 'No open incidents' : 'No resolved incidents yet'}
              description={tab === 'open' ? 'All incidents have been resolved.' : 'Resolved incidents will appear here once marked.'}
            />
          ) : (
            <Card className="overflow-hidden animate-fade-in">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Resource</TableHead>
                    <TableHead>Incident</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleIncidents.map((inc) => (
                    <Fragment key={inc.id}>
                      <TableRow>
                        <TableCell className="min-w-[160px] font-medium text-primary">{inc.resource?.name || 'Resource'}</TableCell>
                        <TableCell className="min-w-[260px] max-w-md">
                          <div className="space-y-1.5">
                            <Badge variant="secondary" className="capitalize text-xs">{inc.incident_type.replace('_', ' ')}</Badge>
                            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{inc.description}</p>
                            {inc.resolution_notes && <p className="line-clamp-2 text-xs text-accent">Resolution: {inc.resolution_notes}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={INCIDENT_STATUS_COLORS[inc.status]} variant="outline">{INCIDENT_STATUS_LABELS[inc.status]}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(inc.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="shrink-0" onClick={() => {
                            setUpdatingId(updatingId === inc.id ? null : inc.id);
                            setUpdateForm({ status: inc.status, resolution: inc.resolution_notes || '' });
                          }}>
                            {updatingId === inc.id ? 'Cancel' : 'Update'}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {updatingId === inc.id && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={5} className="bg-muted/30 p-4">
                            <div className="grid gap-4 rounded-xl border border-border bg-card p-4 animate-fade-in sm:grid-cols-[220px_1fr]">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Status</Label>
                                <Select value={updateForm.status} onValueChange={(v) => setUpdateForm((p) => ({ ...p, status: v }))}>
                                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(INCIDENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="res" className="text-sm font-medium">Resolution Notes</Label>
                                <Textarea id="res" rows={3} value={updateForm.resolution} onChange={(e) => setUpdateForm((p) => ({ ...p, resolution: e.target.value }))} />
                              </div>
                              <div className="flex justify-end sm:col-span-2">
                                <Button size="sm" onClick={() => handleUpdate(inc.id)}>Save Update</Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
