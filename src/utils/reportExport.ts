// Centralized report export utility (Excel, PDF, CSV) with column presets and splitting
import type { Registration } from '../context/DataContext';

export type RegistrationColumnKey =
  | 'id' | 'event_title' | 'is_team_registration' | 'team_name' | 'total_members'
  | 'full_name' | 'participant_type' | 'email' | 'phone' | 'college' | 'motivation'
  | 'registration_date' | 'status' | 'team_members';

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
  { key: 'college', header: 'College/Institution' },
  { key: 'motivation', header: 'Motivation', accessor: r => r.motivation || 'Not provided' },
  { key: 'registration_date', header: 'Registration Date', accessor: r => new Date(r.registration_date).toLocaleString() },
  { key: 'status', header: 'Status', accessor: r => r.status.toUpperCase() },
  { key: 'team_members', header: 'Team Members', accessor: r => (r.is_team_registration && r.team_members) ? r.team_members.map((m: any) => `${m.name} (${m.email})`).join('; ') : 'N/A' }
];

// Presets: Minimal, Full, Team-only detail
export const EXPORT_PRESETS: Record<string, RegistrationColumnKey[]> = {
  minimal: ['full_name','email','phone','event_title','status'],
  full: REGISTRATION_COLUMNS.map(c => c.key),
  'team-only': ['team_name','total_members','team_members','event_title','status']
};

export interface BuildMatrixOptions {
  rows: Registration[];
  columns: RegistrationColumnKey[];
}

export const buildMatrix = ({ rows, columns }: BuildMatrixOptions) => {
  const selectedDefs = columns.map(k => REGISTRATION_COLUMNS.find(c => c.key === k)!).filter(Boolean);
  const headers = selectedDefs.map(c => c.header);
  const body = rows.map(r => selectedDefs.map(col => col.accessor ? col.accessor(r) : (r as any)[col.key]));
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
  const XLSX = await import('xlsx');
  const { headers, body } = buildMatrix({ rows, columns });
  const json = body.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(json);
  // Auto width
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
}

export const exportPdf = async (rows: Registration[], columns: RegistrationColumnKey[], opts: PdfExportOptions = {}) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const { headers, body } = buildMatrix({ rows, columns });
  const split = opts.splitThreshold && opts.splitThreshold > 0 ? opts.splitThreshold : null;
  const landscape = opts.landscape !== false; // default landscape
  const fontSize = opts.fontSize || 7;
  const base = opts.baseFileName || 'registrations';

  const saveDoc = (sliceBody: any[][], index: number, total: number) => {
    const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait' });
    autoTable(doc as any, {
      head: [headers],
      body: sliceBody,
      styles: { fontSize },
      headStyles: { fillColor: [30,30,30] },
      didDrawPage: () => {
        doc.setFontSize(9);
        doc.text(`${base} • Rows: ${sliceBody.length} • Generated: ${new Date().toLocaleString()}${total>1?` • Part ${index+1}/${total}`:''}`, 14, 8);
      }
    });
    const name = `${base}${total>1?`-part${index+1}`:''}.pdf`;
    doc.save(name);
  };

  if (!split || body.length <= split) {
    saveDoc(body, 0, 1);
    return;
  }
  const totalParts = Math.ceil(body.length / split);
  for (let i = 0; i < body.length; i += split) {
    const slice = body.slice(i, i + split);
    saveDoc(slice, i / split, totalParts);
  }
};
