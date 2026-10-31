import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, ArrowRight, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { OPERATIONAL_STATUS_LABELS, OPERATIONAL_STATUS_COLORS } from '@/lib/constants';
import type { Resource } from '@/lib/types';

export function ManageResourcesPage() {
  const { activeOrgId } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeOrgId) { setLoading(false); return; }
      const { data } = await supabase.from('resources').select('*, lab:labs(*)').eq('organization_id', activeOrgId).order('created_at', { ascending: false });
      setResources((data as Resource[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [activeOrgId]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Inventory</p>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">Resource Inventory</h1>
          <p className="text-muted-foreground">Manage equipment, spaces, and tools in your institution.</p>
        </div>
        <div className="flex sm:justify-end">
          <Button asChild className="rounded-lg">
            <Link to="/manage/resources/new"><Plus className="mr-1.5 h-4 w-4" />Add Resource</Link>
          </Button>
        </div>
      </header>

      {resources.length === 0 ? (
        <EmptyState icon={Package} title="No resources yet" description="Add your first resource to start accepting bookings." action={<Button asChild><Link to="/manage/resources/new">Add Resource</Link></Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {resources.map((r) => (
            <Link key={r.id} to={`/manage/resources/${r.id}/edit`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="flex h-full flex-col transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-lg">
                <CardContent className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent capitalize">{r.category}</p>
                      <h3 className="font-display text-lg font-semibold leading-snug text-primary">{r.name}</h3>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary transition-colors duration-300 group-hover:bg-accent/10 group-hover:text-accent">
                      <Package className="h-5 w-5" />
                    </div>
                  </div>

                  {r.description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{r.description}</p>}

                  <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {r.lab && (
                      <span className="flex min-w-0 items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.lab.name}</span>
                      </span>
                    )}
                    <Badge variant="secondary" className="shrink-0 text-xs">Qty {r.quantity}</Badge>
                    {r.price_per_hour != null && r.price_per_hour > 0 && (
                      <Badge variant="outline" className="shrink-0 text-xs text-accent">₹{r.price_per_hour}/hr</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={OPERATIONAL_STATUS_COLORS[r.operational_status]} variant="outline">{OPERATIONAL_STATUS_LABELS[r.operational_status]}</Badge>
                      {r.is_published
                        ? <Badge variant="secondary" className="text-xs">Published</Badge>
                        : <Badge variant="outline" className="text-xs text-muted-foreground">Draft</Badge>}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent transition-transform duration-300 group-hover:translate-x-0.5">
                      Edit<ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
