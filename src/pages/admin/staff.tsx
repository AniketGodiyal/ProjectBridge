import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import type { Membership } from '@/lib/types';

export function AdminStaffPage() {
  const { activeOrgId, user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'student' });

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    const { data } = await supabase
      .from('memberships')
      .select('*, organization:organizations(*)')
      .eq('organization_id', activeOrgId)
      .order('joined_at', { ascending: false });
    setMembers((data as Membership[] | null) ?? []);
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !user) return;
    const { error } = await supabase.from('invitations').insert({
      organization_id: activeOrgId, email: inviteForm.email, role: inviteForm.role, invited_by: user.id,
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'invitation_sent', organization_id: activeOrgId, reason: inviteForm.email });
    toast({ title: 'Invitation sent', description: `${inviteForm.email} will be able to join as ${inviteForm.role}.` });
    setInviting(false); setInviteForm({ email: '', role: 'student' });
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const { error } = await supabase.from('memberships').update({ role: newRole }).eq('id', memberId);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('audit_logs').insert({ actor_id: user!.id, action: 'role_changed', organization_id: activeOrgId, reason: `New role: ${newRole}` });
    toast({ title: 'Role updated' });
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">People</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Staff & Members</h1>
          <p className="mt-1.5 text-muted-foreground">Manage members and their roles.</p>
        </div>
        <Button onClick={() => setInviting(true)} className="w-full sm:w-auto"><Plus className="h-4 w-4" />Invite Member</Button>
      </header>

      {inviting && (
        <Card className="animate-fade-in">
          <CardContent className="p-6">
            <form onSubmit={handleInvite} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="iemail" className="text-sm font-medium">Email *</Label>
                  <Input id="iemail" type="email" required className="h-10" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="irole" className="text-sm font-medium">Role</Label>
                  <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((p) => ({ ...p, role: v }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="manager">Manager / Lab Manager</SelectItem>
                      <SelectItem value="institute_admin">Institute Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
                <Button type="button" variant="outline" onClick={() => setInviting(false)}>Cancel</Button>
                <Button type="submit"><Mail className="h-4 w-4" />Send Invitation</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {members.length === 0 ? (
        <EmptyState icon={Users} title="No members yet" description="Invite faculty, lab managers, and students to join your institution." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Change role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="text-sm font-medium capitalize text-foreground">{m.role.replace('_', ' ')}</span>
                      {m.role === 'institute_admin' && <ShieldCheck className="h-4 w-4 text-accent" />}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={m.status}
                      className={m.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 capitalize' : 'border-border bg-muted text-muted-foreground capitalize'}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v)}>
                        <SelectTrigger className="h-10 w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="institute_admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
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
