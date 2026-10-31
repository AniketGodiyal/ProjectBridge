import { useEffect, useState, useCallback } from 'react';
import { FlaskConical, Plus, Loader2, Power } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import type { Lab, Department } from '@/lib/types';

export function AdminLabsPage() {
  const { activeOrgId, user } = useAuth();
  const { toast } = useToast();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', description: '', capacity: 1, department_id: '' });

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    const [labsRes, deptsRes] = await Promise.all([
      supabase.from('labs').select('*, department:departments(*)').eq('organization_id', activeOrgId).order('name'),
      supabase.from('departments').select('*').eq('organization_id', activeOrgId).eq('is_active', true),
    ]);
    setLabs((labsRes.data as Lab[] | null) ?? []);
    setDepts((deptsRes.data as Department[] | null) ?? []);
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !user) return;
    const { error } = await supabase.from('labs').insert({
      organization_id: activeOrgId,
      name: form.name, location: form.location || null, description: form.description || null,
      capacity: form.capacity, department_id: form.department_id || null,
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'lab_created', organization_id: activeOrgId });
    toast({ title: 'Lab created' });
    setCreating(false); setForm({ name: '', location: '', description: '', capacity: 1, department_id: '' });
    load();
  };

  const handleToggle = async (l: Lab) => {
    const { error } = await supabase.from('labs').update({ is_active: !l.is_active }).eq('id', l.id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: l.is_active ? 'Deactivated' : 'Activated' });
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Facilities</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Labs & Spaces</h1>
          <p className="mt-1.5 text-muted-foreground">Manage laboratories, classrooms, and spaces.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto"><Plus className="h-4 w-4" />New Lab</Button>
      </header>

      {creating && (
        <Card className="animate-fade-in">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lname" className="text-sm font-medium">Name *</Label>
                  <Input id="lname" required className="h-10" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lloc" className="text-sm font-medium">Location</Label>
                  <Input id="lloc" className="h-10" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lcap" className="text-sm font-medium">Capacity</Label>
                  <Input id="lcap" type="number" min={1} className="h-10" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ldept" className="text-sm font-medium">Department</Label>
                  <Select value={form.department_id} onValueChange={(v) => setForm((p) => ({ ...p, department_id: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldesc" className="text-sm font-medium">Description</Label>
                <Textarea id="ldesc" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {labs.length === 0 && !creating ? (
        <EmptyState icon={FlaskConical} title="No labs yet" description="Create labs and spaces to house your resources." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16 text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium text-foreground">{l.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.location || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">Capacity: {l.capacity}</Badge>
                  </TableCell>
                  <TableCell>
                    {l.department?.name ? <Badge variant="outline" className="text-xs">{l.department.name}</Badge> : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={l.is_active ? 'Active' : 'Inactive'}
                      className={l.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted text-muted-foreground'}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={l.is_active ? 'Deactivate lab' : 'Activate lab'} className="transition-colors hover:text-accent" onClick={() => handleToggle(l)}>
                      <Power className="h-4 w-4" />
                    </Button>
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
