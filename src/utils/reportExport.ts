// Centralized report export utility (Excel, PDF, CSV) with column presets and splitting
import type { Registration } from '../context/DataContext';
import { supabase, SUPABASE_HOST } from '../lib/supabase';

// Defensive helpers to normalize team member shape coming from DB/UI
const safeTeamMembers = (r: any): any[] => {
  const tm = (r as any)?.team_members;
  if (Array.isArray(tm)) return tm;
  if (typeof tm === 'string') {
    try {
      const parsed = JSON.parse(tm);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export type RegistrationColumnKey =
  | 'id' | 'event_title' | 'is_team_registration' | 'team_name' | 'total_members'
  | 'full_name' | 'participant_type' | 'email' | 'phone' | 'college'
  | 'registration_date' | 'status' | 'team_members' | 'team_phones' | 'photo_url';

export interface ColumnDefinition {
  key: RegistrationColumnKey;
  header: string;
  width?: number; // desired width hint
  accessor?: (r: Registration) => any;
}

// Base column definitions
export const REGISTRATION_COLUMNS: ColumnDefinition[] = [
  { key: 'id', header: 'Registration ID', width: 22 },
  { key: 'event_title', header: 'Event Title' },
  { key: 'is_team_registration', header: 'Registration Type', accessor: r => r.is_team_registration ? 'Team' : 'Individual' },
  { key: 'team_name', header: 'Team Name', accessor: r => r.team_name || 'N/A' },
  { key: 'total_members', header: 'Total Members' },
  { key: 'full_name', header: 'Leader/Participant Name' },
  { key: 'participant_type', header: 'Leader/Participant Type' },
  { key: 'email', header: 'Leader/Participant Email' },
  { key: 'phone', header: 'Leader/Participant Phone' },
  { key: 'photo_url', header: 'Photo URL', accessor: r => (r as any).photo_url || '—' },
  { key: 'college', header: 'College/Institution' },
  { key: 'registration_date', header: 'Registration Date', accessor: r => new Date(r.registration_date).toLocaleString() },
  { key: 'status', header: 'Status', accessor: r => r.status.toUpperCase() },
  { key: 'team_members', header: 'Team Members', accessor: r => {
    if (!r.is_team_registration) return 'N/A';
    const list = safeTeamMembers(r);
    const fmt = (m: any) => {
      const name = m?.name || '';
      const email = m?.email || '';
      return email ? `${name} (${email})` : (name || '');
    };
    return list.length ? list.map(fmt).join('; ') : 'N/A';
  } },
  { key: 'team_phones', header: 'Team Member Phones', accessor: r => {
    if (!r.is_team_registration) return 'N/A';
    const list = safeTeamMembers(r);
    const phones = list.map((m: any) => m?.phone || '').filter(Boolean);
    return phones.length ? phones.join(', ') : 'N/A';
  } }
];

// Presets: Minimal, Full, Team-only detail
export const EXPORT_PRESETS: Record<string, RegistrationColumnKey[]> = {
  minimal: ['full_name','email','phone','event_title','status'],
  full: REGISTRATION_COLUMNS.map(c => c.key),
  'team-only': ['team_name','total_members','team_members','team_phones','event_title','status']
};

export interface BuildMatrixOptions {
  rows: Registration[];
  columns: RegistrationColumnKey[];
}

export const buildMatrix = ({ rows, columns }: BuildMatrixOptions) => {
  // Normalize rows defensively so downstream code and accessors are stable
  const normRows = rows.map(r => ({
    ...(r as any),
    team_members: safeTeamMembers(r)
  })) as Registration[];
  const selectedDefs = columns.map(k => REGISTRATION_COLUMNS.find(c => c.key === k)!).filter(Boolean);
  const headers = selectedDefs.map(c => c.header);
  const body = normRows.map(r => selectedDefs.map(col => col.accessor ? col.accessor(r) : (r as any)[col.key]));
  return { headers, body };
};

// CSV Export (no dependency)
export const exportCsv = (rows: Registration[], columns: RegistrationColumnKey[], filename: string) => {
  const { headers, body } = buildMatrix({ rows, columns });
  const esc = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    if (/[,"\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  };
  const csv = [headers.map(esc).join(','), ...body.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// Lazy loaders to avoid initial bundle weight
export const exportExcel = async (rows: Registration[], columns: RegistrationColumnKey[], filename: string) => {
  const photoIncluded = columns.includes('photo_url');
  // Single-path using xlsx for both cases; when photos are included we keep the URL in a column
  const XLSX = await import('xlsx');
  const { headers, body } = buildMatrix({ rows, columns });
  const json = body.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
  // If photos are included, rename the column to Photo URL for clarity
  if (photoIncluded) {
    const idx = headers.findIndex(h => h.toLowerCase().includes('photo'));
    if (idx >= 0) headers[idx] = 'Photo URL';
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(json);
  const colWidths: any[] = [];
  headers.forEach((h, idx) => {
    const maxLength = Math.max(h.length, ...json.map(r => String(r[h] || '').length));
    colWidths[idx] = { wch: Math.min(maxLength + 2, 50) };
  });
  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, 'Registrations');
  XLSX.writeFile(wb, filename);
};

export interface PdfExportOptions {
  splitThreshold?: number; // rows per file before splitting
  baseFileName?: string;
  landscape?: boolean;
  fontSize?: number;
  photoThumbSize?: number; // px size of photo thumb inside cell
  watermarkDataUrl?: string | null; // optional watermark image data URL
  stampDataUrl?: string | null; // optional stamp image data URL
}

export const exportPdf = async (rows: Registration[], columns: RegistrationColumnKey[], opts: PdfExportOptions = {}) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  // If both Team Members and Team Member Phones are selected, drop the separate phones column
  // because PDF now shows phone below each member name inside Team Members column.
  const pdfColumns: RegistrationColumnKey[] = (() => {
    const base = columns.filter(c => c !== 'college');
    if (base.includes('team_members') && base.includes('team_phones')) {
      return base.filter(c => c !== 'team_phones');
    }
    return base;
  })();

  const { headers, body } = buildMatrix({ rows, columns: pdfColumns });
  const photoKeyIncluded = pdfColumns.includes('photo_url');
  const selectedDefs = pdfColumns.map(k => REGISTRATION_COLUMNS.find(c => c.key === k)!).filter(Boolean);
  const photoColIndex = photoKeyIncluded ? selectedDefs.findIndex(d => d.key === 'photo_url') : -1;
  const teamMembersColIndex = selectedDefs.findIndex(d => d.key === 'team_members');
  // Additional columns placeholders (kept for future tuning of widths)
  // If a photo column is included, we render a thumbnail, not the raw URL
  if (photoKeyIncluded && photoColIndex >= 0) {
    headers[photoColIndex] = 'Photo';
    for (const row of body) row[photoColIndex] = ' ';
  }
  // Use shorter headers when many columns are selected to avoid vertical wrapping
  const printableHeaders = headers.slice();
  const manyCols = selectedDefs.length > 10;
  if (manyCols) {
    selectedDefs.forEach((d, i) => {
      switch (d.key) {
        case 'event_title': printableHeaders[i] = 'Event'; break;
        case 'is_team_registration': printableHeaders[i] = 'Type'; break;
        case 'team_name': printableHeaders[i] = 'Team'; break;
        case 'total_members': printableHeaders[i] = 'Members'; break;
        case 'full_name': printableHeaders[i] = 'Name'; break;
        case 'participant_type': printableHeaders[i] = 'Part. Type'; break;
        case 'email': printableHeaders[i] = 'Email'; break;
        case 'phone': printableHeaders[i] = 'Phone'; break;
        case 'college': printableHeaders[i] = 'College'; break;
        case 'registration_date': printableHeaders[i] = 'Reg. Date'; break;
        case 'team_members': printableHeaders[i] = 'Team Members'; break;
        case 'team_phones': printableHeaders[i] = 'Team Phones'; break;
      }
    });
  }
  // If Team Members column is present, render each member as Name on one line and Phone below
  if (teamMembersColIndex >= 0) {
    const fmtStack = (r: Registration) => {
      if (!r.is_team_registration) return 'N/A';
      const list = safeTeamMembers(r);
      if (!list.length) return 'N/A';
      const blocks = list.map((m: any) => {
        const name = (m?.name || '').trim();
        const phone = (m?.phone || '').trim();
        return phone ? `${name}\n${phone}` : name;
      });
      return blocks.join('\n\n');
    };
    body.forEach((row, i) => {
      try { row[teamMembersColIndex] = fmtStack(rows[i] as Registration); } catch { /* ignore */ }
    });
  }
  
  // Inject S.No and Reg No (Short ID) at the beginning
  const EXTRA_COLS = 2;
  printableHeaders.unshift('S.No', 'Reg No');
  body.forEach((row, i) => {
    // Reg No (Short)
    row.unshift(rows[i].id.substring(0, 8).toUpperCase());
    // S.No
    row.unshift((i + 1).toString());
  });

  const split = opts.splitThreshold && opts.splitThreshold > 0 ? opts.splitThreshold : null;
  const landscape = opts.landscape !== false; // default landscape
  // Auto adjust font size: fewer cols -> a bit larger; many cols -> smaller
  const colsCount = selectedDefs.length;
  const autoFont = colsCount <= 6 ? 9 : colsCount <= 10 ? 8 : 7.5;
  const fontSize = opts.fontSize || autoFont;
  const base = opts.baseFileName || 'registrations';
  const thumbPx = Math.max(10, Math.min(opts.photoThumbSize || 16, 64));

  // Helper: fetch an image URL and return data URL + format compatible with jsPDF
  const fetchImageDataUrl = async (url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG'; w: number; h: number } | null> => {
    if (!url) return null;
    try {
      let blob: Blob | null = null;
      if (url.startsWith('data:')) {
        blob = await (await fetch(url)).blob();
      } else {
        // Try authenticated download for Supabase Storage URLs of this project
        let looksLikeSupabase = false;
        try {
          const u = new URL(url);
          looksLikeSupabase = u.host.includes(SUPABASE_HOST);
        } catch { /* ignore */ }
        const parseStoragePath = (u: string): { bucket: string; name: string } | null => {
          const m = u.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/);
          if (m) return { bucket: decodeURIComponent(m[1]), name: decodeURIComponent(m[2]) };
          const knownBuckets = ['registration-photos'];
          for (const b of knownBuckets) {
            const idx = u.indexOf(`${b}/`);
            if (idx >= 0) return { bucket: b, name: decodeURIComponent(u.slice(idx + b.length + 1)) };
          }
          return null;
        };
        if (looksLikeSupabase) {
          const parsed = parseStoragePath(url);
          if (parsed) {
            const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.name);
            if (!error && data) blob = data as any as Blob;
          }
        }
        if (!blob) {
          // Fallback to public/signed URL fetch
          const res = await fetch(url);
          if (!res.ok) return null;
          blob = await res.blob();
        }
      }
      const type = (blob.type || '').toLowerCase();
      const asFormat: 'PNG' | 'JPEG' = type.includes('png') ? 'PNG' : 'JPEG';
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(new Error('file read error'));
        fr.onload = () => resolve(String(fr.result || ''));
        fr.readAsDataURL(blob!);
      });
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        try {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth || img.width || 1, h: img.naturalHeight || img.height || 1 });
          img.onerror = () => resolve({ w: 1, h: 1 });
          img.src = dataUrl;
        } catch {
          resolve({ w: 1, h: 1 });
        }
      });
      return { dataUrl, format: asFormat, w: Math.max(1, dims.w), h: Math.max(1, dims.h) };
    } catch {
      return null;
    }
  };

  const saveDoc = async (sliceBody: any[][], sliceRows: Registration[], index: number, total: number) => {
    const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait' });
    // Preload photos for this slice to keep hooks synchronous
  const preloaded: Array<{ dataUrl: string; format: 'PNG' | 'JPEG'; w: number; h: number } | null> = [];
    if (photoKeyIncluded && photoColIndex >= 0) {
      // Limit concurrency to avoid blocking UI
      const CONC = 6;
      const tasks = sliceRows.map((r) => async () => {
        const url = (r as any).photo_url as string | undefined;
        if (!url) return null;
        return await fetchImageDataUrl(url);
      });
      for (let i = 0; i < tasks.length; i += CONC) {
        const chunk = tasks.slice(i, i + CONC).map((fn) => fn());
        const results = await Promise.all(chunk);
        preloaded.push(...results);
      }
      // In case tasks < preloaded due to chunking boundaries, pad
      while (preloaded.length < sliceRows.length) preloaded.push(null);
    }
    // Compute sensible column widths based on importance with min/max clamps
  const pageWidth = (doc as any).internal.pageSize.getWidth();
  // Give a little extra breathing room on the right when Team Members column is visible
  const margin = { top: 10, bottom: 8, left: 7, right: teamMembersColIndex >= 0 ? 10 : 7 };
    const availableWidth = pageWidth - margin.left - margin.right;

    // Importance weights and min/max widths (mm)
    const weights: Partial<Record<RegistrationColumnKey, number>> = {
      id: 1.2,
      event_title: 1.4,
      is_team_registration: 0.8,
      team_name: 1.2,
      total_members: 0.7,
      full_name: 1.4,
      participant_type: 0.9,
      email: 1.6,
      phone: 1.0,
      photo_url: 0.7,
      college: 1.5,
      registration_date: 1.1,
      status: 0.8,
      team_members: 2.2,
      team_phones: 2.2,
    };
    const minW: Partial<Record<RegistrationColumnKey, number>> = {
      id: 22,
      event_title: 34,
      is_team_registration: 18,
      team_name: 24,
      total_members: 16,
      full_name: 28,
      participant_type: 20,
      email: 30,
      phone: 24,
      photo_url: Math.max(thumbPx * 0.35, 16),
      college: 28,
      registration_date: 28,
      status: 18,
      team_members: 42,
      team_phones: 45,
    };
    const maxW: Partial<Record<RegistrationColumnKey, number>> = {
      event_title: landscape ? 80 : 65,
      email: 55,
      college: 55,
      team_members: landscape ? 100 : 75,
      team_phones: landscape ? 100 : 75,
    };

    const totalWeight = selectedDefs.reduce((sum, d) => sum + (weights[d.key] || 1), 0);
    const desired = selectedDefs.map(d => {
      const k = d.key as RegistrationColumnKey;
      const frac = (weights[k] || 1) / (totalWeight || 1);
      const raw = Math.max(10, frac * availableWidth);
      const wMin = minW[k] || 16;
      const wMax = maxW[k] || Math.max(24, availableWidth / selectedDefs.length * 1.75);
      return Math.min(Math.max(raw, wMin), wMax);
    });
  // Apply a slight global shrink so the table doesn't hug the right edge
  let scaled = desired.map(w => w * 0.98);
    const sumDesired = desired.reduce((a, b) => a + b, 0);
    if (sumDesired > availableWidth) {
      const scale = availableWidth / sumDesired;
      scaled = desired.map((w, idx) => {
        const k = selectedDefs[idx].key as RegistrationColumnKey;
        const wMin = minW[k] || 16;
        return Math.max(w * scale, wMin);
      });
      // Trim overflow by shaving from widest columns until it fits
      let over = scaled.reduce((a, b) => a + b, 0) - availableWidth;
      if (over > 0) {
        const order = scaled.map((w, i) => ({ i, w })).sort((a, b) => b.w - a.w).map(x => x.i);
        let j = 0;
        while (over > 0 && j < order.length * 6) {
          const i = order[j % order.length];
          const k = selectedDefs[i].key as RegistrationColumnKey;
          const wMin = minW[k] || 16;
          const delta = Math.min(0.5, over);
          const newW = Math.max(wMin, scaled[i] - delta);
          const actualDelta = scaled[i] - newW;
          scaled[i] = newW;
          over -= actualDelta;
          j++;
        }
      }
    }

    // Apply computed widths to column styles
    const columnStyles: Record<number, any> = {};
    selectedDefs.forEach((d, idx) => {
      const base: any = { cellWidth: scaled[idx], halign: 'left' };
      if (d.key === 'team_members' || d.key === 'team_phones') base.overflow = 'linebreak';
      if (d.key === 'phone') base.overflow = 'linebreak';
      columnStyles[idx + EXTRA_COLS] = base;
    });
    // Add styles for injected columns
    columnStyles[0] = { cellWidth: 12, halign: 'center' }; // S.No
    columnStyles[1] = { cellWidth: 22, fontStyle: 'bold' }; // Reg No

    // Ensure minimum for photo column tied to thumb size
    if (photoKeyIncluded && photoColIndex >= 0) {
      columnStyles[photoColIndex + EXTRA_COLS] = { cellWidth: Math.max(columnStyles[photoColIndex + EXTRA_COLS]?.cellWidth || 0, Math.max(thumbPx * 0.4, 18)) };
    }

    autoTable(doc as any, {
      head: [printableHeaders],
      body: sliceBody,
  styles: { fontSize, overflow: 'linebreak', minCellHeight: Math.max(10, photoKeyIncluded ? Math.ceil(thumbPx * 0.75) : 10), cellPadding: 1.1, valign: 'middle' },
    headStyles: { fillColor: [20,20,20], textColor: [255,255,255], halign: 'center', valign: 'middle', fontSize: Math.max(8, fontSize) },
      columnStyles,
  // Reduce side margins to utilize page width better; let autotable wrap to fit
  margin,
  tableWidth: 'wrap',
    pageBreak: 'auto',
      didDrawCell: (data: any) => {
        if (!photoKeyIncluded || photoColIndex < 0) return;
        if (data.section !== 'body') return;
        if (data.column.index !== (photoColIndex + EXTRA_COLS)) return;
        const rowIdx = data.row.index;
        const img = preloaded[rowIdx] || null;
        if (!img) return;
        const padding = 1.5;
        const maxW = Math.max(8, Math.min(thumbPx, data.cell.width - padding * 2));
        const maxH = Math.max(8, Math.min(thumbPx, data.cell.height - padding * 2));
        // Draw centered thumbnail; rely on uniform thumb sizing
        let w = maxW;
        let h = maxH;
        if (img.w && img.h) {
          const r = img.w / img.h;
          const boxR = maxW / maxH;
          if (r > boxR) {
            // image is wider than box
            w = maxW; h = Math.min(maxH, w / r);
          } else {
            // image is taller
            h = maxH; w = Math.min(maxW, h * r);
          }
        }
        const x = data.cell.x + (data.cell.width - w) / 2;
        const y = data.cell.y + (data.cell.height - h) / 2;
        try { (doc as any).addImage(img.dataUrl, img.format, x, y, w, h); } catch { /* ignore draw errors */ }
      },
      didDrawPage: () => {
        // Add watermark if provided
        if (opts.watermarkDataUrl) {
          try {
            const pW = (doc as any).internal.pageSize.getWidth();
            const pH = (doc as any).internal.pageSize.getHeight();
            const wmW = pW * 0.6;
            const wmH = pH * 0.6;
            const x = (pW - wmW) / 2;
            const y = (pH - wmH) / 2;
            doc.saveGraphicsState();
            const gState = new (doc as any).GState({ opacity: 0.12 });
            doc.setGState(gState);
            doc.addImage(opts.watermarkDataUrl, 'PNG', x, y, wmW, wmH);
            doc.restoreGraphicsState();
          } catch (e) { console.error('Watermark failed:', e); }
        }
        // Add stamp at right edge, vertically centered (not overlapping table)
        if (opts.stampDataUrl) {
          try {
            const pW = (doc as any).internal.pageSize.getWidth();
            const pH = (doc as any).internal.pageSize.getHeight();
            const stampSize = 60;
            const marginRight = -15; // Shifted further right
            const x = pW - stampSize - marginRight;
            const y = (pH - stampSize) / 2; // Vertically centered
            doc.addImage(opts.stampDataUrl, 'PNG', x, y, stampSize, stampSize);
          } catch (e) { console.error('Stamp failed:', e); }
        }
        doc.setFontSize(9);
        doc.text(`${base} • Rows: ${sliceBody.length} • Generated: ${new Date().toLocaleString()}${total>1?` • Part ${index+1}/${total}`:''}`, 14, 8);
      }
    });
    const name = `${base}${total>1?`-part${index+1}`:''}.pdf`;
    doc.save(name);
  };

  if (!split || body.length <= split) {
    await saveDoc(body, rows, 0, 1);
    return;
  }
  const totalParts = Math.ceil(body.length / split);
  for (let i = 0; i < body.length; i += split) {
    const slice = body.slice(i, i + split);
    const sliceRows = rows.slice(i, i + split);
    await saveDoc(slice, sliceRows, i / split, totalParts);
  }
};
