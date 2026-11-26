import type { Event, EventCoordinator } from '../../../types/data';
import { serializeEventDraft, type CoordinatorDraft, type EventEditorDraft } from './eventEditor';

export interface EventSaveProgress { id?: number; payload?: string; coordinators: CoordinatorDraft[] }
interface EventWrites {
  create: (payload: Partial<Event>, coordinators: { name: string; phone: string }[]) => Promise<Event | undefined>;
  update: (id: number, payload: Partial<Event>) => Promise<void>;
  addCoordinator: (coord: Omit<EventCoordinator, 'id' | 'created_at' | 'updated_at'>) => Promise<EventCoordinator | undefined>;
  updateCoordinator: (id: number, coord: Partial<EventCoordinator>) => Promise<void>;
  deleteCoordinator: (id: number) => Promise<void>;
}

/** Record successful writes separately so retries cannot create duplicate events or contacts. */
export async function persistEventDraft(draft: EventEditorDraft, writes: EventWrites, progress: EventSaveProgress, checkpoint: () => void) {
  const payload = serializeEventDraft(draft);
  const serialized = JSON.stringify(payload);
  if (progress.id == null) {
    const inserted = await writes.create({ ...payload, current_registrations: 0 } as Partial<Event>, []);
    if (inserted?.id == null) throw new Error('The new event ID could not be confirmed. Refresh the catalog before trying again.');
    progress.id = inserted.id; progress.payload = serialized; checkpoint();
  } else if (progress.payload !== serialized) {
    await writes.update(progress.id, payload as Partial<Event>);
    progress.payload = serialized; checkpoint();
  }
  const submitted = draft.coordinators.filter(row => row.name.trim()).map(row => ({ ...row, name: row.name.trim(), phone: row.phone.trim() }));
  for (const existing of [...progress.coordinators]) {
    if (!submitted.some(coord => coord.key === existing.key) && existing.id != null) {
      await writes.deleteCoordinator(existing.id);
      progress.coordinators = progress.coordinators.filter(row => row.key !== existing.key); checkpoint();
    }
  }
  for (const [index, coord] of submitted.entries()) {
    const existing = progress.coordinators.find(row => row.key === coord.key);
    const patch = { event_id: progress.id, name: coord.name, phone: coord.phone || null, order_position: index + 1 };
    if (existing?.id != null) {
      if (existing.name !== coord.name || existing.phone !== coord.phone || existing.order_position !== index + 1) await writes.updateCoordinator(existing.id, patch);
      progress.coordinators = progress.coordinators.filter(row => row.key !== coord.key);
      progress.coordinators.splice(index, 0, { ...coord, id: existing.id, order_position: index + 1 }); checkpoint();
    } else {
      const added = await writes.addCoordinator(patch);
      if (added?.id == null) throw new Error('The coordinator ID could not be confirmed. Refresh the catalog before trying again.');
      progress.coordinators.splice(index, 0, { ...coord, id: added.id, order_position: index + 1 }); checkpoint();
    }
  }
  return { id: progress.id, payload };
}
