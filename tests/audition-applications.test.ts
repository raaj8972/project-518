import { beforeEach, expect, it, vi } from 'vitest';
import { fetchAuditionApplications } from '../src/services/participantApplications';
const mocks = vi.hoisted(() => ({ range: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { from: () => { const query: any = { select: () => query, order: () => query, range: mocks.range }; return query; } } }));
beforeEach(() => vi.clearAllMocks());
it('loads more than a single Supabase page in stable order and fails rather than returning partial applications', async () => {
 const first = Array.from({ length: 500 }, (_, index) => ({ id: String(index) })); mocks.range.mockResolvedValueOnce({ data: first }).mockResolvedValueOnce({ data: [{ id: 'last' }] });
 expect(await fetchAuditionApplications()).toHaveLength(501); expect(mocks.range.mock.calls).toEqual([[0, 499], [500, 999]]);
 mocks.range.mockResolvedValueOnce({ data: first }).mockResolvedValueOnce({ error: { message: 'Connection interrupted' } }); await expect(fetchAuditionApplications()).rejects.toThrow('could not load');
});
