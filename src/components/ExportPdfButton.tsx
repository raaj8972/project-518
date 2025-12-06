import React from 'react';
import { exportPdf, REGISTRATION_COLUMNS } from '../utils/reportExport';
import type { RegistrationColumnKey } from '../utils/reportExport';

type Props = {
  rows: any[];
  columns: string[];
  filename?: string;
  className?: string;
  watermarkDataUrl?: string | null;
  stampDataUrl?: string | null;
};

export const ExportPdfButton: React.FC<Props> = ({ rows, columns, filename = 'export.pdf', className, watermarkDataUrl, stampDataUrl }) => {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    if (loading) return;
    try {
      setLoading(true);
      // exportPdf already dynamically imports jsPDF/autotable, so this
      // will only download the heavy libs the first time it's called.
      // Validate and narrow incoming string[] to RegistrationColumnKey[]
      const allowed = new Set<string>(REGISTRATION_COLUMNS.map(c => c.key));
      const isRegistrationColumnKey = (s: string): s is RegistrationColumnKey => allowed.has(s);
      const validated: RegistrationColumnKey[] = columns.filter(isRegistrationColumnKey);
      if (validated.length === 0) {
        console.warn('ExportPdfButton: no valid columns provided, aborting export', columns);
        alert('No valid columns selected for export.');
        return;
      }
      if (validated.length !== columns.length) console.warn('ExportPdfButton: some requested columns were ignored', columns.filter(c => !isRegistrationColumnKey(c)));

  await exportPdf(rows, validated, { baseFileName: filename, watermarkDataUrl, stampDataUrl });
    } catch (err) {
      console.error('PDF export failed', err);
      // Keep UI simple for now; the app has a Toast/Alert system if needed.
      alert('PDF export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={className ?? `flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-purple-500'}`}
    >
      {loading ? 'Preparing PDF…' : 'Export PDF'}
    </button>
  );
};

export default ExportPdfButton;
