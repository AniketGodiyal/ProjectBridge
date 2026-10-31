import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Loader2, QrCode } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { resourceQrPayload } from '@/lib/qr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResourceQrCardProps {
  resourceId: string;
  resourceName: string;
}

export function ResourceQrCard({ resourceId, resourceName }: ResourceQrCardProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('demo_get_resource_qr', {
          p_resource_id: resourceId,
          p_actor_id: userId,
        });
        if (rpcError) throw new Error(rpcError.message);
        if (typeof data !== 'string' || data.length === 0) throw new Error('No QR code exists for this resource.');
        const url = await QRCode.toDataURL(resourceQrPayload(data), { width: 320, margin: 2, errorCorrectionLevel: 'M' });
        if (!cancelled) setImageUrl(url);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'The QR code could not be created.');
      }
    }

    load();
    return () => { cancelled = true; };
  }, [resourceId, userId]);

  const fileName = `${resourceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resource'}-qr.png`;

  return (
    <Card className="surface-elevated animate-fade-in rounded-2xl">
      <CardHeader className="pb-4">
        <p className="eyebrow">Resource</p>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4 text-accent" />Return QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-3 shadow-sm">
          {imageUrl ? (
            <img src={imageUrl} alt={`QR code for ${resourceName}`} className="h-full w-full animate-fade-in" />
          ) : error ? (
            <p className="text-center text-xs text-destructive">{error}</p>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Print this code and attach it to the item. Students scan it when returning the item so its condition is recorded against the correct resource.
          </p>
          <Button variant="outline" size="sm" asChild disabled={!imageUrl}>
            <a href={imageUrl ?? undefined} download={fileName}>
              <Download className="mr-1 h-3.5 w-3.5" />Download QR code
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
