import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { createDocumentUrls } from '@/lib/student-verification';
import { STUDENT_DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import type { StudentDocument } from '@/lib/types';

interface StudentDocumentListProps {
  documents: StudentDocument[];
}

export function StudentDocumentList({ documents }: StudentDocumentListProps) {
  const [urls, setUrls] = useState<Record<string, string> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrls(null);
    setFailed(false);
    createDocumentUrls(documents.map((d) => d.storage_path))
      .then((result) => { if (!cancelled) setUrls(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [documents]);

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>;
  }

  if (failed) {
    return <p className="text-sm text-destructive">Documents could not be opened. Please refresh and try again.</p>;
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => {
        const url = urls?.[doc.storage_path];
        return (
          <li
            key={doc.id}
            className="animate-fade-in flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <FileText className="h-4 w-4 text-accent" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {STUDENT_DOCUMENT_TYPE_LABELS[doc.doc_type]} · {(doc.size_bytes / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                View
              </a>
            ) : (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
