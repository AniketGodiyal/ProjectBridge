import { useState } from 'react';
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { parseResourceQrPayload } from '@/lib/qr';
import { RETURN_CONDITIONS, RETURN_CONDITION_LABELS, RETURN_PHOTO_BUCKET } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrScanner } from '@/components/qr-scanner';
import { ReturnPhotoPicker } from '@/components/return-photo-picker';
import type { Booking, ReturnCondition } from '@/lib/types';

const PHOTO_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

interface ReturnInspectionDialogProps {
  booking: Booking;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

export function ReturnInspectionDialog({ booking, onOpenChange, onSubmitted }: ReturnInspectionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const resourceName = booking.resource?.name || 'this item';

  const [scanToken, setScanToken] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [condition, setCondition] = useState<ReturnCondition>('good');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const rescan = (message: string) => {
    setVerifying(false);
    setScanError(message);
    setScanKey((k) => k + 1);
  };

  const handleDetect = async (text: string) => {
    const token = parseResourceQrPayload(text);
    if (!token) {
      rescan('That is not a Project Bridge resource code. Scan the QR code attached to the item.');
      return;
    }

    setVerifying(true);
    setScanError(null);
    const { data, error } = await supabase.rpc('demo_check_booking_qr', {
      p_booking_id: booking.id,
      p_token: token,
    });
    if (error) {
      rescan(error.message);
      return;
    }
    if (data !== true) {
      rescan(`That code belongs to a different item. Scan the code on ${resourceName}.`);
      return;
    }
    setScanToken(token);
    setVerifying(false);
  };

  const handleSubmit = async () => {
    if (!scanToken || !user) return;
    if (condition !== 'good' && photos.length === 0) {
      setSubmitError('Add at least one photo showing the condition of the item.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const photoPaths: string[] = [];
      for (const file of photos) {
        const path = `${booking.id}/${crypto.randomUUID()}.${PHOTO_EXTENSIONS[file.type]}`;
        const { error: uploadError } = await supabase.storage
          .from(RETURN_PHOTO_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(`A photo could not be uploaded: ${uploadError.message}`);
        photoPaths.push(path);
      }

      const { error } = await supabase.rpc('demo_submit_return', {
        p_booking_id: booking.id,
        p_actor_id: user.id,
        p_scan_token: scanToken,
        p_condition: condition,
        p_notes: notes,
        p_photo_paths: photoPaths,
      });
      if (error) throw new Error(error.message);

      toast({
        title: condition === 'good' ? 'Return submitted' : 'Return submitted with damage report',
        description: 'The resource manager has been notified to inspect the item.',
      });
      onSubmitted();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'The return could not be submitted. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl p-6 animate-fade-in">
        <DialogHeader className="space-y-2 pr-6">
          <p className="eyebrow">Return inspection</p>
          <DialogTitle className="text-xl">Return {resourceName}</DialogTitle>
          <DialogDescription>
            {scanToken
              ? `You received this item as ${RETURN_CONDITION_LABELS[booking.initial_condition ?? 'good'].toLowerCase()} condition.`
              : 'Scan the QR code on the item to confirm which resource you are returning.'}
          </DialogDescription>
        </DialogHeader>

        {!scanToken ? (
          <div className="mt-6 space-y-4">
            {verifying ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />Checking code...
              </div>
            ) : (
              <QrScanner key={scanKey} onDetect={handleDetect} />
            )}
            {scanError && <p className="text-sm text-destructive">{scanError}</p>}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />Code verified for {resourceName}
            </div>

            <div className="space-y-2">
              <Label>Condition now</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {RETURN_CONDITIONS.map((option) => {
                  const selected = condition === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setCondition(option.value)}
                      className={`rounded-xl border p-3 text-left transition-all duration-200 ${
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-card hover:border-primary/30 hover:bg-muted/50'
                      }`}
                    >
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-notes">{condition === 'good' ? 'Notes (optional)' : 'What happened?'}</Label>
              <Textarea
                id="return-notes"
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={condition === 'good' ? 'Anything the manager should know' : 'Describe the damage or missing parts'}
              />
            </div>

            <div className="space-y-2">
              <Label>Photos {condition === 'good' ? '(optional)' : '(required)'}</Label>
              <ReturnPhotoPicker files={photos} onChange={setPhotos} />
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <DialogFooter className="gap-2 border-t border-border pt-5 sm:justify-end sm:gap-2">
              <Button variant="outline" onClick={() => { setScanToken(null); setSubmitError(null); }} disabled={submitting}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />Scan again
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                Submit return
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
