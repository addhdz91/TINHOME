import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/Skeleton';

/** QR as an SVG data URL (dark modules on a white quiet zone so phones can always read it). */
export function QrCode({
  value,
  label,
  size = 192,
}: {
  value: string;
  label: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void import('qrcode')
      .then(({ toString }) =>
        toString(value, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' }),
      )
      .then((svg) => {
        if (active) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      });
    return () => {
      active = false;
    };
  }, [value]);
  if (!src) return <Skeleton className="size-48" />;
  return <img src={src} alt={label} width={size} height={size} className="rounded-md" />;
}
