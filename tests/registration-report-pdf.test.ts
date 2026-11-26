import { beforeEach, expect, it, vi } from 'vitest';
import { exportPdf } from '../src/utils/reportExport';
const mocks = vi.hoisted(() => ({ outputs: [] as { name: string; pdf: string; values: unknown[] }[] }));
vi.mock('../src/lib/supabase', () => ({ supabase: {}, SUPABASE_HOST: 'project.example' }));
vi.mock('jspdf', async importOriginal => {
 const actual = await importOriginal<typeof import('jspdf')>();
 return { ...actual, jsPDF: function (options: any) { const doc = new actual.jsPDF(options); doc.save = ((name: string) => { mocks.outputs.push({ name, pdf: doc.output(), values: Object.values((doc as any).lastAutoTable.body[0].cells).map((cell: any) => cell.raw) }); return doc; }) as any; return doc; } };
});
beforeEach(() => { mocks.outputs.length = 0; });
const entry = { id: 'PRIVATE-REGISTRATION-ID', full_name: 'Fixture Participant', email: 'fixture@example.invalid', phone: '9999900000', event_title: 'Fixture event', college: 'Visible institution', status: 'approved', registration_date: '2026-11-26' } as any;
it('generates a real report PDF without the former initialization error and honors excluded identity columns', async () => {
 await exportPdf([entry], ['full_name', 'event_title'], { baseFileName: 'report.pdf' }); expect(mocks.outputs[0].name).toBe('report.pdf'); expect(mocks.outputs[0].pdf.startsWith('%PDF-')).toBe(true); expect(mocks.outputs[0].values).toContain('Fixture Participant'); expect(mocks.outputs[0].values).not.toContain('PRIVATE-REGISTRATION-ID'); expect(mocks.outputs[0].values).not.toContain('Visible institution');
});
it('includes the full registration ID and institution when explicitly selected', async () => {
 await exportPdf([entry], ['id', 'full_name', 'college'], { baseFileName: 'detailed' }); expect(mocks.outputs[0].values).toContain('PRIVATE-REGISTRATION-ID'); expect(mocks.outputs[0].values).toContain('Visible institution'); expect(mocks.outputs[0].name).toBe('detailed.pdf');
});
