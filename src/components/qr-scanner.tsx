import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { ImageUp, Loader2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  onDetect: (text: string) => void;
}

function readQrFromCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || canvas.width === 0 || canvas.height === 0) return null;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(image.data, image.width, image.height)?.data ?? null;
}

export function QrScanner({ onDetect }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDetectRef = useRef(onDetect);
  const [starting, setStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setStarting(false);
      setCameraError('This browser cannot open the camera. Upload a photo of the code instead.');
      return;
    }

    let stream: MediaStream | null = null;
    let frame = 0;
    let finished = false;

    const stop = () => {
      finished = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };

    const tick = () => {
      if (finished) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d', { willReadFrequently: true })?.drawImage(video, 0, 0);
        const text = readQrFromCanvas(canvas);
        if (text) {
          stop();
          onDetectRef.current(text);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (media) => {
        stream = media;
        if (finished) {
          stop();
          return;
        }
        video.srcObject = media;
        await video.play();
        setStarting(false);
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (finished) return;
        setStarting(false);
        setCameraError('Camera access was blocked. Allow camera access or upload a photo of the code instead.');
      });

    return stop;
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setReading(true);
    setUploadError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      bitmap.close();
      const text = readQrFromCanvas(canvas);
      if (text) {
        onDetectRef.current(text);
      } else {
        setUploadError('No QR code was found in that photo. Try a closer, sharper picture.');
      }
    } catch {
      setUploadError('That file could not be read. Try a JPEG or PNG photo.');
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-primary shadow-inner ring-1 ring-border">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {!starting && !cameraError && (
          <div className="pointer-events-none absolute inset-10 rounded-xl border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-all">
            <ScanLine className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse text-white/90" />
          </div>
        )}
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">{cameraError}</div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Point the camera at the QR code on the item.</p>
        <Button variant="outline" size="sm" asChild>
          <label className="cursor-pointer">
            {reading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ImageUp className="mr-1 h-3.5 w-3.5" />}
            Upload photo of code
            <input type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={reading} />
          </label>
        </Button>
      </div>
      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
    </div>
  );
}
