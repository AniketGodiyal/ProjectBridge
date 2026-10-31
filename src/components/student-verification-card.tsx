import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StudentDocumentList } from '@/components/student-document-list';
import { useToast } from '@/hooks/use-toast';
import {
  STUDENT_DOCUMENT_MAX_BYTES,
  STUDENT_DOCUMENT_MIME_TYPES,
  STUDENT_DOCUMENT_TYPES,
  STUDENT_VERIFICATION_STATUS_COLORS,
  STUDENT_VERIFICATION_STATUS_LABELS,
} from '@/lib/constants';
import {
  fetchVerificationState,
  uploadStudentDocument,
  validateStudentDocumentFile,
} from '@/lib/student-verification';
import type { StudentDocType, StudentVerificationState } from '@/lib/types';

const STATUS_MESSAGES: Record<StudentVerificationState['status'], string> = {
  unsubmitted: 'Upload your institution ID, certificates, or training records so resource owners can verify you before approving your requests.',
  pending: 'Your documents are waiting for review by a resource owner.',
  verified: 'You are verified. Your resource requests can now be approved.',
  rejected: 'Your verification was not approved. Upload updated documents to request a new review.',
};

const ACCEPTED_TYPES = STUDENT_DOCUMENT_MIME_TYPES.join(',');

export function StudentVerificationCard({ studentId }: { studentId: string }) {
  const { toast } = useToast();
  const [state, setState] = useState<StudentVerificationState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docType, setDocType] = useState<StudentDocType>('institution_id');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await fetchVerificationState(studentId, studentId));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Verification details could not be loaded.');
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setFormError(picked ? validateStudentDocumentFile(picked) : null);
    setFile(picked);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setFormError('Choose a file to upload.'); return; }
    if (!title.trim()) { setFormError('Give the document a short title.'); return; }
    const fileError = validateStudentDocumentFile(file);
    if (fileError) { setFormError(fileError); return; }

    setSubmitting(true);
    setFormError(null);
    try {
      await uploadStudentDocument({ studentId, file, docType, title: title.trim() });
      toast({ title: 'Document submitted', description: 'A resource owner will review it shortly.' });
      setTitle('');
      setFile(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'The document could not be submitted. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const status = state?.status ?? 'unsubmitted';

  return (
    <Card className="surface-elevated animate-fade-in rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="eyebrow">Eligibility</p>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent" />Student Verification</CardTitle>
            <CardDescription>Share your documents so resource owners can confirm you are eligible.</CardDescription>
          </div>
          {state && (
            <Badge variant="outline" className={`rounded-full ${STUDENT_VERIFICATION_STATUS_COLORS[status]}`}>
              {status === 'verified' && <CheckCircle2 className="mr-1 h-3 w-3" />}
              {status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
              {status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
              {STUDENT_VERIFICATION_STATUS_LABELS[status]}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : !state ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading verification</div>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{STATUS_MESSAGES[status]}</p>
              {status === 'rejected' && state.rejection_reason && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground">
                  <span className="font-medium text-destructive">Reason:</span> {state.rejection_reason}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Your documents</h3>
              <StudentDocumentList documents={state.documents} />
            </div>

            <form onSubmit={handleUpload} className="space-y-5 rounded-2xl border border-border bg-muted/40 p-5">
              <div className="space-y-2">
                <Label>Document type</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {STUDENT_DOCUMENT_TYPES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={docType === option.value}
                      onClick={() => setDocType(option.value)}
                      className={`rounded-xl border bg-card p-3 text-left transition-all duration-200 ${
                        docType === option.value
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-border hover:border-primary/30 hover:bg-muted/50'
                      }`}
                    >
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Title</Label>
                  <Input id="doc-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Student ID 2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-file">File</Label>
                  <Input id="doc-file" type="file" accept={ACCEPTED_TYPES} onChange={handleFile} />
                  <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or PDF, up to {STUDENT_DOCUMENT_MAX_BYTES / 1024 / 1024} MB.</p>
                </div>
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting || !file}>
                  {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                  Submit for review
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
