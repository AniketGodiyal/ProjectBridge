import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MAX_RETURN_PHOTOS = 5;
export const RETURN_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface ReturnPhotoPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export function ReturnPhotoPicker({ files, onChange }: ReturnPhotoPickerProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';

    const valid = picked.filter((file) => RETURN_PHOTO_TYPES.includes(file.type) && file.size <= MAX_PHOTO_BYTES);
    const room = Math.max(MAX_RETURN_PHOTOS - files.length, 0);
    const accepted = valid.slice(0, room);

    if (accepted.length < picked.length) {
      setMessage(`Only JPEG, PNG, or WebP photos under 5 MB, up to ${MAX_RETURN_PHOTOS} in total, can be attached.`);
    } else {
      setMessage(null);
    }
    onChange([...files, ...accepted]);
  };

  const removeAt = (index: number) => {
    setMessage(null);
    onChange(files.filter((_, i) => i !== index));
  };

  const isFull = files.length >= MAX_RETURN_PHOTOS;

  return (
    <div className="space-y-3">
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map((url, index) => (
            <div key={url} className="group relative aspect-square animate-fade-in overflow-hidden rounded-xl border border-border shadow-sm">
              <img src={url} alt={`Return photo ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-1.5 top-1.5 rounded-full bg-primary/80 p-1 text-primary-foreground opacity-100 shadow transition-all hover:bg-primary sm:opacity-0 sm:group-hover:opacity-100"
                aria-label={`Remove photo ${index + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" asChild disabled={isFull}>
        <label className={isFull ? 'cursor-not-allowed' : 'cursor-pointer'}>
          <ImagePlus className="mr-1 h-3.5 w-3.5" />
          {isFull ? `${MAX_RETURN_PHOTOS} photos added` : 'Add photos'}
          <input
            type="file"
            accept={RETURN_PHOTO_TYPES.join(',')}
            multiple
            className="sr-only"
            onChange={handleSelect}
            disabled={isFull}
          />
        </label>
      </Button>
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  );
}
