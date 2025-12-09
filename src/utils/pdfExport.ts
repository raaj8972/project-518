import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Audition } from '../context/DataContext';

// Watermark cache - stores pre-loaded watermark image data
let watermarkCache: { url: string; dataUrl: string } | null = null;

/**
 * Preload watermark image from URL and cache as base64 data URL
 */
export const preloadWatermark = async (url: string): Promise<string | null> => {
  if (!url) return null;
  
  // Return cached if same URL
  if (watermarkCache && watermarkCache.url === url) {
    return watermarkCache.dataUrl;
  }
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        watermarkCache = { url, dataUrl };
        resolve(dataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to preload watermark:', error);
    return null;
  }
};

/**
 * Add watermark to a PDF page
 * Uses GState for transparency - large centered watermark at low opacity
 */
const addWatermarkToPage = (doc: jsPDF, watermarkDataUrl: string | null) => {
  if (!watermarkDataUrl) return;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Large watermark - 60% of page, centered
  const wmWidth = pageWidth * 0.6;
  const wmHeight = pageHeight * 0.6;
  const x = (pageWidth - wmWidth) / 2;
  const y = (pageHeight - wmHeight) / 2;
  
  try {
    // Save graphics state, set opacity, add image, restore
    doc.saveGraphicsState();
    // @ts-ignore - GState exists but types may not include it
    const gState = new (doc as any).GState({ opacity: 0.12 }); // 12% opacity for readability
    doc.setGState(gState);
    doc.addImage(watermarkDataUrl, 'PNG', x, y, wmWidth, wmHeight);
    doc.restoreGraphicsState();
  } catch (error) {
    console.error('Failed to add watermark:', error);
  }
};

/**
 * Add stamp to bottom right corner of a PDF page
 * Stamp is fully opaque and sized appropriately
 */
const addStampToPage = (doc: jsPDF, stampDataUrl: string | null) => {
  if (!stampDataUrl) return;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Stamp at bottom right - 70mm x 70mm for excellent visibility
  const stampSize = 70;
  const margin = 10;
  const x = pageWidth - stampSize - margin;
  const y = pageHeight - stampSize - margin;
  
  try {
    doc.addImage(stampDataUrl, 'PNG', x, y, stampSize, stampSize);
  } catch (error) {
    console.error('Failed to add stamp:', error);
  }
};

interface PDFExportOptions {
  filename?: string;
  title?: string;
  includeDetails?: boolean;
  watermarkDataUrl?: string | null;
  stampDataUrl?: string | null;
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
    includeDetails = true,
    watermarkDataUrl,
    stampDataUrl
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

    // Decorations applied in post-processing loop
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

  // Apply decorations (Watermark, Stamp, Footer, Page Numbers) to ALL pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Add watermark
    addWatermarkToPage(doc, watermarkDataUrl || null);

    // Footer & Page Numbers
    const pWidth = doc.internal.pageSize.getWidth();
    const pHeight = doc.internal.pageSize.getHeight();
    
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pWidth / 2,
      pHeight - 10,
      { align: 'center' }
    );

    doc.setFontSize(8);
    doc.text(
      'Home Bound Band - Ricorrenza 2026',
      10,
      pHeight - 10
    );
    
    // Add stamp at bottom right
    addStampToPage(doc, stampDataUrl || null);
  }

  // Save the PDF
  doc.save(filename);
};

/**
 * Export auditions grouped by status
 */
export const exportAuditionsByStatus = (auditions: Audition[], watermarkDataUrl?: string | null, stampDataUrl?: string | null) => {
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
      // Decorations applied in post-processing loop
    });
  });

  // Apply decorations (Watermark, Stamp, Footer, Page Numbers) to ALL pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Watermark
    addWatermarkToPage(doc, watermarkDataUrl || null);
    
    // Page numbers & Footer
    const pWidth = doc.internal.pageSize.getWidth();
    const pHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pWidth / 2,
      pHeight - 10,
      { align: 'center' }
    );

    doc.setFontSize(8);
    doc.text(
      'Home Bound Band - Ricorrenza 2026',
      10,
      pHeight - 10
    );
    
    // Stamp
    addStampToPage(doc, stampDataUrl || null);
  }

  doc.save('auditions-by-status.pdf');
};

/**
 * Enhanced PDF Export for Registrations
 */

import type { Registration } from '../context/DataContext';

// Helper to safely parse team members
const safeTeamMembers = (r: any): any[] => {
  const tm = (r as any)?.team_members;
  if (Array.isArray(tm)) return tm;
  if (typeof tm === 'string') {
    try {
      const parsed = JSON.parse(tm);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
};

interface RegistrationPDFOptions {
  filename?: string;
  title?: string;
  watermarkDataUrl?: string | null;
  stampDataUrl?: string | null;
}

/**
 * Export registrations to a formatted PDF document
 */
export const exportRegistrationsToPDF = (
  registrations: Registration[],
  options: RegistrationPDFOptions = {}
) => {
  const {
    filename = 'registrations-report.pdf',
    title = 'Event Registrations Report',
    watermarkDataUrl = null,
    stampDataUrl = null
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(title, pageWidth / 2, 15, { align: 'center' });

  // Timestamp
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
  doc.text(`Generated on: ${timestamp}`, pageWidth / 2, 22, { align: 'center' });

  // Summary statistics
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const totalCount = registrations.length;
  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const approvedCount = registrations.filter(r => r.status === 'approved').length;
  const rejectedCount = registrations.filter(r => r.status === 'rejected').length;
  const teamCount = registrations.filter(r => r.is_team_registration).length;
  const individualCount = totalCount - teamCount;

  const summaryText = `Total: ${totalCount} | Individual: ${individualCount} | Team: ${teamCount} | Pending: ${pendingCount} | Approved: ${approvedCount} | Rejected: ${rejectedCount}`;
  doc.text(summaryText, pageWidth / 2, 28, { align: 'center' });

  // Prepare table data
  const tableData = registrations.map(reg => {
    const teamInfo = reg.is_team_registration 
      ? `${reg.team_name} (${reg.total_members} members)`
      : 'Individual';
    
    return [
      reg.full_name,
      reg.participant_type,
      reg.event_title,
      teamInfo,
      reg.email,
      reg.phone,
      reg.college || 'N/A',
      reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
      new Date(reg.registration_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    ];
  });

  // Create main table
  autoTable(doc, {
    startY: 35,
    head: [['Name', 'Type', 'Event', 'Team/Individual', 'Email', 'Phone', 'College', 'Status', 'Date']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [52, 152, 219],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 50
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' }, // Name
      1: { cellWidth: 20 }, // Type
      2: { cellWidth: 35 }, // Event
      3: { cellWidth: 30 }, // Team/Individual
      4: { cellWidth: 45 }, // Email
      5: { cellWidth: 25 }, // Phone
      6: { cellWidth: 30 }, // College
      7: { cellWidth: 20, halign: 'center' }, // Status
      8: { cellWidth: 22, halign: 'center' } // Date
    },
    didDrawCell: (data) => {
      // Color code status cells
      if (data.column.index === 7 && data.section === 'body') {
        const status = data.cell.raw as string;
        let fillColor: [number, number, number] = [255, 255, 255];
        
        if (status === 'Pending') {
          fillColor = [255, 243, 205]; // Yellow
        } else if (status === 'Approved') {
          fillColor = [209, 250, 229]; // Green
        } else if (status === 'Rejected') {
          fillColor = [254, 226, 226]; // Red
        }
        
        doc.setFillColor(...fillColor);
        doc.rect(
          data.cell.x,
          data.cell.y,
          data.cell.width,
          data.cell.height,
          'F'
        );
        
        // Redraw text
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(8);
        doc.text(
          status,
          data.cell.x + data.cell.width / 2,
          data.cell.y + data.cell.height / 2 + 1.5,
          { align: 'center' }
        );
      }
    },
    margin: { left: 10, right: 10 },

    // didDrawPage removed - we will apply decorations to all pages at the end
  });

  // Add team details page if there are team registrations
  const teamRegistrations = registrations.filter(r => r.is_team_registration);
  
  if (teamRegistrations.length > 0) {
    doc.addPage();
    
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Team Registration Details', 15, 20);

    let currentY = 30;
    const leftMargin = 15;
    const rightMargin = pageWidth - 15;
    const contentWidth = rightMargin - leftMargin;

    teamRegistrations.forEach((reg, index) => {
      // Check if we need a new page
      if (currentY > pageHeight - 70) {
        doc.addPage();
        currentY = 20;
      }

      // Team header
      doc.setFillColor(240, 240, 240);
      doc.rect(leftMargin, currentY - 5, contentWidth, 10, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(52, 152, 219);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${reg.team_name || 'Team'}`, leftMargin + 2, currentY);
      
      // Status badge
      const statusText = reg.status.charAt(0).toUpperCase() + reg.status.slice(1);
      const statusWidth = doc.getTextWidth(statusText) + 6;
      let statusColor: [number, number, number] = [255, 193, 7];
      
      if (reg.status === 'approved') statusColor = [76, 175, 80];
      if (reg.status === 'rejected') statusColor = [244, 67, 54];
      
      doc.setFillColor(...statusColor);
      doc.roundedRect(rightMargin - statusWidth - 2, currentY - 4, statusWidth, 7, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(statusText, rightMargin - statusWidth / 2 - 2, currentY, { align: 'center' });

      currentY += 10;

      // Team details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);

      const details = [
        `Event: ${reg.event_title}`,
        `Team Leader: ${reg.full_name}`,
        `Email: ${reg.email}`,
        `Phone: ${reg.phone}`,
        `College: ${reg.college || 'N/A'}`,
        `Total Members: ${reg.total_members}`,
        `Registration Date: ${new Date(reg.registration_date).toLocaleString('en-IN')}`
      ];

      details.forEach(detail => {
        doc.text(detail, leftMargin + 2, currentY);
        currentY += 5;
      });

      // Team members list
      const members = safeTeamMembers(reg);
      if (members.length > 0) {
        currentY += 2;
        doc.setFont('helvetica', 'bold');
        doc.text('Team Members:', leftMargin + 2, currentY);
        currentY += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        members.forEach((member: any, idx: number) => {
          if (currentY > pageHeight - 20) {
            doc.addPage();
            currentY = 20;
          }
          
          const memberText = `${idx + 1}. ${member.name || 'N/A'} - ${member.phone || 'N/A'}`;
          doc.text(memberText, leftMargin + 4, currentY);
          currentY += 4;
        });
      }

      currentY += 10; // Space before next team
    });
  }

  // Apply decorations (Watermark, Stamp, Footer, Page Numbers) to ALL pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Add watermark (behind content if possible, but jsPDF layering is order-based. 
    // Since content is already drawn, watermark might overlay if opaque, but ours is transparent)
    // To be truly behind, we'd need to add it before content, but manual pages make that hard.
    // Given the low opacity (12%), overlaying is usually acceptable or even desired for watermark effect.
    addWatermarkToPage(doc, watermarkDataUrl);

    // Footer & Page Numbers
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    doc.setFontSize(8);
    doc.text(
      'Ricorrenza 2026',
      10,
      pageHeight - 10
    );
    
    // Add stamp at bottom right
    addStampToPage(doc, stampDataUrl);
  }

  doc.save(filename);
};

/**
 * Export registrations grouped by event
 */
export const exportRegistrationsByEvent = (registrations: Registration[], watermarkDataUrl?: string | null, stampDataUrl?: string | null) => {
  // Group by event
  const eventGroups: Record<string, Registration[]> = {};
  registrations.forEach(reg => {
    if (!eventGroups[reg.event_title]) {
      eventGroups[reg.event_title] = [];
    }
    eventGroups[reg.event_title].push(reg);
  });

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title page
  doc.setFontSize(24);
  doc.setTextColor(52, 152, 219);
  doc.text('Event Registrations', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text('Grouped by Event Report', pageWidth / 2, pageHeight / 2 - 5, { align: 'center' });
  
  doc.setFontSize(12);
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
  doc.text(timestamp, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

  // Process each event group
  const eventColors: Record<number, [number, number, number]> = {
    0: [52, 152, 219],  // Blue
    1: [155, 89, 182],  // Purple
    2: [46, 204, 113],  // Green
    3: [241, 196, 15],  // Yellow
    4: [231, 76, 60]    // Red
  };

  Object.entries(eventGroups).forEach(([eventTitle, eventRegs], groupIndex) => {
    const color = eventColors[groupIndex % 5] || [52, 152, 219];
    
    doc.addPage();

    // Event header
    doc.setFillColor(...color);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(eventTitle, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    const stats = `Total: ${eventRegs.length} | Pending: ${eventRegs.filter(r => r.status === 'pending').length} | Approved: ${eventRegs.filter(r => r.status === 'approved').length} | Rejected: ${eventRegs.filter(r => r.status === 'rejected').length}`;
    doc.text(stats, pageWidth / 2, 25, { align: 'center' });

    // Table data
    const tableData = eventRegs.map(reg => [
      reg.full_name,
      reg.participant_type,
      reg.is_team_registration ? `${reg.team_name} (${reg.total_members})` : 'Individual',
      reg.email,
      reg.phone,
      reg.college || 'N/A',
      reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
      new Date(reg.registration_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      })
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Name', 'Type', 'Team/Individual', 'Email', 'Phone', 'College', 'Status', 'Date']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: color,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 50
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 50 },
        4: { cellWidth: 28 },
        5: { cellWidth: 35 },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 20, halign: 'center' }
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        // Add watermark
        addWatermarkToPage(doc, watermarkDataUrl || null);
        
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        
        // Add stamp at bottom right
        addStampToPage(doc, stampDataUrl || null);
      }
    });
  });

  doc.save('registrations-by-event.pdf');
};

/**
 * Export registrations grouped by status
 */
export const exportRegistrationsByStatus = (registrations: Registration[], watermarkDataUrl?: string | null, stampDataUrl?: string | null) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title page
  doc.setFontSize(24);
  doc.setTextColor(52, 152, 219);
  doc.text('Event Registrations', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
  
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

  // Group by status
  const statusGroups: Array<{
    status: 'pending' | 'approved' | 'rejected';
    title: string;
    color: [number, number, number];
  }> = [
    { status: 'pending', title: 'Pending Registrations', color: [255, 193, 7] },
    { status: 'approved', title: 'Approved Registrations', color: [76, 175, 80] },
    { status: 'rejected', title: 'Rejected Registrations', color: [244, 67, 54] }
  ];

  statusGroups.forEach(({ status, title, color }) => {
    const statusRegs = registrations.filter(r => r.status === status);
    
    if (statusRegs.length === 0) return;

    doc.addPage();

    // Status header
    doc.setFillColor(...color);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Total: ${statusRegs.length} registration${statusRegs.length !== 1 ? 's' : ''}`, pageWidth / 2, 25, { align: 'center' });

    // Table data
    const tableData = statusRegs.map(reg => [
      reg.full_name,
      reg.participant_type,
      reg.event_title,
      reg.is_team_registration ? `${reg.team_name} (${reg.total_members})` : 'Individual',
      reg.email,
      reg.phone,
      reg.college || 'N/A',
      new Date(reg.registration_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Name', 'Type', 'Event', 'Team/Individual', 'Email', 'Phone', 'College', 'Date']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: color,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 50
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 25 },
        2: { cellWidth: 38 },
        3: { cellWidth: 35 },
        4: { cellWidth: 48 },
        5: { cellWidth: 28 },
        6: { cellWidth: 35 },
        7: { cellWidth: 24, halign: 'center' }
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        // Add watermark
        addWatermarkToPage(doc, watermarkDataUrl || null);
        
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        
        // Add stamp at bottom right
        addStampToPage(doc, stampDataUrl || null);
      }
    });
  });

  doc.save('registrations-by-status.pdf');
};

/**
 * Generate a personalized registration receipt PDF for a single participant
 * Returns PDF as Base64 string for email attachment
 */
export const generateRegistrationReceiptPDF = async (
  registration: Registration,
  watermarkDataUrl?: string | null,
  stampDataUrl?: string | null
): Promise<string> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
 const margin = 20;
  let yPos = margin;

  // Header with event branding
  doc.setFillColor(52, 152, 219); // Blue header
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTRATION RECEIPT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('RICORRENZA 2026', pageWidth / 2, 30, { align: 'center' });

  yPos = 50;

  // Registration ID - Prominent display
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - margin * 2, 15, 'F');
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFont('helvetica', 'bold');
  doc.text('Registration No:', margin + 5, yPos + 10);
  doc.setTextColor(52, 152, 219);
  doc.text(registration.id, margin + 50, yPos + 10);

  // Serial No (extracted numeric part)
  const serialMatch = registration.id.match(/(\d+)/);
  const serialNo = serialMatch ? serialMatch[0] : registration.id;
  
  doc.setTextColor(40, 40, 40);
  doc.text('Serial No:', margin + 100, yPos + 10);
  doc.setTextColor(52, 152, 219);
  doc.text(serialNo, margin + 130, yPos + 10);
  
  yPos += 25;

  // Status Badge
  const statusColors: Record<string, [number, number, number]> = {
    'approved': [76, 175, 80],
    'pending': [255, 193, 7],
    'rejected': [244, 67, 54]
  };
  const statusColor = statusColors[registration.status] || [100, 100, 100];
  doc.setFillColor(...statusColor);
  doc.roundedRect(margin, yPos, 30, 8, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(registration.status.toUpperCase(), margin + 15, yPos + 5.5, { align: 'center' });
  
  yPos += 18;

  // Participant Details Section
  doc.setFontSize(16);
  doc.setTextColor(52, 152, 219);
  doc.setFont('helvetica', 'bold');
  doc.text('Participant Details', margin, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');

  const details = [
    { label: 'Name', value: registration.full_name },
    { label: 'Email', value: registration.email },
    { label: 'Phone', value: registration.phone },
    { label: 'College/Institution', value: registration.college || 'N/A' },
    { label: 'Participant Type', value: registration.participant_type },
    { label: 'Registration Date', value: new Date(registration.registration_date).toLocaleString('en-IN', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    })}
  ];

  details.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.label}:`, margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(item.value, margin + 55, yPos);
    yPos += 7;
  });

  yPos += 5;

  // Event Details Section
  doc.setFontSize(16);
  doc.setTextColor(52, 152, 219);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Details', margin, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.text('Event Name:', margin + 5, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(registration.event_title, margin + 55, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.text('Registration Type:', margin + 5, yPos);
  doc.text(registration.is_team_registration ? 'Team Registration' : 'Individual Registration', margin + 55, yPos);
  yPos += 10;

  // Team Details (if team registration)
  if (registration.is_team_registration) {
    doc.setFontSize(16);
    doc.setTextColor(52, 152, 219);
    doc.setFont('helvetica', 'bold');
    doc.text('Team Details', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');

    if (registration.team_name) {
      doc.text('Team Name:', margin + 5, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(registration.team_name, margin + 55, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 7;
    }

    doc.text('Total Members:', margin + 5, yPos);
    doc.text(String(registration.total_members), margin + 55, yPos);
    yPos += 10;

    // Team members list
    const teamMembers = Array.isArray(registration.team_members) 
      ? registration.team_members 
      : [];

    if (teamMembers.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Team Members:', margin + 5, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      teamMembers.forEach((member: any, index: number) => {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${member.name || 'N/A'}`, margin + 10, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 5;
        doc.text(`Phone: ${member.phone || 'N/A'}`, margin + 15, yPos);
        yPos += 7;
      });
    }
  }

  // Add watermark to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Add watermark
    if (watermarkDataUrl) {
      try {
        const pW = doc.internal.pageSize.getWidth();
        const pH = doc.internal.pageSize.getHeight();
        const wmW = pW * 0.6;
        const wmH = pH * 0.6;
        const x = (pW - wmW) / 2;
        const y = (pH - wmH) / 2;
        doc.saveGraphicsState();
        const gState = new (doc as any).GState({ opacity: 0.12 });
        doc.setGState(gState);
        doc.addImage(watermarkDataUrl, 'PNG', x, y, wmW, wmH, undefined, 'FAST');
        doc.restoreGraphicsState();
      } catch (e) {
        console.error('Watermark failed:', e);
      }
    }

    // Add stamp at bottom right
    if (stampDataUrl) {
      try {
        const pW = doc.internal.pageSize.getWidth();
        const pH = doc.internal.pageSize.getHeight();
        const stampSize = 50;
        const x = pW - stampSize - 15;
        const y = pH - stampSize - 15;
        doc.addImage(stampDataUrl, 'PNG', x, y, stampSize, stampSize, undefined, 'FAST');
      } catch (e) {
        console.error('Stamp failed:', e);
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text('RICORRENZA 2026 - IQ City Medical College', 10, pageHeight - 10);
  }

  // Return PDF as base64 string
  const pdfOutput = doc.output('datauristring');
  // Extract base64 part only (remove data:application/pdf;filename=generated.pdf;base64,)
  const base64 = pdfOutput.split(',')[1];
  return base64;
};
