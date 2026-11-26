import { FolderIcon } from './gallery/LibraryIcons';
import { useState, useRef, useEffect } from 'react';
import { CheckCircledIcon, ExclamationTriangleIcon, PauseIcon, PlayIcon, ReloadIcon } from '@radix-ui/react-icons';
import { useData } from '../../context/DataContext';
import { driveFolderId } from '../../../shared/galleryMedia';
export const GoogleDriveImporter = ({ onBusy, onComplete }: { onBusy?: (busy: boolean) => void; onComplete?: () => void } = {}) => {
  const { syncGoogleDrive, fetchDriveFolders, syncGoogleDriveBatch, eventCategories = [], homepageSettings, loadGalleryImages } = useData();
  const [url, setUrl] = useState(() => { try { return localStorage.getItem('gallery_drive_folder') || ''; } catch { return ''; } });
  const [year, setYear] = useState(String(homepageSettings?.brand_year || 2026));
  const [category, setCategory] = useState('Cultural');
  const [folders, setFolders] = useState<{ id: string; name: string; imageCount: number }[] | null>(null);
  const [busy, setBusy] = useState(false), [checking, setChecking] = useState(false), [error, setError] = useState('');
  const [results, setResults] = useState<{ name: string; count: number; error?: string }[]>([]);
  const [queue, setQueue] = useState<{ id: string; name: string }[]>([]);
  const [active, setActive] = useState('');
  const stop = useRef(false), running = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { stop.current = true; alive.current = false; }; }, []);
  const check = async () => {
    const folderId = driveFolderId(url); if (!folderId) { setError('Enter a valid Google Drive folder link.'); return; }
    setChecking(true); onBusy?.(true); setError(''); setFolders(null);
    try { const data = await fetchDriveFolders!(folderId); setFolders(data.folders || []); try { localStorage.setItem('gallery_drive_folder', url); } catch { /* The folder remains in this form. */ } }
    catch (error) { setError(error instanceof Error ? error.message : 'This folder could not be opened.'); }
    finally { setChecking(false); onBusy?.(false); }
  };
  const start = async (items?: { id: string; name: string }[]) => {
    if (running.current) return;
    const folderId = driveFolderId(url); if (!folderId || !/^\d{4}$/.test(year)) { setError('Enter a valid folder link and a four-digit year.'); return; }
    const next = items || queue.length ? [...(items || queue)] : [{ id: folderId, name: 'Root folder and albums' }];
    running.current = true; stop.current = false; setBusy(true); onBusy?.(true); setError('');
    let completed = 0;
    try {
      while (next.length && !stop.current) {
        const folder = next[0]; setActive(folder.name);
        try {
          const result = folder.id === folderId ? await syncGoogleDrive!(folderId, year, category) : await syncGoogleDriveBatch!(folderId, folder.id, year, category);
          const partial = (result as { partial?: boolean }).partial;
          if (partial) throw new Error('This folder was only partly imported. Retry it to finish; existing links are kept.');
          if (alive.current) setResults(previous => [...previous, { name: folder.name, count: result.imagesCount || 0 }]); completed++;
        } catch (error) { if (alive.current) { setResults(previous => [...previous, { name: folder.name, count: 0, error: error instanceof Error ? error.message : 'Import failed' }]); setError('A folder could not finish importing. Retry that folder after checking its access.'); } }
        next.shift(); if (alive.current) setQueue([...next]);
      }
      if (completed) { await loadGalleryImages(true); onComplete?.(); }
    } finally { running.current = false; if (alive.current) { setBusy(false); setActive(''); onBusy?.(false); } }
  };
  return <div className="gallery-drive-import"><div className="gallery-drive-intro"><span><FolderIcon /></span><div><h3>Your Drive folders, organised as albums.</h3><p>Import public photos while keeping their original Drive links. Existing photos are retained when a folder is scanned again.</p></div></div><div className="gallery-form"><label><span>Google Drive folder</span><input value={url} disabled={busy || checking} onChange={event => { setUrl(event.target.value); setFolders(null); setQueue([]); setResults([]); }} placeholder="https://drive.google.com/drive/folders/…" /><small>The folder and its photos must be shared for public viewing.</small></label><div className="gallery-form-pair"><label><span>Festival year</span><input value={year} disabled={busy || checking} onChange={event => setYear(event.target.value)} inputMode="numeric" maxLength={4} /></label><label><span>Category</span><select value={category} disabled={busy || checking} onChange={event => setCategory(event.target.value)}><option value="">Use folder names</option>{[...new Set(['Cultural', ...eventCategories.map(item => item.name)])].map(name => <option key={name}>{name}</option>)}</select></label></div></div><div className="gallery-drive-actions"><button type="button" className="gallery-button" disabled={busy || checking || !url.trim()} onClick={() => void check()}><FolderIcon />{checking ? 'Checking folders…' : 'Preview folders'}</button>{busy ? <button type="button" className="gallery-button is-primary" onClick={() => { stop.current = true; }}><PauseIcon />Pause after this folder</button> : <button type="button" className="gallery-button is-primary" disabled={checking || !url.trim()} onClick={() => void start(queue.length ? undefined : folders?.length ? folders : undefined)}><PlayIcon />{queue.length ? 'Resume import' : 'Import photos'}</button>}</div>{error && <p className="gallery-message is-error" role="alert"><ExclamationTriangleIcon />{error}</p>}{busy && <p className="gallery-message" role="status">Importing {active}… Keep this panel open. {queue.length} folders in the queue.</p>}{folders && <section className="gallery-drive-folders"><header><span>{folders.length ? `${folders.length} albums found` : 'No subfolders · Photos in the root can still be imported'}</span></header>{folders.map(folder => <article key={folder.id}><FolderIcon /><span><strong>{folder.name}</strong><small>{folder.imageCount.toLocaleString('en-IN')} photos found</small></span><button type="button" className="gallery-button" disabled={busy || checking} onClick={() => void start([folder])}>Import album</button></article>)}</section>}{!!results.length && <section className="gallery-drive-results"><h3>Import activity</h3>{results.map((result, index) => <article key={index}>{result.error ? <ExclamationTriangleIcon /> : <CheckCircledIcon />}<div><strong>{result.name}</strong><p>{result.error || `${result.count.toLocaleString('en-IN')} photo links processed`}</p></div>{result.error && <button type="button" className="gallery-icon-button" aria-label={`Retry ${result.name}`} disabled={busy} onClick={() => { const folder = folders?.find(item => item.name === result.name); void start(folder ? [folder] : undefined); }}><ReloadIcon /></button>}</article>)}</section>}</div>;
};
