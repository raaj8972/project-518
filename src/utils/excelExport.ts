import * as XLSX from 'xlsx';
import { Registration } from '../context/DataContext';

// Defensive helper: parse team_members that might be null/string/json
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

export const exportRegistrationsToExcel = (registrations: Registration[], filename: string = 'registrations.xlsx') => {
  // Prepare data for Excel export
  const excelData: Record<string, any>[] = registrations.map((reg) => {
    const baseData: Record<string, any> = {
  // Use the new sequential Registration ID (stored in id)
  'Registration ID': reg.id,
      'Event Title': reg.event_title,
      'Registration Type': reg.is_team_registration ? 'Team' : 'Individual',
      'Team Name': reg.team_name || 'N/A',
      'Total Members': reg.total_members,
      'Leader/Participant Name': reg.full_name,
      'Leader/Participant Type': reg.participant_type,
      'Leader/Participant Email': reg.email,
      'Leader/Participant Phone': reg.phone,
      'Photo URL': (reg as any).photo_url || '—',
      'College/Institution': reg.college,
      'Registration Date': new Date(reg.registration_date).toLocaleDateString(),
      'Status': reg.status.toUpperCase(),
    };

    // Add team members if it's a team registration
    if (reg.is_team_registration) {
      const list = safeTeamMembers(reg);
      list.forEach((member: any, index: number) => {
        baseData[`Member ${index + 1} Name`] = member?.name || '';
        baseData[`Member ${index + 1} Email`] = member?.email || '';
        baseData[`Member ${index + 1} Phone`] = member?.phone || '';
      });
    }

    return baseData;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Auto-size columns
  const colWidths: any[] = [];
  const headers: string[] = Object.keys(excelData[0] || {});
  
  headers.forEach((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...excelData.map((row) => String((row as any)[header] || '').length)
    );
    colWidths[index] = { wch: Math.min(maxLength + 2, 50) };
  });
  
  ws['!cols'] = colWidths;

  // Add styling to headers
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "366092" } },
      alignment: { horizontal: "center" }
    };
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

  // Generate and download file
  XLSX.writeFile(wb, filename);
};

export const exportRegistrationsByEvent = (registrations: Registration[]) => {
  // Group registrations by event
  const groupedByEvent = registrations.reduce((acc, reg) => {
    if (!acc[reg.event_title]) {
      acc[reg.event_title] = [];
    }
    acc[reg.event_title].push(reg);
    return acc;
  }, {} as Record<string, Registration[]>);

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create a sheet for each event
  Object.entries(groupedByEvent).forEach(([eventTitle, eventRegistrations]) => {
    const excelData: Record<string, any>[] = eventRegistrations.map((reg) => ({
  'Registration ID': reg.id,
      'Registration Type': reg.is_team_registration ? 'Team' : 'Individual',
      'Team Name': reg.team_name || 'N/A',
      'Total Members': reg.total_members,
      'Leader/Participant Name': reg.full_name,
      'Participant Type': reg.participant_type,
      'Email': reg.email,
      'Phone': reg.phone,
      'Photo URL': (reg as any).photo_url || '—',
      'College': reg.college,
      'Registration Date': new Date(reg.registration_date).toLocaleDateString(),
      'Status': reg.status.toUpperCase(),
      'Team Members': reg.is_team_registration 
        ? (() => { 
            const list = safeTeamMembers(reg);
            if (!list.length) return 'N/A';
            const fmt = (m: any) => {
              const name = m?.name || '';
              const email = m?.email || '';
              return email ? `${name} (${email})` : (name || '');
            };
            return list.map(fmt).join('; ');
          })()
        : 'N/A',
      'Team Member Phones': reg.is_team_registration 
        ? (() => {
            const list = safeTeamMembers(reg);
            const phones = list.map((m: any) => m?.phone || '').filter(Boolean);
            return phones.length ? phones.join(', ') : 'N/A';
          })()
        : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Auto-size columns
    const colWidths: any[] = [];
    const headers: string[] = Object.keys(excelData[0] || {});
    
    headers.forEach((header, index) => {
      const maxLength = Math.max(
        header.length,
        ...excelData.map((row) => String((row as any)[header] || '').length)
      );
      colWidths[index] = { wch: Math.min(maxLength + 2, 50) };
    });
    
    ws['!cols'] = colWidths;

    // Sanitize sheet name (Excel has restrictions)
    const sheetName = eventTitle.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Generate and download file
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `registrations-by-event-${timestamp}.xlsx`);
};

export const exportRegistrationsByStatus = (registrations: Registration[]) => {
  // Group registrations by status
  const groupedByStatus = registrations.reduce((acc, reg) => {
    if (!acc[reg.status]) {
      acc[reg.status] = [];
    }
    acc[reg.status].push(reg);
    return acc;
  }, {} as Record<string, Registration[]>);

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create a sheet for each status
  Object.entries(groupedByStatus).forEach(([status, statusRegistrations]) => {
    const excelData: Record<string, any>[] = statusRegistrations.map((reg) => ({
  'Registration ID': reg.id,
      'Event Title': reg.event_title,
      'Registration Type': reg.is_team_registration ? 'Team' : 'Individual',
      'Team Name': reg.team_name || 'N/A',
      'Total Members': reg.total_members,
      'Leader/Participant Name': reg.full_name,
      'Participant Type': reg.participant_type,
      'Email': reg.email,
      'Phone': reg.phone,
      'Photo URL': (reg as any).photo_url || '—',
      'College': reg.college,
      'Registration Date': new Date(reg.registration_date).toLocaleDateString(),
      'Team Members': reg.is_team_registration 
        ? (() => { 
            const list = safeTeamMembers(reg);
            if (!list.length) return 'N/A';
            const fmt = (m: any) => {
              const name = m?.name || '';
              const email = m?.email || '';
              return email ? `${name} (${email})` : (name || '');
            };
            return list.map(fmt).join('; ');
          })()
        : 'N/A'
      , 'Team Member Phones': reg.is_team_registration 
        ? (() => {
            const list = safeTeamMembers(reg);
            const phones = list.map((m: any) => m?.phone || '').filter(Boolean);
            return phones.length ? phones.join(', ') : 'N/A';
          })()
        : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Auto-size columns
    const colWidths: any[] = [];
    const headers: string[] = Object.keys(excelData[0] || {});
    
    headers.forEach((header, index) => {
      const maxLength = Math.max(
        header.length,
        ...excelData.map((row) => String((row as any)[header] || '').length)
      );
      colWidths[index] = { wch: Math.min(maxLength + 2, 50) };
    });
    
    ws['!cols'] = colWidths;

    const sheetName = status.toUpperCase();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Generate and download file
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `registrations-by-status-${timestamp}.xlsx`);
};

export const exportAuditionsToExcel = (auditions: any[], filename: string = 'auditions.xlsx') => {
  // Prepare data for Excel export
  const excelData = auditions.map(audition => ({
    'Audition ID': audition.id,
    'Full Name': audition.full_name,
     'Participant Type': audition.participant_type,
    'Email': audition.email,
    'Phone': audition.phone,
    'Instrument/Role': audition.instrument_role,
    'Experience/Motivation': audition.experience_motivation || 'Not provided',
    'Portfolio Link': audition.portfolio_link || 'Not provided',
    'Status': audition.status.toUpperCase(),
    'Application Date': new Date(audition.created_at).toLocaleDateString(),
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Auto-size columns
  const colWidths: any[] = [];
  const headers: string[] = Object.keys(excelData[0] || {});
  
  headers.forEach((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...excelData.map((row) => String((row as any)[header] || '').length)
    );
    colWidths[index] = { wch: Math.min(maxLength + 2, 50) };
  });
  
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Auditions');

  // Generate and download file
  XLSX.writeFile(wb, filename);
};

export const exportMembershipsToExcel = (memberships: any[], filename: string = 'memberships.xlsx') => {
  // Prepare data for Excel export
  const excelData = memberships.map(membership => ({
    'Membership ID': membership.id,
    'Full Name': membership.full_name,
     'Participant Type': membership.participant_type,
    'Email': membership.email,
    'Phone': membership.phone,
    'College/Department': membership.college_department,
    'Motivation': membership.motivation || 'Not provided',
    'Status': membership.status.toUpperCase(),
    'Application Date': new Date(membership.created_at).toLocaleDateString(),
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Auto-size columns
  const colWidths: any[] = [];
  const headers: string[] = Object.keys(excelData[0] || {});
  
  headers.forEach((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...excelData.map((row) => String((row as any)[header] || '').length)
    );
    colWidths[index] = { wch: Math.min(maxLength + 2, 50) };
  });
  
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Memberships');

  // Generate and download file
  XLSX.writeFile(wb, filename);
};