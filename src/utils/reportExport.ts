// Centralized report export utility (Excel, PDF, CSV) with column presets and splitting
import type { Registration } from '../context/DataContext';

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
  | 'full_name' | 'participant_type' | 'email' | 'phone' | 'college' | 'motivation'
  | 'registration_date' | 'status' | 'team_members' | 'team_phones' | 'photo_url';

export interface ColumnDefinition {
  key: RegistrationColumnKey;
  header: string;
  width?: number; // desired width hint
  accessor?: (r: Registration) => any;
}

// Base column definitions
export const REGISTRATION_COLUMNS: ColumnDefinition[] = [
  { key: 'id', header: 'Registration ID' },
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
  { key: 'motivation', header: 'Motivation', accessor: r => r.motivation || 'Not provided' },
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
  if (!photoIncluded) {
    // Fast path using xlsx (no images)
    const XLSX = await import('xlsx');
    const { headers, body } = buildMatrix({ rows, columns });
    const json = body.map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
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
    return;
  }

  // Image path using exceljs (browser build)
  const ExcelJS: any = await import('exceljs');
  const wb = new (ExcelJS as any).Workbook();
  const ws = wb.addWorksheet('Registrations');

  const selectedDefs = columns.map(k => REGISTRATION_COLUMNS.find(c => c.key === k)!).filter(Boolean);
  const headers = selectedDefs.map(c => (c.key === 'photo_url' ? 'Photo' : c.header));
  const photoColIndex = selectedDefs.findIndex(d => d.key === 'photo_url');
  const photoCol = photoColIndex >= 0 ? photoColIndex + 1 : -1; // 1-based

  ws.addRow(headers);
  // Set base column widths
  ws.columns = headers.map((h, idx) => ({ width: idx + 1 === photoCol ? 12 : Math.min(Math.max(h.length + 4, 12), 40) }));

  // Helper to fetch as data URL
  const fetchDataUrl = async (url: string): Promise<{ base64: string; ext: 'png' | 'jpeg' } | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const type = (blob.type || '').toLowerCase();
      const ext: 'png' | 'jpeg' = type.includes('png') ? 'png' : 'jpeg';
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(new Error('file read error'));
        fr.onload = () => resolve(String(fr.result || ''));
        fr.readAsDataURL(blob);
      });
      const base64 = dataUrl.split(',')[1] || '';
      return { base64, ext };
    } catch {
      return null;
    }
  };

  // Add rows and track image requests
  const imageRequests: Array<Promise<{ row: number; imgId: number | null }>> = [];
  rows.forEach((r, idx) => {
    const values: any[] = selectedDefs.map(def => {
      if (def.key === 'photo_url') return '';
      return def.accessor ? def.accessor(r) : (r as any)[def.key];
    });
    ws.addRow(values);
    if (photoCol > 0) {
      const url = (r as any).photo_url as string | undefined;
      if (url) {
        const p = fetchDataUrl(url).then((data) => {
          if (!data) return { row: idx + 2, imgId: null };
          const imgId = wb.addImage({ base64: data.base64, extension: data.ext });
          return { row: idx + 2, imgId };
        });
        imageRequests.push(p);
      }
    }
  });

  // Increase row heights for image visibility
  const rowHeightPx = 32; // about 24pt
  for (let i = 2; i <= rows.length + 1; i++) {
    ws.getRow(i).height = Math.round(rowHeightPx * 0.75); // exceljs uses points
  }

  // Place images after all rows are present
  const results = await Promise.all(imageRequests);
  const thumbW = 24; const thumbH = 24; // pixels
  results.forEach(({ row, imgId }) => {
    if (!imgId || photoCol <= 0) return;
    try {
      ws.addImage(imgId, {
        tl: { col: photoCol - 1 + 0.15, row: row - 1 + 0.15 },
        ext: { width: thumbW, height: thumbH },
      });
    } catch {/* ignore */}
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export interface PdfExportOptions {
  splitThreshold?: number; // rows per file before splitting
  baseFileName?: string;
  landscape?: boolean;
  fontSize?: number;
  photoThumbSize?: number; // px size of photo thumb inside cell
}

export const exportPdf = async (rows: Registration[], columns: RegistrationColumnKey[], opts: PdfExportOptions = {}) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const { headers, body } = buildMatrix({ rows, columns });
  const photoKeyIncluded = columns.includes('photo_url');
  const selectedDefs = columns.map(k => REGISTRATION_COLUMNS.find(c => c.key === k)!).filter(Boolean);
  const photoColIndex = photoKeyIncluded ? selectedDefs.findIndex(d => d.key === 'photo_url') : -1;
  if (photoKeyIncluded && photoColIndex >= 0) {
    // Hide raw URLs in the PDF table; we'll draw thumbs instead in didDrawCell
    headers[photoColIndex] = 'Photo';
    for (const row of body) row[photoColIndex] = ' ';
  }
  const split = opts.splitThreshold && opts.splitThreshold > 0 ? opts.splitThreshold : null;
  const landscape = opts.landscape !== false; // default landscape
  const fontSize = opts.fontSize || 8; // slightly larger for readability
  const base = opts.baseFileName || 'registrations';
  const thumbPx = Math.max(12, Math.min(opts.photoThumbSize || 18, 64));

  // Build column style hints to prevent squished text when custom columns are selected
  const widthHints: Partial<Record<RegistrationColumnKey, number>> = {
    id: 36,
    event_title: 26,
    is_team_registration: 18,
    team_name: 24,
    total_members: 14,
    full_name: 24,
    participant_type: 22,
    email: 30,
    phone: 22,
    college: 30,
    motivation: 36,
    registration_date: 28,
    status: 18,
    team_members: 40,
    team_phones: 28,
    photo_url: Math.max(thumbPx + 6, 18)
  };

  const columnStyles: Record<number, any> = {};
  selectedDefs.forEach((def, idx) => {
    const w = widthHints[def.key as RegistrationColumnKey];
    if (w) columnStyles[idx] = { cellWidth: w, overflow: 'linebreak' };
  });

  // Helper: fetch an image URL and return data URL + format compatible with jsPDF
  const fetchImageDataUrl = async (url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG'; w: number; h: number } | null> => {
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const type = (blob.type || '').toLowerCase();
      const asFormat: 'PNG' | 'JPEG' = type.includes('png') ? 'PNG' : 'JPEG';
      // Convert to data URL without canvas to avoid CORS taint issues
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(new Error('file read error'));
        fr.onload = () => resolve(String(fr.result || ''));
        fr.readAsDataURL(blob);
      });
      // Determine intrinsic size to preserve aspect ratio
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
    autoTable(doc as any, {
      head: [headers],
      body: sliceBody,
      margin: { top: 14, left: 10, right: 10, bottom: 12 },
      styles: {
        fontSize,
        overflow: 'linebreak',
        cellPadding: 1.2,
        minCellHeight: photoKeyIncluded ? Math.max(10, Math.ceil(thumbPx * 0.75)) : undefined,
        valign: 'middle'
      },
      headStyles: { fillColor: [30,30,30] },
      columnStyles: columnStyles,
      didDrawCell: (data: any) => {
        if (!photoKeyIncluded || photoColIndex < 0) return;
        if (data.section !== 'body') return;
        if (data.column.index !== photoColIndex) return;
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
