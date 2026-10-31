import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StudentDocumentList } from '@/components/student-document-list';
import { useToast } from '@/hooks/use-toast';
import { STUDENT_VERIFICATION_STATUS_COLORS, STUDENT_VERIFICATION_STATUS_LABELS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { fetchVerificationState, reviewStudentVerification } from '@/lib/student-verification';
import type { StudentVerificationState } from '@/lib/types';

interface StudentVerificationReviewDialogProps {
  studentId: string;
  reviewerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentVerificationReviewDialog({
  studentId,
  reviewerId,
  open,
  onOpenChange,
}: StudentVerificationReviewDialogProps) {
  const { toast } = useToast();
  const [state, setState] = useState<StudentVerificationState | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState(null);
    setLoadError(null);
    setRejecting(false);
    setReason('');

    Promise.all([
      fetchVerificationState(studentId, reviewerId),
      supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle(),
    ])
      .then(([verification, profile]) => {
        if (cancelled) return;
        setState(verification);
        setStudentName(profile.data?.full_name ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Verification details could not be loaded.');
      });

    return () => { cancelled = true; };
  }, [open, studentId, reviewerId]);

  const runReview = async (action: 'verify' | 'reject') => {
    if (action === 'reject' && !reason.trim()) return;
    setBusy(true);
    try {
      await reviewStudentVerification({
        studentId,
        actorId: reviewerId,
        action,
        reason: action === 'reject' ? reason.trim() : undefined,
      });
      toast({ title: action === 'verify' ? 'Student verified' : 'Verification rejected' });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Review failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const status = state?.status ?? 'unsubmitted';
  const canReview = !!state && state.documents.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl p-6 animate-fade-in">
        <DialogHeader className="space-y-2 pr-6">
          <p className="eyebrow">Verification review</p>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-accent" />Verify eligibility
          </DialogTitle>
          <DialogDescription>{studentName ?? 'Student'} submitted these documents for review.</DialogDescription>
        </DialogHeader>

        {loadError ? (
          <p className="mt-6 text-sm text-destructive">{loadError}</p>
        ) : !state ? (
          <div className="mt-6 flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-accent" />Loading documents</div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current status</span>
              <Badge variant="outline" className={`rounded-full ${STUDENT_VERIFICATION_STATUS_COLORS[status]}`}>
                {STUDENT_VERIFICATION_STATUS_LABELS[status]}
              </Badge>
            </div>

            {state.rejection_reason && status === 'rejected' && (
              <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">Previous reason: {state.rejection_reason}</p>
            )}

            <StudentDocumentList documents={state.documents} />

            {rejecting && (
              <div className="animate-fade-in space-y-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <Label htmlFor="reject-reason">Reason for rejection</Label>
                <Textarea
                  id="reject-reason"
                  rows={3}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. The ID photo is blurred. Please upload a clear image."
                />
                <p className="text-xs text-muted-foreground">The student will see this reason and can upload new documents.</p>
              </div>
            )}

            {canReview && (
              <DialogFooter className="gap-2 border-t border-border pt-5 sm:justify-end sm:gap-2">
                {rejecting ? (
                  <>
                    <Button variant="outline" disabled={busy} onClick={() => setRejecting(false)}>Back</Button>
                    <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => runReview('reject')}>
                      <XCircle className="mr-1 h-4 w-4" />Confirm rejection
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" disabled={busy} onClick={() => setRejecting(true)}>Reject</Button>
                    <Button disabled={busy || status === 'verified'} onClick={() => runReview('verify')}>
                      {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                      {status === 'verified' ? 'Already verified' : 'Verify student'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
