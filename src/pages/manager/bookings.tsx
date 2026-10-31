import { Fragment, useEffect, useState, useCallback } from 'react';
import { Check, X, Loader2, Clock, CheckCircle2, Package, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { ReturnInspectionSummary } from '@/components/return-inspection-summary';
import { StudentVerificationReviewDialog } from '@/components/student-verification-review-dialog';
import { useToast } from '@/hooks/use-toast';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, RETURN_CONDITIONS, formatDateTime } from '@/lib/constants';
import type { Booking, ReturnCondition } from '@/lib/types';

// Local tint overrides so badges stay within the teal / navy / neutral palette.
const BOOKING_STATUS_TONE: Partial<Record<string, string>> = {
  return_pending: 'bg-teal-50 text-teal-800 border-teal-200',
};

const STATUS_TABS = ['pending', 'approved', 'checked_in', 'return_pending', 'completed', 'rejected', 'all'];

export function ManagerBookingsPage() {
  const { activeOrgId, user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkinCondition, setCheckinCondition] = useState<ReturnCondition>('good');
  const [reviewStudentId, setReviewStudentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    const { data } = await supabase
      .from('bookings')
      .select('*, resource:resources(*), organization:organizations(*)')
      .eq('organization_id', activeOrgId)
      .order('created_at', { ascending: false });
    setBookings((data as Booking[] | null) ?? []);
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.rpc('demo_decide_booking', {
      p_booking_id: id, p_action: 'approve', p_actor_id: user.id,
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Booking approved' });
    load();
  };

  const handleReject = async (id: string) => {
    if (!user || !rejectReason.trim()) return;
    const { error } = await supabase.rpc('demo_decide_booking', {
      p_booking_id: id, p_action: 'reject', p_actor_id: user.id, p_reason: rejectReason,
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Booking rejected' });
    setRejectingId(null); setRejectReason('');
    load();
  };

  const handleCheckin = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.rpc('demo_decide_booking', {
      p_booking_id: id, p_action: 'checkin', p_actor_id: user.id, p_condition: checkinCondition,
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Checked in' });
    setCheckingInId(null); setCheckinCondition('good');
    load();
  };

  const handleComplete = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.rpc('demo_decide_booking', {
      p_booking_id: id, p_action: 'complete', p_actor_id: user.id,
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Booking completed' });
    load();
  };

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);
  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-1">
        <p className="eyebrow">Approvals & Requests</p>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">Booking Management</h1>
        <p className="text-muted-foreground">Review, approve, and manage resource bookings.</p>
      </header>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {STATUS_TABS.map((t) => (
          <Button
            key={t}
            variant={filter === t ? 'default' : 'ghost'}
            size="sm"
            className={`h-9 shrink-0 rounded-full px-4 transition-colors ${filter === t ? '' : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            onClick={() => setFilter(t)}
          >
            {t === 'all' ? 'All' : BOOKING_STATUS_LABELS[t as keyof typeof BOOKING_STATUS_LABELS] ?? t}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Clock} title="No bookings found" />
      ) : (
        <Card className="overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Resource</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => {
                const hasPanel = b.status === 'return_pending' || rejectingId === b.id || checkingInId === b.id;
                return (
                  <Fragment key={b.id}>
                    <TableRow className="group">
                      <TableCell className="min-w-[220px]">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-medium text-primary">{b.resource?.name || 'Resource'}</p>
                            {b.purpose && <p className="max-w-xs truncate text-xs text-muted-foreground">Purpose: {b.purpose}</p>}
                            {b.rejection_reason && <p className="text-xs text-destructive">Reason: {b.rejection_reason}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(b.start_time)} → {formatDateTime(b.end_time)}
                      </TableCell>
                      <TableCell>
                        <Badge className={BOOKING_STATUS_TONE[b.status] ?? BOOKING_STATUS_COLORS[b.status]} variant="outline">
                          {BOOKING_STATUS_LABELS[b.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          {b.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setReviewStudentId(b.user_id)}><ShieldCheck className="mr-1 h-3.5 w-3.5" />Eligibility</Button>
                              <Button size="sm" onClick={() => handleApprove(b.id)}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => setRejectingId(rejectingId === b.id ? null : b.id)}><X className="mr-1 h-3.5 w-3.5" />Reject</Button>
                            </>
                          )}
                          {b.status === 'approved' && (
                            <Button size="sm" onClick={() => setCheckingInId(checkingInId === b.id ? null : b.id)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Check In</Button>
                          )}
                          {b.status === 'return_pending' && (
                            <Button size="sm" onClick={() => handleComplete(b.id)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Confirm Return</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {hasPanel && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="bg-muted/30 p-4">
                          <div className="space-y-4 animate-fade-in">
                            {b.status === 'return_pending' && <ReturnInspectionSummary booking={b} />}

                            {rejectingId === b.id && (
                              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                                <div className="space-y-2">
                                  <Label htmlFor="reason" className="text-sm font-medium">Rejection Reason</Label>
                                  <Textarea id="reason" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this booking is rejected..." />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleReject(b.id)}>Confirm Reject</Button>
                                </div>
                              </div>
                            )}

                            {checkingInId === b.id && (
                              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                                <Label className="text-sm font-medium">Condition at checkout</Label>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  {RETURN_CONDITIONS.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      aria-pressed={checkinCondition === option.value}
                                      onClick={() => setCheckinCondition(option.value)}
                                      className={`rounded-xl border bg-background px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                                        checkinCondition === option.value
                                          ? 'border-primary bg-primary/[0.03] ring-1 ring-primary'
                                          : 'border-border hover:border-accent/50 hover:bg-muted/50'
                                      }`}
                                    >
                                      <span className="font-medium text-foreground">{option.label}</span>
                                    </button>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground">Returns are compared against this condition.</p>
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setCheckingInId(null)}>Cancel</Button>
                                  <Button size="sm" onClick={() => handleCheckin(b.id)}>Confirm Check In</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {user && (
        <StudentVerificationReviewDialog
          studentId={reviewStudentId ?? ''}
          reviewerId={user.id}
          open={reviewStudentId !== null}
          onOpenChange={(open) => { if (!open) setReviewStudentId(null); }}
        />
      )}
    </div>
  );
}
