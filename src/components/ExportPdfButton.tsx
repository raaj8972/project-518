import React from 'react';
import { exportPdf } from '../utils/reportExport';

type Props = {
  rows: any[];
  columns: string[];
  filename?: string;
  className?: string;
};

export const ExportPdfButton: React.FC<Props> = ({ rows, columns, filename = 'export.pdf', className }) => {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    if (loading) return;
    try {
      setLoading(true);
      // exportPdf already dynamically imports jsPDF/autotable, so this
      // will only download the heavy libs the first time it's called.
      await exportPdf(rows, columns, { filename });
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
