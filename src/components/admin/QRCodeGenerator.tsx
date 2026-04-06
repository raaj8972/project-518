import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';

interface QRCodeGeneratorProps {
  passToken: string;
  participantName?: string | null;
  passType?: string;
  size?: number;
}

export function QRCodeGenerator({
  passToken,
  participantName,
  passType,
  size = 256,
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `pass-${passToken.substring(0, 12)}.png`;
    link.click();
  };

  const printQR = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const imageUrl = canvas.toDataURL('image/png');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Entry Pass - ${participantName || 'Guest'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .pass-container {
              text-align: center;
              border: 2px solid #000;
              padding: 30px;
              max-width: 400px;
            }
            h1 {
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .name {
              font-size: 18px;
              font-weight: bold;
              margin: 20px 0 10px 0;
            }
            .type {
              font-size: 14px;
              color: #666;
              margin-bottom: 20px;
              text-transform: uppercase;
            }
            img {
              margin: 20px 0;
            }
            .instructions {
              font-size: 12px;
              color: #666;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="pass-container">
            <h1>🎭 RICORRENZA 2025</h1>
            <div class="type">${passType || 'Entry Pass'}</div>
            ${participantName ? `<div class="name">${participantName}</div>` : ''}
            <img src="${imageUrl}" alt="QR Code" />
            <div class="instructions">
              Please present this QR code at the entry gate.<br/>
              This pass is valid for one-time entry only.
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div 
        ref={canvasRef}
        className="p-6 bg-white rounded-lg shadow-xl"
      >
        <QRCodeCanvas
          value={passToken}
          size={size}
          level="H"
          includeMargin
        />
      </div>

      {participantName && (
        <div className="text-center">
          <p className="text-lg font-semibold text-white">{participantName}</p>
          {passType && (
            <p className="text-sm text-gray-400 uppercase tracking-wide">
              {passType.replace('_', ' ')}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={downloadQR}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <button
          onClick={printQR}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>
    </div>
  );
}
