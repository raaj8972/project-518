'use client';

import { useEffect, useRef, useState } from 'react';
import { DownloadIcon, ExternalLinkIcon, ReloadIcon } from '@radix-ui/react-icons';
import { safeSponsorLink } from '../../utils/sponsorPresentation';

export function BrochureDownload({ url, year, label = 'Download sponsorship brochure' }: { url?: string | null; year: number; label?: string }) {
  const href = safeSponsorLink(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const downloadUrl = useRef<string | null>(null);
  const cleanupTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => {
    pending.current?.abort();
    if (cleanupTimer.current) clearTimeout(cleanupTimer.current);
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
  }, []);
  if (!href) return null;
  const download = async () => {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(false);
    try {
      const response = await fetch(href, { credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error('Download unavailable');
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      if (cleanupTimer.current) clearTimeout(cleanupTimer.current);
      const objectUrl = URL.createObjectURL(blob); downloadUrl.current = objectUrl;
      const link = document.createElement('a');
      link.href = objectUrl; link.download = `Ricorrenza-${year}-Sponsorship.pdf`;
      document.body.append(link); link.click(); link.remove();
      cleanupTimer.current = setTimeout(() => { URL.revokeObjectURL(objectUrl); if (downloadUrl.current === objectUrl) downloadUrl.current = null; }, 2000);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return <div className="sponsor-brochure-download"><button type="button" className="sponsor-action sponsor-action-secondary" disabled={busy} aria-busy={busy} onClick={() => { void download(); }}>{busy ? <ReloadIcon className="sponsor-download-spinner" /> : <DownloadIcon />}{busy ? 'Preparing brochure…' : label}</button>{error && <p role="status">Your browser could not download the file directly. <a href={href} target="_blank" rel="noopener noreferrer">Open the brochure <ExternalLinkIcon /></a></p>}</div>;
}
