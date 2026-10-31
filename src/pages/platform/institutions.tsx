import { useEffect, useState, useCallback } from 'react';
import { Building2, Loader2, CheckCircle2, Power, UserCog } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_COLORS, formatDate } from '@/lib/constants';
import type { Organization } from '@/lib/types';

export function PlatformInstitutionsPage() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [adminEmail, setAdminEmail] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    setOrgs((data as Organization[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (org: Organization) => {
    const { error } = await supabase.from('organizations').update({ verification_status: 'verified', is_active: true }).eq('id', org.id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    const { data: userData } = await supabase.from('profiles').select('id').eq('id', org.proposed_admin_email || '').maybeSingle();
    toast({ title: 'Institution verified', description: `${org.name} is now active.` });
    load();
  };

  const handleSuspend = async (org: Organization) => {
    const { error } = await supabase.from('organizations').update({ verification_status: 'suspended', is_active: false }).eq('id', org.id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Institution suspended', description: `${org.name} has been suspended.` });
    load();
  };

  const handleReactivate = async (org: Organization) => {
    const { error } = await supabase.from('organizations').update({ verification_status: 'active', is_active: true }).eq('id', org.id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Institution reactivated' });
    load();
  };

  const handleAssignAdmin = async (org: Organization) => {
    const email = adminEmail[org.id];
    if (!email) { toast({ title: 'Email required', variant: 'destructive' }); return; }
    const { data: userData } = await supabase.from('profiles').select('id').eq('id', email).maybeSingle();
    if (userData) {
      const { error } = await supabase.from('memberships').upsert({
        user_id: (userData as { id: string }).id, organization_id: org.id, role: 'institute_admin', status: 'active',
      }, { onConflict: 'user_id,organization_id' });
      if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Admin assigned', description: `${email} is now an admin of ${org.name}.` });
    } else {
      const { error } = await supabase.from('invitations').insert({
        organization_id: org.id, email, role: 'institute_admin',
      });
      if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Invitation sent', description: `${email} will become admin once they sign up.` });
    }
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const filtered = filter === 'all' ? orgs : orgs.filter((o) => o.verification_status === filter);
  const tabs = ['all', 'pending', 'verified', 'active', 'suspended', 'rejected'];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-2">
        <p className="eyebrow">Governance</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">Institutions</h1>
        <p className="max-w-2xl text-muted-foreground">Review, verify, and manage all registered institutions.</p>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by status">
        {tabs.map((t) => (
          <Button
            key={t}
            variant={filter === t ? 'default' : 'outline'}
            className="h-10 shrink-0 rounded-full px-4"
            aria-pressed={filter === t}
            onClick={() => setFilter(t)}
          >
            {t === 'all' ? 'All' : VERIFICATION_STATUS_LABELS[t as keyof typeof VERIFICATION_STATUS_LABELS] ?? t}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No institutions found" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-5">Institution</TableHead>
                <TableHead className="px-5">Type &amp; location</TableHead>
                <TableHead className="px-5">Contact</TableHead>
                <TableHead className="px-5">Status</TableHead>
                <TableHead className="px-5">Administrator</TableHead>
                <TableHead className="px-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((org) => (
                <TableRow key={org.id} className="align-top transition-colors hover:bg-muted/50">
                  <TableCell className="px-5 py-4">
                    <p className="font-semibold text-primary">{org.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Registered {formatDate(org.created_at)}</p>
                    {org.website && (
                      <a href={org.website} className="mt-1 inline-block text-sm text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                        {org.website}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <p className="text-sm font-medium capitalize text-foreground">{org.org_type.replace('_', ' ')}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{org.city || 'N/A'}, {org.state || 'N/A'}</p>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {org.contact_email && (
                      <p className="text-sm text-foreground"><span className="text-muted-foreground">Contact: </span>{org.contact_email}</p>
                    )}
                    {org.proposed_admin_email && (
                      <p className="mt-0.5 text-sm text-foreground"><span className="text-muted-foreground">Proposed admin: </span>{org.proposed_admin_email}</p>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge className={VERIFICATION_STATUS_COLORS[org.verification_status]} variant="outline">
                      {VERIFICATION_STATUS_LABELS[org.verification_status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[260px] px-5 py-4">
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Label htmlFor={`admin-${org.id}`} className="text-sm font-medium">Assign Administrator</Label>
                        <Input
                          id={`admin-${org.id}`}
                          type="email"
                          placeholder="admin email"
                          value={adminEmail[org.id] || ''}
                          onChange={(e) => setAdminEmail((p) => ({ ...p, [org.id]: e.target.value }))}
                        />
                      </div>
                      <Button variant="outline" className="shrink-0" onClick={() => handleAssignAdmin(org)}>
                        <UserCog className="h-4 w-4" />Assign
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      {org.verification_status === 'pending' && (
                        <Button onClick={() => handleVerify(org)}><CheckCircle2 className="h-4 w-4" />Verify &amp; Activate</Button>
                      )}
                      {(org.verification_status === 'active' || org.verification_status === 'verified') && (
                        <Button variant="outline" onClick={() => handleSuspend(org)}><Power className="h-4 w-4" />Suspend</Button>
                      )}
                      {org.verification_status === 'suspended' && (
                        <Button variant="outline" onClick={() => handleReactivate(org)}><CheckCircle2 className="h-4 w-4" />Reactivate</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
