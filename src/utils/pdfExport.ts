import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Audition } from '../context/DataContext';

interface PDFExportOptions {
  filename?: string;
  title?: string;
  includeDetails?: boolean;
}

/**
 * Export auditions to a formatted PDF document
 * @param auditions - Array of audition data to export
 * @param options - Export configuration options
 */
export const exportAuditionsToPDF = (
  auditions: Audition[],
  options: PDFExportOptions = {}
) => {
  const {
    filename = 'auditions-report.pdf',
    title = 'Audition Applications Report',
    includeDetails = true
  } = options;

  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(title, pageWidth / 2, 15, { align: 'center' });

  // Add generation timestamp
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
  doc.text(`Generated on: ${timestamp}`, pageWidth / 2, 22, { align: 'center' });

  // Add summary statistics
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const totalCount = auditions.length;
  const pendingCount = auditions.filter(a => a.status === 'pending').length;
  const reviewedCount = auditions.filter(a => a.status === 'reviewed').length;
  const contactedCount = auditions.filter(a => a.status === 'contacted').length;
  
  const summaryText = `Total: ${totalCount} | Pending: ${pendingCount} | Reviewed: ${reviewedCount} | Contacted: ${contactedCount}`;
  doc.text(summaryText, pageWidth / 2, 28, { align: 'center' });

  // Prepare table data
  const tableData = auditions.map(audition => [
    audition.full_name,
    audition.participant_type,
    audition.instrument_role,
    audition.email,
    audition.phone,
    audition.status.charAt(0).toUpperCase() + audition.status.slice(1),
    new Date(audition.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  ]);

  // Create main table
  autoTable(doc, {
    startY: 35,
    head: [['Name', 'Type', 'Instrument/Role', 'Email', 'Phone', 'Status', 'Date']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 50
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' }, // Name
      1: { cellWidth: 25 }, // Type
      2: { cellWidth: 35 }, // Instrument/Role
      3: { cellWidth: 50 }, // Email
      4: { cellWidth: 30 }, // Phone
      5: { cellWidth: 25, halign: 'center' }, // Status
      6: { cellWidth: 25, halign: 'center' } // Date
    },
    didDrawCell: (data) => {
      // Color code status cells
      if (data.column.index === 5 && data.section === 'body') {
        const status = data.cell.raw as string;
        let fillColor: [number, number, number] = [255, 255, 255];
        
        if (status === 'Pending') {
          fillColor = [255, 243, 205]; // Yellow
        } else if (status === 'Reviewed') {
          fillColor = [209, 231, 255]; // Blue
        } else if (status === 'Contacted') {
          fillColor = [209, 250, 229]; // Green
        }
        
        doc.setFillColor(...fillColor);
        doc.rect(
          data.cell.x,
          data.cell.y,
          data.cell.width,
          data.cell.height,
          'F'
        );
        
        // Redraw text on top
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        doc.text(
          status,
          data.cell.x + data.cell.width / 2,
          data.cell.y + data.cell.height / 2 + 1.5,
          { align: 'center' }
        );
      }
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Add page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Add footer
      doc.setFontSize(8);
      doc.text(
        'Home Bound Band - Ricorrenza 2026',
        10,
        pageHeight - 10
      );
    }
  });

  // Add detailed information section if requested
  if (includeDetails && auditions.length > 0) {
    // Add new page for details
    doc.addPage();
    
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Detailed Information', 15, 20);

    let currentY = 30;
    const leftMargin = 15;
    const rightMargin = pageWidth - 15;
    const contentWidth = rightMargin - leftMargin;

    auditions.forEach((audition, index) => {
      // Check if we need a new page
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
      }

      // Applicant header
      doc.setFillColor(240, 240, 240);
      doc.rect(leftMargin, currentY - 5, contentWidth, 10, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(41, 128, 185);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${audition.full_name}`, leftMargin + 2, currentY);
      
      // Status badge
      const statusText = audition.status.charAt(0).toUpperCase() + audition.status.slice(1);
      const statusWidth = doc.getTextWidth(statusText) + 6;
      let statusColor: [number, number, number] = [255, 193, 7]; // Yellow for pending
      
      if (audition.status === 'reviewed') statusColor = [33, 150, 243]; // Blue
      if (audition.status === 'contacted') statusColor = [76, 175, 80]; // Green
      
      doc.setFillColor(...statusColor);
      doc.roundedRect(rightMargin - statusWidth - 2, currentY - 4, statusWidth, 7, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(statusText, rightMargin - statusWidth / 2 - 2, currentY, { align: 'center' });

      currentY += 10;

      // Details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);

      const details = [
        `Participant Type: ${audition.participant_type}`,
        `Instrument/Role: ${audition.instrument_role}`,
        `Email: ${audition.email}`,
        `Phone: ${audition.phone}`,
        `Application Date: ${new Date(audition.created_at).toLocaleString('en-IN')}`
      ];

      if (audition.portfolio_link) {
        details.push(`Portfolio: ${audition.portfolio_link}`);
      }

      details.forEach(detail => {
        doc.text(detail, leftMargin + 2, currentY);
        currentY += 5;
      });

      // Experience & Motivation
      if (audition.experience_motivation) {
        currentY += 2;
        doc.setFont('helvetica', 'bold');
        doc.text('Experience & Motivation:', leftMargin + 2, currentY);
        currentY += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const motivationLines = doc.splitTextToSize(
          audition.experience_motivation,
          contentWidth - 4
        );
        
        motivationLines.forEach((line: string) => {
          if (currentY > pageHeight - 20) {
            doc.addPage();
            currentY = 20;
          }
          doc.text(line, leftMargin + 2, currentY);
          currentY += 4;
        });
      }

      currentY += 8; // Space before next entry
    });
  }

  // Save the PDF
  doc.save(filename);
};

/**
 * Export auditions grouped by status
 */
export const exportAuditionsByStatus = (auditions: Audition[]) => {
  const groupedAuditions = {
    pending: auditions.filter(a => a.status === 'pending'),
    reviewed: auditions.filter(a => a.status === 'reviewed'),
    contacted: auditions.filter(a => a.status === 'contacted')
  };

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title page
  doc.setFontSize(24);
  doc.setTextColor(41, 128, 185);
  doc.text('Audition Applications', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text('Grouped by Status Report', pageWidth / 2, pageHeight / 2 - 5, { align: 'center' });
  
  doc.setFontSize(12);
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
  doc.text(timestamp, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

  // Process each status group
  const statusGroups: Array<{ status: keyof typeof groupedAuditions; title: string; color: [number, number, number] }> = [
    { status: 'pending', title: 'Pending Auditions', color: [255, 193, 7] },
    { status: 'reviewed', title: 'Reviewed Auditions', color: [33, 150, 243] },
    { status: 'contacted', title: 'Contacted Auditions', color: [76, 175, 80] }
  ];

  statusGroups.forEach(({ status, title, color }) => {
    const statusAuditions = groupedAuditions[status];
    
    if (statusAuditions.length === 0) return;

    doc.addPage();

    // Section header
    doc.setFillColor(...color);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Total: ${statusAuditions.length} applicant${statusAuditions.length !== 1 ? 's' : ''}`, pageWidth / 2, 25, { align: 'center' });

    // Table data
    const tableData = statusAuditions.map(audition => [
      audition.full_name,
      audition.participant_type,
      audition.instrument_role,
      audition.email,
      audition.phone,
      new Date(audition.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Name', 'Type', 'Instrument/Role', 'Email', 'Phone', 'Date']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: color,
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: 50
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 30 },
        2: { cellWidth: 45 },
        3: { cellWidth: 55 },
        4: { cellWidth: 35 },
        5: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });
  });

  doc.save('auditions-by-status.pdf');
};
