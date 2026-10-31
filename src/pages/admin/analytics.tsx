import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Package, Clock, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['hsl(222 47% 30%)', 'hsl(199 89% 48%)', 'hsl(173 58% 39%)', 'hsl(43 74% 66%)', 'hsl(27 87% 60%)'];

function StatTile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: string }) {
  return (
    <Card className="transition-shadow duration-300 hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminAnalyticsPage() {
  const { activeOrgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; count: number }[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0 });

  useEffect(() => {
    async function load() {
      if (!activeOrgId) { setLoading(false); return; }
      const { data: bookings } = await supabase.from('bookings').select('status').eq('organization_id', activeOrgId);
      const all = bookings ?? [];
      const statusCounts: Record<string, number> = {};
      all.forEach((b: { status: string }) => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });
      setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      const { data: resources } = await supabase.from('resources').select('category').eq('organization_id', activeOrgId);
      const catCounts: Record<string, number> = {};
      (resources ?? []).forEach((r: { category: string }) => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
      setCategoryData(Object.entries(catCounts).map(([name, count]) => ({ name, count })));

      setStats({
        total: all.length,
        approved: statusCounts.approved || 0,
        rejected: statusCounts.rejected || 0,
        completed: statusCounts.completed || 0,
        cancelled: statusCounts.cancelled || 0,
      });
      setLoading(false);
    }
    load();
  }, [activeOrgId]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  if (!activeOrgId) return <EmptyState icon={BarChart3} title="No institution selected" />;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <p className="eyebrow">Insights</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Institution Analytics</h1>
        <p className="mt-1.5 text-muted-foreground">Utilisation and booking statistics from real database records.</p>
      </header>

      {stats.total === 0 ? (
        <EmptyState icon={TrendingUp} title="No data yet" description="Analytics will appear once bookings and resources are created." />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile icon={Package} label="Total Bookings" value={stats.total} tone="bg-primary/10 text-primary" />
            <StatTile icon={TrendingUp} label="Approved" value={stats.approved} tone="bg-emerald-50 text-emerald-700" />
            <StatTile icon={Clock} label="Completed" value={stats.completed} tone="bg-amber-50 text-amber-700" />
            <StatTile icon={BarChart3} label="Rejected" value={stats.rejected} tone="bg-red-50 text-red-700" />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Booking Status Distribution</CardTitle>
                <CardDescription>Distribution of all booking statuses.</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-12 text-center text-sm text-muted-foreground">No booking data yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Resources by Category</CardTitle>
                <CardDescription>Inventory distribution across categories.</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryData}>
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(222 47% 30%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="py-12 text-center text-sm text-muted-foreground">No resources yet.</p>}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
