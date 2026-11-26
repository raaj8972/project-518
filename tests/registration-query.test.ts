import { expect, it, vi } from 'vitest';
vi.mock('../src/lib/dualDb', () => ({ dualRead: vi.fn() }));
vi.mock('../src/hooks/useDomainRealtime', () => ({ useDomainRealtime: vi.fn() }));
import { registrationReadOptions } from '../src/hooks/useRegistrations';
it('combines event, status and batch filters without overwriting and keeps search text inside quoted values', () => {
 const options = registrationReadOptions({ page: 3, pageSize: 20, filters: { event: 'Acoustic evening', status: 'approved', batch: '2025', search: 'Mitali, (vocals) "stage"' } });
 expect(options.eqAll).toEqual([['event_title', 'Acoustic evening'], ['status', 'approved'], ['participant_type', '2025']]); expect(options.range).toEqual([40, 59]); expect(options.is).toEqual(['deleted_at', null]);
 expect(options.or).toContain('full_name.ilike."*Mitali, (vocals) \\"stage\\"*"');
});
it('accepts UUID event IDs, scopes trash queries and allows explicit refresh to bypass cached results', () => {
 const id = '6e39bbfc-ac1c-43e8-b998-f5100ad42c71'; const options = registrationReadOptions({ page: 1, pageSize: 500, filters: { event: id, viewMode: 'trash' } }, true);
 expect(options.eqAll).toEqual([['event_id', id]]); expect(options.is).toBeUndefined(); expect(options.gt).toEqual(['deleted_at', '1970-01-01']); expect(options.range).toEqual([0, 99]); expect(options.forceRefresh).toBe(true);
});
