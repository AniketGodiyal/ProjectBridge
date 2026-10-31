import { useEffect, useState, useCallback } from 'react';
import { Building2, Plus, Loader2, Power } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import type { Department } from '@/lib/types';

export function AdminDepartmentsPage() {
  const { activeOrgId, user } = useAuth();
  const { toast } = useToast();
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    const { data } = await supabase.from('departments').select('*').eq('organization_id', activeOrgId).order('name');
    setDepts((data as Department[] | null) ?? []);
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !user) return;
    const { error } = await supabase.from('departments').insert({
      organization_id: activeOrgId, name: form.name, description: form.description || null,
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'department_created', organization_id: activeOrgId });
    toast({ title: 'Department created' });
    setCreating(false); setForm({ name: '', description: '' });
    load();
  };

  const handleToggle = async (d: Department) => {
    const { error } = await supabase.from('departments').update({ is_active: !d.is_active }).eq('id', d.id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: d.is_active ? 'Deactivated' : 'Activated' });
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Organization</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Departments</h1>
          <p className="mt-1.5 text-muted-foreground">Manage your institution's departments.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto"><Plus className="h-4 w-4" />New Department</Button>
      </header>

      {creating && (
        <Card className="animate-fade-in">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dname" className="text-sm font-medium">Name *</Label>
                  <Input id="dname" required className="h-10" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ddesc" className="text-sm font-medium">Description</Label>
                  <Textarea id="ddesc" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {depts.length === 0 && !creating ? (
        <EmptyState icon={Building2} title="No departments yet" description="Create departments to organize your labs and resources." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16 text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-foreground">{d.name}</TableCell>
                  <TableCell className="max-w-md text-sm text-muted-foreground">{d.description || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge
                      label={d.is_active ? 'Active' : 'Inactive'}
                      className={d.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted text-muted-foreground'}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={d.is_active ? 'Deactivate department' : 'Activate department'} className="transition-colors hover:text-accent" onClick={() => handleToggle(d)}>
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
