import { useEffect, useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { formatDateTime } from '@/lib/constants';
import type { AuditLog } from '@/lib/types';

export function AdminAuditPage() {
  const { activeOrgId } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeOrgId) { setLoading(false); return; }
      const { data } = await supabase.from('audit_logs').select('*').eq('organization_id', activeOrgId).order('created_at', { ascending: false }).limit(100);
      setLogs((data as AuditLog[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [activeOrgId]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <p className="eyebrow">Compliance</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Audit Log</h1>
        <p className="mt-1.5 text-muted-foreground">Record of important institutional actions. These records cannot be modified.</p>
      </header>

      {logs.length === 0 ? (
        <EmptyState icon={Shield} title="No audit entries yet" description="Actions like resource creation, booking approvals, and role changes will be recorded here." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/50">
                  <TableCell className="py-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="text-sm font-medium capitalize text-foreground">{log.action.replace(/_/g, ' ')}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.reason || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
