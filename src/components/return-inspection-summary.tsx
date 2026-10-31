import { useEffect, useState } from 'react';
import { AlertTriangle, ImageOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { RETURN_CONDITION_COLORS, RETURN_CONDITION_LABELS, RETURN_PHOTO_BUCKET, timeAgo } from '@/lib/constants';
import type { Booking } from '@/lib/types';

const PHOTO_URL_TTL_SECONDS = 3600;

interface ReturnInspectionSummaryProps {
  booking: Booking;
}

export function ReturnInspectionSummary({ booking }: ReturnInspectionSummaryProps) {
  const [photoUrls, setPhotoUrls] = useState<string[] | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const paths = booking.return_photo_paths;

  useEffect(() => {
    if (paths.length === 0) return;
    let cancelled = false;
    supabase.storage
      .from(RETURN_PHOTO_BUCKET)
      .createSignedUrls(paths, PHOTO_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setPhotoError(true);
          return;
        }
        setPhotoUrls(data.map((item) => item.signedUrl).filter((url): url is string => !!url));
      });
    return () => { cancelled = true; };
  }, [paths]);

  const returned = booking.return_condition ?? 'good';
  const checkedOut = booking.initial_condition ?? 'good';
  const worsened = returned !== checkedOut && returned !== 'good';

  return (
    <div className="animate-fade-in mt-3 space-y-4 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Checked out as</span>
        <Badge variant="outline" className={`rounded-full ${RETURN_CONDITION_COLORS[checkedOut]}`}>{RETURN_CONDITION_LABELS[checkedOut]}</Badge>
        <span className="text-muted-foreground">Returned as</span>
        <Badge variant="outline" className={`rounded-full ${RETURN_CONDITION_COLORS[returned]}`}>{RETURN_CONDITION_LABELS[returned]}</Badge>
        {booking.damage_flagged && (
          <Badge variant="outline" className="rounded-full border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />{worsened ? 'New damage reported' : 'Damage flagged'}
          </Badge>
        )}
      </div>

      {booking.return_notes && (
        <p className="rounded-lg bg-card p-3 text-sm leading-relaxed"><span className="font-medium">Student notes:</span> {booking.return_notes}</p>
      )}
      {booking.return_submitted_at && (
        <p className="text-xs text-muted-foreground">Submitted {timeAgo(booking.return_submitted_at)}</p>
      )}

      {paths.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><ImageOff className="h-3.5 w-3.5" />No photos attached</p>
      ) : photoError ? (
        <p className="text-xs text-destructive">Photos could not be loaded.</p>
      ) : !photoUrls ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading photos</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photoUrls.map((url, index) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square overflow-hidden rounded-xl border border-border shadow-sm transition-shadow hover:shadow-md"
            >
              <img src={url} alt={`Return photo ${index + 1}`} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
