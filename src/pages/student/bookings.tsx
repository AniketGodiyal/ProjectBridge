import { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, X, Loader2, CheckCircle2, AlertTriangle, ScanLine, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { ReturnInspectionDialog } from '@/components/return-inspection-dialog';
import { useToast } from '@/hooks/use-toast';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, RETURN_CONDITION_LABELS, STUDENT_VERIFICATION_STATUS_COLORS, STUDENT_VERIFICATION_STATUS_LABELS, formatDateTime } from '@/lib/constants';
import { fetchVerificationState } from '@/lib/student-verification';
import type { Booking, StudentVerificationState } from '@/lib/types';

export function MyBookingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [returningBooking, setReturningBooking] = useState<Booking | null>(null);
  const [verification, setVerification] = useState<StudentVerificationState | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('*, resource:resources(*), organization:organizations(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setBookings((data as Booking[] | null) ?? []);
    setLoading(false);
    try {
      setVerification(await fetchVerificationState(user.id, user.id));
    } catch {
      setVerification(null);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    const { error } = await supabase.rpc('demo_decide_booking', {
      p_booking_id: id, p_action: 'cancel', p_actor_id: user!.id,
    });
    if (error) {
      toast({ title: 'Cancel failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Booking cancelled' });
      load();
    }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  const statusTabs = ['all', 'pending', 'approved', 'checked_in', 'return_pending', 'completed', 'cancelled'];

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-1">
        <p className="eyebrow">Resource requests</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">My Bookings</h1>
        <p className="text-muted-foreground">Track requests from approval through to return.</p>
      </section>

      {verification && verification.status !== 'verified' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Student verification required</p>
              <p className="text-sm text-muted-foreground">
                {verification.status === 'pending'
                  ? 'Your documents are under review. Approval of new requests waits until a resource owner verifies you.'
                  : verification.status === 'rejected'
                    ? 'Your verification was not approved, so requests cannot be approved yet. Update your documents on your profile to request a new review.'
                    : 'Upload your documents on your profile so a resource owner can verify you before approving requests.'}
              </p>
              {verification.status === 'rejected' && verification.rejection_reason && (
                <p className="text-sm text-red-600">Reason: {verification.rejection_reason}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={STUDENT_VERIFICATION_STATUS_COLORS[verification.status]}>
            {STUDENT_VERIFICATION_STATUS_LABELS[verification.status]}
          </Badge>
        </div>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {statusTabs.map((s) => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" className="shrink-0 rounded-full" onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : BOOKING_STATUS_LABELS[s as keyof typeof BOOKING_STATUS_LABELS] ?? s}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No bookings found" description="Your booking requests and history will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border/70">
            {filtered.map((b) => (
              <li key={b.id} className="flex flex-col gap-4 px-6 py-5 transition-colors duration-150 hover:bg-accent/[0.04] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-primary">{b.resource?.name || 'Resource'}</h3>
                    <Badge className={BOOKING_STATUS_COLORS[b.status]} variant="outline">{BOOKING_STATUS_LABELS[b.status]}</Badge>
                    {b.damage_flagged && (
                      <Badge variant="outline" className="border-red-200 bg-red-100 text-red-800">
                        <AlertTriangle className="mr-1 h-3 w-3" />Damage reported
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDateTime(b.start_time)} → {formatDateTime(b.end_time)}</p>
                  {b.purpose && <p className="text-sm text-muted-foreground">Purpose: {b.purpose}</p>}
                  {b.rejection_reason && <p className="text-sm text-red-600">Rejected: {b.rejection_reason}</p>}
                  {b.approved_at && <p className="text-xs text-muted-foreground">Approved: {formatDateTime(b.approved_at)}</p>}
                  {b.checkin_at && <p className="text-xs text-muted-foreground">Checked in: {formatDateTime(b.checkin_at)}</p>}
                  {b.return_submitted_at && b.return_condition && (
                    <p className="text-xs text-muted-foreground">Returned as {RETURN_CONDITION_LABELS[b.return_condition].toLowerCase()}: {formatDateTime(b.return_submitted_at)}</p>
                  )}
                  {b.checkout_at && <p className="text-xs text-muted-foreground">Completed: {formatDateTime(b.checkout_at)}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {(b.status === 'pending' || b.status === 'approved') && (
                    <Button variant="outline" size="sm" onClick={() => handleCancel(b.id)}>
                      <X className="mr-1 h-3.5 w-3.5" />Cancel
                    </Button>
                  )}
                  {b.status === 'checked_in' && (
                    <Button size="sm" onClick={() => setReturningBooking(b)}>
                      <ScanLine className="mr-1 h-3.5 w-3.5" />Submit Return
                    </Button>
                  )}
                  {b.status === 'return_pending' && (
                    <Badge variant="outline" className="gap-1 px-3 py-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Awaiting inspection</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {returningBooking && (
        <ReturnInspectionDialog
          booking={returningBooking}
          onOpenChange={(open) => { if (!open) setReturningBooking(null); }}
          onSubmitted={() => { setReturningBooking(null); load(); }}
        />
      )}
    </div>
  );
}
