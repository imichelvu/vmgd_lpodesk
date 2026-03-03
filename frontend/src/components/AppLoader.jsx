/**
 * Author: Igor Michel
 * Purpose: Show a branded full-page/content loader using VMGD logo.
 * Last updated: 2026-02-28
 */
import React, { useEffect, useState } from 'react';

const LOGO_SRC = '/vmgd-loader.png';

function useTransparentLogo(src) {
  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('2d context unavailable');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Remove dark background around the logo to simulate transparency.
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          if (a === 0) continue;

          if (r < 26 && g < 26 && b < 26) {
            pixels[i + 3] = 0;
          } else if (r < 40 && g < 40 && b < 40) {
            pixels[i + 3] = Math.min(a, 35);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const cleaned = canvas.toDataURL('image/png');
        if (!cancelled) setResolvedSrc(cleaned);
      } catch (_) {
        if (!cancelled) setResolvedSrc(src);
      }
    };

    img.onerror = () => {
      if (!cancelled) setResolvedSrc(src);
    };

    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolvedSrc;
}

export default function AppLoader({ message = 'Loading...', fullPage = true }) {
  const logoSrc = useTransparentLogo(LOGO_SRC);

  return (
    <div className={`app-loader ${fullPage ? 'app-loader-fullpage' : ''}`.trim()}>
      <div className="app-loader-content">
        <img src={logoSrc} alt="VMGD logo" className="app-loader-logo" />
        <p className="app-loader-text">{message}</p>
      </div>
    </div>
  );
}

