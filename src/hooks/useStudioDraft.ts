import { repairDraftShape } from '../utils/studioData';
import { useCallback, useEffect, useState, type SetStateAction } from 'react';

function restore<T extends object>(key: string, source: T, normalize: (value: unknown, baseline: T) => T): T {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); if (value && typeof value === 'object' && !Array.isArray(value)) return normalize(value, source); } catch { /* Editing works without storage. */ }
  return source;
}
export function useStudioDraft<T extends object>(key: string, source: T | null, normalize: (value: unknown, baseline: T) => T = repairDraftShape) {
  const [state, setState] = useState<{ form: T | null; baseline: T | null }>(() => ({ form: source ? restore(key, source, normalize) : null, baseline: source }));
  useEffect(() => { if (!source) return; setState(current => {
    if (current.baseline === source) return current;
    if (!current.baseline) return { form: restore(key, source, normalize), baseline: source };
    const dirty = JSON.stringify(current.form) !== JSON.stringify(current.baseline);
    return { form: dirty ? current.form : source, baseline: source };
  }); }, [key, source, normalize]);
  const dirty = !!state.form && JSON.stringify(state.form) !== JSON.stringify(state.baseline);
  useEffect(() => { if (!state.form) return; try { if (dirty) localStorage.setItem(key, JSON.stringify(state.form)); else localStorage.removeItem(key); } catch { /* Optional local persistence. */ } }, [key, state.form, dirty]);
  const setForm = useCallback((action: SetStateAction<T>) => setState(current => current.form ? { ...current, form: typeof action === 'function' ? (action as (value: T) => T)(current.form) : action } : current), []);
  const commit = useCallback((saved: T) => setState(current => ({ ...current, baseline: saved })), []);
  const discard = useCallback(() => setState(current => ({ ...current, form: current.baseline })), []);
  return { ...state, dirty, setForm, commit, discard };
}
