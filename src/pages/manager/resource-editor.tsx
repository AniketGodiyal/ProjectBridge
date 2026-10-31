import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ResourceQrCard } from '@/components/resource-qr-card';
import { RESOURCE_CATEGORIES } from '@/lib/constants';
import type { Lab, Resource, AvailabilityRule } from '@/lib/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ResourceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { activeOrgId, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  const [form, setForm] = useState({
    name: '', category: 'equipment', description: '', quantity: 1,
    operational_status: 'operational', supervision_required: false,
    booking_duration_minutes: 120, is_published: false, lab_id: '',
    image_url: '', required_training: [] as string[], access_rules: {} as Record<string,string>,
    specifications: {} as Record<string,string>, price_per_hour: 0,
  });

  const [availRules, setAvailRules] = useState<AvailabilityRule[]>([]);
  const [specKey, setSpecKey] = useState('');
  const [specVal, setSpecVal] = useState('');
  const [training, setTraining] = useState('');

  useEffect(() => {
    async function load() {
      if (!activeOrgId) return;
      const [labsRes] = await Promise.all([
        supabase.from('labs').select('*').eq('organization_id', activeOrgId).eq('is_active', true),
      ]);
      setLabs((labsRes.data as Lab[] | null) ?? []);

      if (id) {
        const { data: res } = await supabase.from('resources').select('*').eq('id', id).maybeSingle();
        if (res) {
          const r = res as Resource;
          setForm({
            name: r.name, category: r.category, description: r.description || '',
            quantity: r.quantity, operational_status: r.operational_status,
            supervision_required: r.supervision_required, booking_duration_minutes: r.booking_duration_minutes || 120,
            is_published: r.is_published, lab_id: r.lab_id || '', image_url: r.image_url || '',
            required_training: r.required_training, access_rules: r.access_rules, specifications: r.specifications,
            price_per_hour: r.price_per_hour ?? 0,
          });
        }
        const { data: avail } = await supabase.from('availability_rules').select('*').eq('resource_id', id);
        setAvailRules((avail as AvailabilityRule[] | null) ?? []);
      }
      setLoading(false);
    }
    load();
  }, [id, activeOrgId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !user) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: activeOrgId,
        lab_id: form.lab_id || null,
        name: form.name,
        category: form.category,
        description: form.description || null,
        quantity: form.quantity,
        available_quantity: form.quantity,
        operational_status: form.operational_status,
        specifications: form.specifications,
        access_rules: form.access_rules,
        required_training: form.required_training,
        supervision_required: form.supervision_required,
        booking_duration_minutes: form.booking_duration_minutes,
        is_published: form.is_published,
        image_url: form.image_url || null,
        price_per_hour: form.price_per_hour || 0,
        owner_user_id: user.id,
      };

      let resourceId = id;
      let isUpdate = !!id;

      if (isUpdate) {
        const { error } = await supabase.from('resources').update(payload).eq('id', id!);
        if (error) throw error;
      } else {
        const { data: newRes, error } = await supabase.from('resources').insert(payload).select().single();
        if (error) throw error;
        resourceId = (newRes as { id: string }).id;
      }

      await supabase.from('audit_logs').insert({
        actor_id: user.id, action: isUpdate ? 'resource_updated' : 'resource_created',
        organization_id: activeOrgId, resource_id: resourceId,
      });

      toast({ title: isUpdate ? 'Resource updated' : 'Resource created' });
      navigate('/manage/resources');
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground" onClick={() => navigate('/manage/resources')}>
          <ArrowLeft className="mr-1 h-4 w-4" />Back to resources
        </Button>

        <header className="space-y-1">
          <p className="eyebrow">{id ? 'Edit resource' : 'New resource'}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">{id ? 'Edit Resource' : 'Add Resource'}</h1>
        </header>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Primary column */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-base font-semibold text-primary">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
                    <Input id="name" className="h-10" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat" className="text-sm font-medium">Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                      <SelectTrigger id="cat" className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RESOURCE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lab" className="text-sm font-medium">Lab / Location</Label>
                    <Select value={form.lab_id || 'none'} onValueChange={(v) => setForm((p) => ({ ...p, lab_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger id="lab" className="h-10"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {labs.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qty" className="text-sm font-medium">Quantity</Label>
                    <Input id="qty" className="h-10" type="number" min={1} value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-sm font-medium">Description</Label>
                  <Textarea id="desc" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium">Operational Status</Label>
                    <Select value={form.operational_status} onValueChange={(v) => setForm((p) => ({ ...p, operational_status: v }))}>
                      <SelectTrigger id="status" className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dur" className="text-sm font-medium">Max Booking Duration (minutes)</Label>
                    <Input id="dur" className="h-10" type="number" value={form.booking_duration_minutes} onChange={(e) => setForm((p) => ({ ...p, booking_duration_minutes: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium">Price per hour (INR)</Label>
                    <Input id="price" className="h-10" type="number" min={0} step="0.01" value={form.price_per_hour} onChange={(e) => setForm((p) => ({ ...p, price_per_hour: Number(e.target.value) }))} placeholder="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="img" className="text-sm font-medium">Image URL</Label>
                  <Input id="img" className="h-10" value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-base font-semibold text-primary">Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input className="h-10" aria-label="Specification key" placeholder="Key (e.g. voltage)" value={specKey} onChange={(e) => setSpecKey(e.target.value)} />
                  <Input className="h-10" aria-label="Specification value" placeholder="Value (e.g. 5V)" value={specVal} onChange={(e) => setSpecVal(e.target.value)} />
                  <Button type="button" variant="outline" className="h-10 w-full shrink-0 sm:w-10" aria-label="Add specification" onClick={() => {
                    if (specKey && specVal) {
                      setForm((p) => ({ ...p, specifications: { ...p.specifications, [specKey]: specVal } }));
                      setSpecKey(''); setSpecVal('');
                    }
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
                {Object.keys(form.specifications).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(form.specifications).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-muted/60">
                        <span className="min-w-0 truncate capitalize text-muted-foreground">{k.replace(/_/g,' ')}: <strong className="font-medium text-foreground">{v}</strong></span>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Remove ${k.replace(/_/g,' ')}`} onClick={() => {
                          const next = { ...form.specifications }; delete next[k];
                          setForm((p) => ({ ...p, specifications: next }));
                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side column */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-base font-semibold text-primary">Access & Training</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <Label htmlFor="supervision" className="text-sm font-medium">Supervision Required</Label>
                  <Switch id="supervision" checked={form.supervision_required} onCheckedChange={(v) => setForm((p) => ({ ...p, supervision_required: v }))} />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <Label htmlFor="published" className="text-sm font-medium">Published (visible to students)</Label>
                  <Switch id="published" checked={form.is_published} onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="training" className="text-sm font-medium">Required Training</Label>
                  <div className="flex gap-2">
                    <Input id="training" className="h-10" placeholder="e.g. Safety induction" value={training} onChange={(e) => setTraining(e.target.value)} />
                    <Button type="button" variant="outline" className="h-10 w-10 shrink-0 px-0" aria-label="Add training requirement" onClick={() => {
                      if (training) { setForm((p) => ({ ...p, required_training: [...p.required_training, training] })); setTraining(''); }
                    }}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {form.required_training.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {form.required_training.map((t, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer gap-1 rounded-full bg-accent/10 py-1 pl-3 pr-2 text-accent transition-colors hover:bg-accent/20"
                          onClick={() => setForm((p) => ({ ...p, required_training: p.required_training.filter((_, j) => j !== i) }))}
                        >
                          {t}
                          <X className="h-3 w-3" aria-label="Remove" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {id && <ResourceQrCard resourceId={id} resourceName={form.name} />}
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-6">
          <Button type="submit" className="h-10 min-w-[180px] rounded-lg" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1 h-4 w-4" />{id ? 'Update Resource' : 'Create Resource'}</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
