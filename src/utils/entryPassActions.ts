export interface DownloadablePass {
  pass_token: string;
  participant_name: string;
  pass_type: string;
  venue?: string;
  valid_date?: string;
}

export async function entryPassFile(pass: DownloadablePass): Promise<File> {
  const [{ jsPDF }, { default: QRCode }] = await Promise.all([import('jspdf'), import('qrcode')]);
  const doc = new jsPDF({ unit: 'mm', format: [100, 150] });
  doc.setFontSize(18);
  doc.text('RICORRENZA', 50, 18, { align: 'center' });
  doc.setFontSize(11);
  doc.text(doc.splitTextToSize(pass.participant_name || 'Participant', 84), 50, 30, { align: 'center' });
  doc.text(pass.pass_type.replace(/_/g, ' '), 50, 43, { align: 'center' });
  const token = pass.valid_date ? `${pass.pass_token}|${pass.valid_date}` : pass.pass_token;
  const qr = await QRCode.toDataURL(token, { errorCorrectionLevel: 'H', margin: 2 });
  doc.addImage(qr, 'PNG', 20, 50, 60, 60);
  doc.text(pass.valid_date || 'See event dates for validity', 50, 120, { align: 'center' });
  doc.text(doc.splitTextToSize(pass.venue || 'Main Campus', 84), 50, 130, { align: 'center' });
  return new File([doc.output('blob')], 'ricorrenza-entry-pass.pdf', { type: 'application/pdf' });
}
