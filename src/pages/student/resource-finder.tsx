import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Search, Filter, Package, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { RESOURCE_CATEGORIES, OPERATIONAL_STATUS_LABELS, OPERATIONAL_STATUS_COLORS } from '@/lib/constants';
import type { Resource } from '@/lib/types';

export function ResourceFinderPage() {
  const { activeOrgId } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      if (!activeOrgId) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from('resources')
        .select('*, organization:organizations(*), lab:labs(*)')
        .eq('organization_id', activeOrgId)
        .eq('is_published', true)
        .order('name');
      setResources((data as Resource[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [activeOrgId]);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const match = r.name.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false) ||
          r.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (category !== 'all' && r.category !== category) return false;
      if (statusFilter !== 'all' && r.operational_status !== statusFilter) return false;
      return true;
    });
  }, [resources, search, category, statusFilter]);

  if (loading) return (
    <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm">Loading resources…</span>
    </div>
  );

  if (!activeOrgId) {
    return <EmptyState icon={Package} title="No institution selected" description="Join an institution to browse resources." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-1">
        <p className="eyebrow">Browse</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">Find Resources</h1>
        <p className="text-muted-foreground">Search equipment, labs, and spaces in your institution.</p>
      </section>

      <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, description, or category…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 w-full sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {RESOURCE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      </Card>

      {(search || category !== 'all' || statusFilter !== 'all') && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Showing {filtered.length} of {resources.length} resources
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategory('all'); setStatusFilter('all'); }}>
            <X className="h-3 w-3" /> Clear
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No resources found" description="Try adjusting your search or filters. If your institution has no published resources yet, ask your lab manager to add some." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Link key={r.id} to={`/dashboard/resources/${r.id}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-lg">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-sidebar/5">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-accent/10 to-muted">
                      <Package className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <Badge className={`absolute left-3 top-3 bg-card/95 backdrop-blur ${OPERATIONAL_STATUS_COLORS[r.operational_status]}`} variant="outline">
                    {OPERATIONAL_STATUS_LABELS[r.operational_status]}
                  </Badge>
                </div>
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent capitalize">{r.category}</p>
                    <h3 className="font-display text-lg font-semibold leading-snug text-primary">{r.name}</h3>
                  </div>
                  {r.description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{r.description}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div className="flex min-w-0 items-center gap-2">
                      {r.lab && <span className="truncate">{r.lab.name}</span>}
                      {r.quantity > 1 && <Badge variant="secondary" className="shrink-0 text-xs">Qty {r.quantity}</Badge>}
                      {r.price_per_hour != null && r.price_per_hour > 0 && (
                        <Badge variant="outline" className="shrink-0 text-xs text-accent">₹{r.price_per_hour}/hr</Badge>
                      )}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 font-medium text-accent transition-transform group-hover:translate-x-0.5">
                      View details<ArrowRight className="h-3.5 w-3.5" />
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
