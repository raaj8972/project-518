import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Calendar, Clock, MapPin, Users, Eye, EyeOff, Star, UserPlus, UserMinus, FileText, ArrowUp, ArrowDown } from 'lucide-react';
import { useData } from '../../context/DataContext';
import type { EventCoordinator } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import EventWinnersEditor from './EventWinnersEditor';
import type { Event } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';

export const EventsManagement: React.FC = () => {
  const { 
    events, 
    eventCategories,
    updateEvent, 
    deleteEvent,
    toggleEventFeatured,
    toggleEventVisibility,
    toggleEventRegistration,
    eventCoordinators,
    addEventCoordinator,
    updateEventCoordinator,
    deleteEventCoordinator,
    myPermissions,
    eventWinners: _eventWinners,
    siteSettings,
    addEventWithCoordinators,
  } = useData() as any;
  const savingProgress = useSavingProgress();

  // ---- Rules (structured) helpers (v2) ----
  type RuleBlock = { kind: 'points'; style?: 'bullet' | 'number'; title?: string; items: string[] };
  type RuleSection = { heading?: string; blocks?: RuleBlock[] };
  type RuleSectionV1 = { heading?: string; subheading?: string; points?: string[] };
  const STRUCTURED_MARK = '__SR__';
  const isStructuredRules = (rules: string[] | null | undefined): boolean => Array.isArray(rules) && rules.length === 1 && typeof rules[0] === 'string' && rules[0].startsWith(STRUCTURED_MARK);
  const normalizeV1toV2 = (list: RuleSectionV1[]): RuleSection[] => {
    return (list || []).map((s) => ({
      heading: s.heading,
      blocks: [
        ...(s.points && s.points.length ? [{ kind: 'points', style: 'number', title: s.subheading, items: s.points }] as RuleBlock[] : [])
      ]
    }));
  };
  const unpackStructured = (rules: string[] | null | undefined): RuleSection[] => {
    try {
      if (!isStructuredRules(rules)) return [];
      const s = (rules as string[])[0].slice(STRUCTURED_MARK.length);
      const parsed = JSON.parse(s);
      if (parsed?.v === 2 && Array.isArray(parsed.sections)) return parsed.sections as RuleSection[];
      if (Array.isArray(parsed?.sections)) return normalizeV1toV2(parsed.sections as RuleSectionV1[]);
      return [];
    } catch { return []; }
  };
  const packStructured = (sections: RuleSection[]): string[] => [STRUCTURED_MARK + JSON.stringify({ v: 2, sections })];
  const computeRulesCount = (rules: string[] | null | undefined): number => {
    if (!rules || rules.length === 0) return 0;
    if (isStructuredRules(rules)) {
      const sections = unpackStructured(rules);
      if (!sections.length) return 0;
      const pts = sections.reduce((sum, s) => sum + (s.blocks || []).reduce((acc, b) => acc + (b.items?.filter(p=>p && p.trim()).length || 0), 0), 0);
      return pts || sections.length;
    }
    return rules.filter(r => r && r.trim()).length;
  };

  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [activeWinnersFor, setActiveWinnersFor] = useState<number | null>(null);
  const [newCoordinator, setNewCoordinator] = useState<{ name: string; phone: string }>({ name: '', phone: '' });
  // Draft coordinators when creating a brand new event (before it has an id)
  const [draftCoordinators, setDraftCoordinators] = useState<Array<{ name: string; phone?: string | null }>>([]);
  const [autoOpenEnabled, setAutoOpenEnabled] = useState<boolean>(() => {
    try { return (localStorage.getItem('admin_auto_open_enabled') === 'true'); } catch { return false; }
  });
  const persistAutoOpen = (v: boolean) => {
    setAutoOpenEnabled(v);
    try { localStorage.setItem('admin_auto_open_enabled', v ? 'true' : 'false'); } catch {}
  };

  // Determine current poster fit mode for guidance text
  const posterFit: 'cover' | 'contain' = ((siteSettings as any)?.events_poster_fit === 'cover' ? 'cover' : 'contain');
  const posterGuideline = posterFit === 'cover'
    ? 'Display mode: Cover — fills the card; edges may crop. Upload a 16:9 image (e.g., 1920×1080 or at least 1280×720). Keep important text/logos away from the edges.'
    : 'Display mode: Fit — no cropping; non‑16:9 images will show side/top bars. Upload a 16:9 image (e.g., 1920×1080 or at least 1280×720) to fill the card cleanly.';

  const [eventForm, setEventForm] = useLocalStorage('admin_events_form_draft', {
    title: '',
    category: '',
    description: '',
    image: '',
    motion_poster_url: '' as string | null,
    coordinator_name: '' as string | null,
    coordinator_phone: '' as string | null,
    date: '',
    time: '',
    venue: '',
    participants: '',
    highlights: [] as string[],
    rules: [] as string[],
    registration_open: true,
    registration_timer_enabled: false as boolean,
  registration_opens_at: '' as string | null,
  registration_photo_required: false as boolean,
  registration_photo_label: '' as string | null,
    max_participants: undefined as number | undefined,
    featured: false,
    visible: true,
    artist_id: undefined as number | undefined,
    watch_live_url: '' as string | null,
  });

  // Local UI state for structured rules mode + data (not persisted directly)
  const [rulesModeStructured, setRulesModeStructured] = useState<boolean>(false);
  const [rulesSections, setRulesSections] = useState<Array<RuleSection>>([]);

  // Admin-side live countdown support so you can see the timer ticking here too
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => (v + 1) % 1_000_000), 1000);
    return () => clearInterval(t);
  }, []);

  const getCountdown = (e: any): string | null => {
    if (!e?.registration_timer_enabled || !e?.registration_opens_at) return null;
    const openAt = new Date(e.registration_opens_at as string).getTime();
    if (Number.isNaN(openAt)) return null;
    const now = Date.now();
    const diff = openAt - now;
    if (diff <= 0) return 'now';
    const d = Math.floor(diff / (24*60*60*1000));
    const h = Math.floor((diff % (24*60*60*1000)) / (60*60*1000));
    const m = Math.floor((diff % (60*60*1000)) / (60*1000));
    const s = Math.floor((diff % (60*1000)) / 1000);
    const parts: string[] = [];
    if (d) parts.push(`${d}d`);
    if (h || parts.length) parts.push(`${h}h`);
    if (m || parts.length) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const getSecondsToOpen = (e: any): number | null => {
    if (!e?.registration_timer_enabled || !e?.registration_opens_at) return null;
    const ts = new Date(e.registration_opens_at as string).getTime();
    if (Number.isNaN(ts)) return null;
    const diff = ts - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / 1000);
  };
  const getOpensAtTooltip = (e: any): string => {
    const iso = e?.registration_opens_at as string | null | undefined;
    if (!iso) return 'Opens at —';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Opens at —';
    const ist = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const local = d.toLocaleString();
    const utc = d.toUTCString();
    return `Opens at — IST: ${ist} • Local: ${local} • UTC: ${utc} • Note: countdown uses your device time`;
  };

  // Soft palette + glow for admin overlay countdown
  const COUNTDOWN_PALETTE = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#f87171', '#93c5fd', '#c084fc', '#38bdf8'];
  const hexToRgba = (hex: string, alpha: number): string => {
    const h = hex.replace('#','');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const getCountdownStylesForSecs = (secs: number | null | undefined) => {
    const s = Math.max(1, Math.min(10, Number(secs) || 10));
    const idx = (10 - s) % COUNTDOWN_PALETTE.length;
    const color = COUNTDOWN_PALETTE[idx];
    const glow = hexToRgba(color, 0.35);
    const filter = `drop-shadow(0 10px 24px rgba(0,0,0,0.65)) drop-shadow(0 0 18px ${glow})`;
    return { color, filter };
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      category: eventCategories.length > 0 ? eventCategories[0].name : '',
      description: '',
      image: '',
      motion_poster_url: '',
      coordinator_name: '',
      coordinator_phone: '',
      date: '',
      time: '',
      venue: '',
      participants: '',
      highlights: [],
      rules: [],
      registration_open: true,
      registration_timer_enabled: false,
  registration_opens_at: '',
  registration_photo_required: false,
    registration_photo_label: '',
      max_participants: undefined,
      featured: false,
      visible: true,
      artist_id: undefined,
      watch_live_url: '',
    });
    setRulesModeStructured(false);
    setRulesSections([]);
  };

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.description || !eventForm.image) {
      alert('Please fill in all required fields (title, description, and image)');
      return;
    }
    
    try {
      // Insert event and any drafted coordinators in one go
      const finalRules = rulesModeStructured ? packStructured(rulesSections) : (eventForm.rules || []);
      await addEventWithCoordinators({
        ...eventForm,
        rules: finalRules,
        category: eventForm.category || (eventCategories.length > 0 ? eventCategories[0].name : 'General'),
        registration_timer_enabled: !!eventForm.registration_timer_enabled,
        registration_opens_at: eventForm.registration_opens_at ? new Date(eventForm.registration_opens_at).toISOString() : null,
        registration_photo_required: !!(eventForm as any).registration_photo_required,
        registration_photo_label: (eventForm as any).registration_photo_label || null,
        current_registrations: 0
      } as any, draftCoordinators);
      setIsAddingEvent(false);
      resetEventForm();
      setDraftCoordinators([]);
      try { localStorage.removeItem('admin_events_form_draft'); } catch {}
    } catch (error: any) {
      console.error('Error adding event:', error);
      alert(error?.message || 'Failed to add event. Please try again.');
    }
  };

  const handleUpdateEvent = async (id: number) => {
    if (!eventForm.title || !eventForm.description || !eventForm.image) {
      alert('Please fill in all required fields (title, description, and image)');
      return;
    }
    
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      const finalRules = rulesModeStructured ? packStructured(rulesSections) : (eventForm.rules || []);
      await updateEvent(id, {
        ...eventForm,
        rules: finalRules,
        registration_timer_enabled: !!eventForm.registration_timer_enabled,
        registration_opens_at: eventForm.registration_opens_at ? new Date(eventForm.registration_opens_at).toISOString() : null,
        registration_photo_required: !!(eventForm as any).registration_photo_required,
        registration_photo_label: (eventForm as any).registration_photo_label || null,
      } as any);
      steps.next('Finalizing');
      setEditingEvent(null);
      resetEventForm();
      try { localStorage.removeItem('admin_events_form_draft'); } catch {}
    } catch (error: any) {
      console.error('Error updating event:', error);
      alert(error?.message || 'Failed to update event. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await deleteEvent(id);
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      await toggleEventFeatured(id);
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status. Please try again.');
    }
  };

  const handleToggleVisibility = async (id: number) => {
    try {
      await toggleEventVisibility(id);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to update visibility. Please try again.');
    }
  };

  const handleToggleRegistration = async (id: number) => {
    try {
      await toggleEventRegistration(id);
    } catch (error) {
      console.error('Error toggling registration:', error);
      alert('Failed to update registration status. Please try again.');
    }
  };

  const startEditingEvent = (event: Event) => {
    setEventForm({
      title: event.title,
      category: event.category,
      description: event.description,
      image: event.image,
      motion_poster_url: event.motion_poster_url || '',
      coordinator_name: event.coordinator_name || '',
      coordinator_phone: event.coordinator_phone || '',
      date: event.date,
      time: event.time,
      venue: event.venue,
      participants: event.participants,
      highlights: event.highlights,
      rules: event.rules || [],
      registration_open: event.registration_open,
      registration_timer_enabled: (event as any).registration_timer_enabled ?? false,
  registration_opens_at: (event as any).registration_opens_at ? new Date((event as any).registration_opens_at).toISOString().slice(0,16) : '',
  registration_photo_required: (event as any).registration_photo_required ?? false,
    registration_photo_label: (event as any).registration_photo_label || '',
      max_participants: event.max_participants ?? undefined,
      featured: event.featured || false,
      visible: event.visible !== false,
      artist_id: event.artist_id ?? undefined,
      watch_live_url: (event as any).watch_live_url || '',
    });
    // Populate structured rules UI state
    if (isStructuredRules((event as any).rules)) {
      setRulesModeStructured(true);
      setRulesSections(unpackStructured((event as any).rules));
    } else {
      setRulesModeStructured(false);
      setRulesSections([]);
    }
    setEditingEvent(event.id);
  };

  const coordinatorsFor = (eventId: number): EventCoordinator[] => (eventCoordinators as EventCoordinator[]).filter((c: EventCoordinator) => c.event_id === eventId).sort((a: EventCoordinator, b: EventCoordinator) => a.order_position - b.order_position);
  const addCoordinator = async (eventId: number) => {
    const nameT = newCoordinator.name.trim();
    const phoneT = newCoordinator.phone.trim();
    const isPlaceholder = (v: string) => v === '' || v === '0' || v === '-' || v === '—';
    if (isPlaceholder(nameT) && !phoneT) return;
    await addEventCoordinator({ event_id: eventId, name: isPlaceholder(nameT) ? '—' : nameT, phone: phoneT || null, order_position: (coordinatorsFor(eventId).slice(-1)[0]?.order_position ?? 0) + 1 });
    setNewCoordinator({ name: '', phone: '' });
  };

  const removeCoordinator = async (id: number) => {
    await deleteEventCoordinator(id);
  };

  // Winners helpers

  const updateCoordinatorField = async (id: number, field: 'name' | 'phone', value: string) => {
    const steps = savingProgress.withSteps(2, 'Preparing…');
    steps.next('Saving');
    try {
      await updateEventCoordinator(id, { [field]: value } as any);
    } finally {
      savingProgress.done();
    }
  };

  const moveCoordinator = async (eventId: number, id: number, delta: -1 | 1) => {
    const list = coordinatorsFor(eventId);
    const i = list.findIndex(c => c.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    const a = list[i];
    const b = list[j];
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Reordering');
      await Promise.all([
        updateEventCoordinator(a.id, { order_position: b.order_position }),
        updateEventCoordinator(b.id, { order_position: a.order_position })
      ]);
      steps.next('Finalizing');
    } catch (e) {
      console.error('Failed to reorder coordinators', e);
      alert('Could not reorder right now. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const moveDraftCoordinator = (index: number, delta: -1 | 1) => {
    setDraftCoordinators(prev => {
      const j = index + delta;
      if (index < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[j];
      next[j] = tmp;
      return next;
    });
  };

  const handleSetRegistrationOpen = async (id: number, open: boolean) => {
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving');
      await updateEvent(id, { registration_open: open } as any);
    } catch (error) {
      console.error('Error setting registration_open:', error);
      alert('Failed to update live status. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const addHighlight = () => {
    setEventForm(prev => ({
      ...prev,
      highlights: [...prev.highlights, '']
    }));
  };

  const updateHighlight = (index: number, value: string) => {
    setEventForm(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => i === index ? value : h)
    }));
  };

  const removeHighlight = (index: number) => {
    setEventForm(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const addRule = () => {
    if (rulesModeStructured) {
      setRulesSections(prev => {
        const next = [...prev];
        if (next.length === 0) {
          next.push({ heading: '', blocks: [{ kind: 'points', style: 'number', title: '', items: [''] }] });
          return next;
        }
        const last = next[next.length - 1];
        const blocks = [...(last.blocks || [{ kind: 'points', style: 'number', title: '', items: [] }])];
        const lastBlock = { ...blocks[blocks.length - 1] };
        lastBlock.items = [...(lastBlock.items || []), ''];
        blocks[blocks.length - 1] = lastBlock;
        next[next.length - 1] = { ...last, blocks };
        return next;
      });
    } else {
      setEventForm(prev => ({
        ...prev,
        rules: [...prev.rules, '']
      }));
    }
  };

  const updateRule = (index: number, value: string) => {
    setEventForm(prev => ({
      ...prev,
      rules: prev.rules.map((r, i) => i === index ? value : r)
    }));
  };

  const removeRule = (index: number) => {
    setEventForm(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  // Structured sections editing helpers
  const addSection = () => setRulesSections(prev => ([...prev, { heading: '', blocks: [{ kind: 'points', style: 'number', title: '', items: [''] }] }]));
  const removeSection = (idx: number) => setRulesSections(prev => prev.filter((_, i) => i !== idx));
  const updateSectionField = (idx: number, field: 'heading', value: string) => {
    setRulesSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const addBlock = (idx: number, style: 'bullet'|'number' = 'number') => setRulesSections(prev => prev.map((s, i) => i === idx ? { ...s, blocks: [...(s.blocks || []), { kind: 'points', style, title: '', items: [''] }] } : s));
  const removeBlock = (idx: number, bIndex: number) => setRulesSections(prev => prev.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).filter((_, j) => j !== bIndex) } : s));
  const updateBlockField = (idx: number, bIndex: number, patch: Partial<RuleBlock>) => setRulesSections(prev => prev.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).map((b, j) => j === bIndex ? { ...b, ...patch } : b) } : s));
  const addItem = (idx: number, bIndex: number) => setRulesSections(prev => prev.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).map((b, j) => j === bIndex ? { ...b, items: [...(b.items || []), ''] } : b) } : s));
  const updateItem = (idx: number, bIndex: number, pIndex: number, value: string) => setRulesSections(prev => prev.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).map((b, j) => j === bIndex ? { ...b, items: (b.items || []).map((p, k) => k === pIndex ? value : p) } : b) } : s));
  const removeItem = (idx: number, bIndex: number, pIndex: number) => setRulesSections(prev => prev.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).map((b, j) => j === bIndex ? { ...b, items: (b.items || []).filter((_, k) => k !== pIndex) } : b) } : s));

  return (
    <div className="space-y-6">
      {/* Backend schema compatibility notice */}
      {events.length > 0 && !('registration_timer_enabled' in (events[0] as any)) && (
        <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3">
          Registration timer fields are not found in the database yet. Please apply the migration and then Reset API cache in Supabase. Until then, timer settings will be ignored on save.
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Events Management</h2>
          <p className="text-gray-600">Manage festival events and registrations</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center text-sm text-gray-700">
            <input type="checkbox" className="mr-2" checked={autoOpenEnabled} onChange={(e)=>persistAutoOpen(e.target.checked)} />
            Auto-open after timer
          </label>
          <button
          onClick={() => {
            setIsAddingEvent(true);
            resetEventForm();
          }}
          className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Add Event
          </button>
        </div>
      </div>

      {/* Add Event Form */}
      {isAddingEvent && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-6">Add New Event</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              {/* Map URL removed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Watch Live URL</label>
                <input
                  type="url"
                  value={eventForm.watch_live_url || ''}
                  onChange={(e) => setEventForm(prev => ({ ...prev, watch_live_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <p className="text-xs text-gray-500 mt-1">Will appear 60 minutes before start, disabled until live begins.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={eventForm.category}
                  onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Select Category</option>
                    {eventCategories.map((category: any) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description"
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="e.g., 10:00 AM - 2:00 PM"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              {/* Coordinators (draft while creating a new event) */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-700 mb-2">Coordinators</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {draftCoordinators.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        className="col-span-5 p-2 text-sm border rounded"
                        value={c.name}
                        onChange={(e)=>{
                          const v = e.target.value; setDraftCoordinators(prev=>prev.map((row,i)=> i===idx? { ...row, name: v }: row));
                        }}
                        placeholder="Name"
                      />
                      <input
                        className="col-span-5 p-2 text-sm border rounded"
                        value={c.phone || ''}
                        onChange={(e)=>{
                          const v = e.target.value; setDraftCoordinators(prev=>prev.map((row,i)=> i===idx? { ...row, phone: v }: row));
                        }}
                        placeholder="Phone"
                      />
                      <div className="col-span-2 flex items-center gap-1">
                        <button type="button" onClick={()=>moveDraftCoordinator(idx,-1)} className="p-1 text-gray-600 hover:text-gray-800" title="Move up"><ArrowUp size={14} /></button>
                        <button type="button" onClick={()=>moveDraftCoordinator(idx,1)} className="p-1 text-gray-600 hover:text-gray-800" title="Move down"><ArrowDown size={14} /></button>
                        <button type="button" onClick={()=>setDraftCoordinators(prev=>prev.filter((_,i)=>i!==idx))} className="p-1 text-red-600" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-12 gap-2 mt-2">
                  <input className="col-span-5 p-2 text-sm border rounded" value={newCoordinator.name} onChange={(e)=>setNewCoordinator(prev=>({...prev,name:e.target.value}))} placeholder="Name" />
                  <input className="col-span-5 p-2 text-sm border rounded" value={newCoordinator.phone} onChange={(e)=>setNewCoordinator(prev=>({...prev,phone:e.target.value}))} placeholder="Phone" />
                  <button
                    type="button"
                    onClick={()=>{
                      {
                        const nameT = newCoordinator.name.trim();
                        const phoneT = newCoordinator.phone.trim();
                        const isPlaceholder = (v: string) => v === '' || v === '0' || v === '-' || v === '—';
                        if (isPlaceholder(nameT) && !phoneT) return;
                        setDraftCoordinators(prev=>[...prev, { name: isPlaceholder(nameT) ? '—' : nameT, phone: phoneT || null }]);
                      }
                      setNewCoordinator({ name: '', phone: '' });
                    }}
                    className="col-span-2 bg-green-600 text-white rounded text-xs px-2"
                  >Add</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coordinator Name</label>
                  <input
                    type="text"
                    value={eventForm.coordinator_name || ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, coordinator_name: e.target.value }))}
                    placeholder="Name of coordinator"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coordinator Phone</label>
                  <input
                    type="tel"
                    value={eventForm.coordinator_phone || ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, coordinator_phone: e.target.value }))}
                    placeholder="e.g., +91 90000 00000"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="Event venue"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participants (Optional)</label>
                  <input
                    type="text"
                    value={eventForm.participants}
                    onChange={(e) => setEventForm(prev => ({ ...prev, participants: e.target.value }))}
                    placeholder="e.g., 100+ students"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants (Optional)</label>
                <input
                  type="number"
                  value={eventForm.max_participants || ''}
                  onChange={(e) => setEventForm(prev => ({ 
                    ...prev, 
                    max_participants: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Maximum number of participants"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Highlights</label>
                <div className="space-y-2">
                  {eventForm.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={highlight}
                        onChange={(e) => updateHighlight(index, e.target.value)}
                        placeholder="Event highlight"
                        className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeHighlight(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addHighlight}
                    className="text-yellow-600 hover:text-yellow-700 text-sm flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Highlight
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Event Rules</label>
                  <label className="text-xs text-gray-700 flex items-center select-none">
                    <input type="checkbox" className="mr-2" checked={rulesModeStructured} onChange={(e)=>{
                      const enabled = e.target.checked;
                      if (enabled) {
                        setRulesModeStructured(true);
                        if (rulesSections.length === 0) setRulesSections([{ heading: '', blocks: [{ kind: 'points', style: 'number', title: '', items: eventForm.rules.length ? [...eventForm.rules] : [''] }] }]);
                      } else {
                        // flatten into simple list
                        const flat = rulesSections.flatMap(s => (s.blocks || []).flatMap(b => (b.items || [])).filter(p=>p && p.trim()));
                        if (flat.length) setEventForm(prev => ({ ...prev, rules: flat }));
                        setRulesModeStructured(false);
                      }
                    }} />
                    Structured sections
                  </label>
                </div>
                {!rulesModeStructured ? (
                  <div className="space-y-2">
                    {eventForm.rules.map((rule, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={rule}
                          onChange={(e) => updateRule(index, e.target.value)}
                          placeholder="Event rule"
                          className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                        <button type="button" onClick={() => removeRule(index)} className="text-red-600 hover:text-red-800 p-1"><X size={16} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={addRule} className="text-blue-600 hover:text-blue-700 text-sm flex items-center"><Plus size={16} className="mr-1" />Add Rule</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rulesSections.map((sec, idx) => (
                      <div key={idx} className="border border-gray-200 rounded p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-semibold text-gray-700">Section {idx+1}</div>
                          <button type="button" onClick={()=>removeSection(idx)} className="text-red-600 text-xs">Remove section</button>
                        </div>
                        <input className="w-full p-2 text-sm border rounded mb-2" placeholder="Heading (optional)" value={sec.heading || ''} onChange={(e)=>updateSectionField(idx,'heading',e.target.value)} />
                        <div className="space-y-3">
                          {(sec.blocks || []).map((b, bIdx) => (
                            <div key={bIdx} className="border border-dashed border-gray-300 rounded p-2 bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-semibold text-gray-700">Points block {bIdx+1}</div>
                                <div className="flex items-center gap-2">
                                  <select className="text-xs border rounded p-1" value={b.style || 'number'} onChange={(e)=>updateBlockField(idx,bIdx,{ style: (e.target.value as 'bullet'|'number') })}>
                                    <option value="number">Numbered</option>
                                    <option value="bullet">Bullets</option>
                                  </select>
                                  <button type="button" onClick={()=>removeBlock(idx,bIdx)} className="text-red-600 text-[11px]">Remove</button>
                                </div>
                              </div>
                              <input className="w-full p-1.5 text-xs border rounded mb-2" placeholder="Block title (optional)" value={b.title || ''} onChange={(e)=>updateBlockField(idx,bIdx,{ title: e.target.value })} />
                              <div className="space-y-1">
                                {(b.items || []).map((p, pIdx) => (
                                  <div key={pIdx} className="flex items-center gap-2">
                                    <input className="flex-1 p-1.5 text-xs border rounded" placeholder={`Point ${pIdx+1}`} value={p} onChange={(e)=>updateItem(idx,bIdx,pIdx,e.target.value)} />
                                    <button type="button" onClick={()=>removeItem(idx,bIdx,pIdx)} className="text-red-600"><X size={11} /></button>
                                  </div>
                                ))}
                                <button type="button" onClick={()=>addItem(idx,bIdx)} className="text-blue-600 hover:text-blue-700 text-[11px] flex items-center"><Plus size={11} className="mr-1" />Add point</button>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={()=>addBlock(idx,'number')} className="text-purple-700 hover:text-purple-800 text-xs flex items-center"><Plus size={12} className="mr-1" />Add Points Block</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addSection} className="text-purple-700 hover:text-purple-800 text-sm flex items-center"><Plus size={16} className="mr-1" />Add Section</button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eventForm.registration_open}
                    onChange={(e) => setEventForm(prev => ({ ...prev, registration_open: e.target.checked }))}
                    className="mr-2"
                  />
                  Registration Open
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!eventForm.registration_timer_enabled}
                    onChange={(e) => setEventForm(prev => ({ ...prev, registration_timer_enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  Enable Timer (optional)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!(eventForm as any).registration_photo_required}
                    onChange={(e) => setEventForm(prev => ({ ...prev, registration_photo_required: e.target.checked } as any))}
                    className="mr-2"
                  />
                  Require Photo During Registration
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eventForm.featured}
                    onChange={(e) => setEventForm(prev => ({ ...prev, featured: e.target.checked }))}
                    className="mr-2"
                  />
                  Featured Event
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eventForm.visible}
                    onChange={(e) => setEventForm(prev => ({ ...prev, visible: e.target.checked }))}
                    className="mr-2"
                  />
                  Visible to Public
                </label>
              </div>
              {/* Registration Photo Label (optional) */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Photo Label (optional)</label>
                <input
                  type="text"
                  value={(eventForm as any).registration_photo_label || ''}
                  onChange={(e) => setEventForm(prev => ({ ...prev, registration_photo_label: e.target.value } as any))}
                  placeholder="e.g., Participant Photo, College ID Photo, etc."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <p className="text-xs text-gray-500 mt-1">Shown to users on the registration form. Leave blank to use default.</p>
              </div>
              {eventForm.registration_timer_enabled && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Opens At (optional)</label>
                  <input
                    type="datetime-local"
                    value={eventForm.registration_opens_at || ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, registration_opens_at: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Users will see countdown until this time. After it passes, event can show "Live Now" if registration is open.</p>
                </div>
              )}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Watch Live URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={eventForm.watch_live_url || ''}
                  onChange={(e) => setEventForm(prev => ({ ...prev, watch_live_url: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <p className="text-xs text-gray-500 mt-1">Shown 60 min before start (disabled until live) and during the event.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Image *</label>
                <ImageUpload
                  onImageSelect={(url) => setEventForm(prev => ({ ...prev, image: url }))}
                  currentImage={eventForm.image}
                  bucket="event-images"
                  folder="events"
                    cropAspect={16/9}
                    maxImageBytes={20 * 1024 * 1024}
                    fileTypeLabel={`PNG or JPG up to 20MB. ${posterGuideline}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motion Poster (Video)</label>
                <ImageUpload
                  onImageSelect={(url) => setEventForm(prev => ({ ...prev, motion_poster_url: url }))}
                  currentImage={eventForm.motion_poster_url || ''}
                  bucket="event-images"
                  folder="events/motion-posters"
                  acceptedTypes="video/*"
                  fileTypeLabel="MP4, MOV, WEBM up to 50MB"
                  enableCropper={false}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsAddingEvent(false);
                resetEventForm();
              }}
              className="w-full sm:w-auto px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
            >
              <X size={16} className="mr-1" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddEvent}
              className="w-full sm:w-auto px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 flex items-center justify-center"
            >
              <Save size={16} className="mr-1" />
              Add Event
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  {events.map((event: any) => (
          <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {editingEvent === event.id ? (
              <div className="p-4 space-y-4">
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <select
                  value={eventForm.category}
                  onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Select Category</option>
                  {eventCategories.map((category: any) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Event description"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="Time"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <input
                  type="text"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Venue"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                {/* Watch Live URL (edit mode) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 mt-1">Watch Live URL (optional)</label>
                  <input
                    type="url"
                    value={eventForm.watch_live_url || ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, watch_live_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Appears 60 min before start (disabled until live) and during event.</p>
                </div>
                
                {/* Rules editing */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Event Rules</label>
                    <label className="text-xs text-gray-700 flex items-center select-none">
                      <input type="checkbox" className="mr-2" checked={rulesModeStructured} onChange={(e)=>{
                        const enabled = e.target.checked;
                        if (enabled) {
                          setRulesModeStructured(true);
                          if (rulesSections.length === 0) setRulesSections([{ heading: '', blocks: [{ kind: 'points', style: 'number', title: '', items: eventForm.rules.length ? [...eventForm.rules] : [''] }] }]);
                        } else {
                          const flat = rulesSections.flatMap(s => (s.blocks || []).flatMap(b => (b.items || [])).filter(p=>p && p.trim()));
                          if (flat.length) setEventForm(prev => ({ ...prev, rules: flat }));
                          setRulesModeStructured(false);
                        }
                      }} />
                      Structured sections
                    </label>
                  </div>
                  {!rulesModeStructured ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {eventForm.rules.map((rule, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input type="text" value={rule} onChange={(e) => updateRule(index, e.target.value)} placeholder="Event rule" className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400" />
                          <button type="button" onClick={() => removeRule(index)} className="text-red-600 hover:text-red-800 p-1"><X size={12} /></button>
                        </div>
                      ))}
                      <button type="button" onClick={addRule} className="text-blue-600 hover:text-blue-700 text-xs flex items-center"><Plus size={12} className="mr-1" />Add Rule</button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-56 overflow-y-auto">
                      {rulesSections.map((sec, idx) => (
                        <div key={idx} className="border border-gray-200 rounded p-2 bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold text-gray-700">Section {idx+1}</div>
                            <button type="button" onClick={()=>removeSection(idx)} className="text-red-600 text-[11px]">Remove</button>
                          </div>
                          <input className="w-full p-1.5 text-xs border rounded mb-1" placeholder="Heading (optional)" value={sec.heading || ''} onChange={(e)=>updateSectionField(idx,'heading',e.target.value)} />
                          <div className="space-y-2">
                            {(sec.blocks || []).map((b, bIdx) => (
                              <div key={bIdx} className="border border-dashed border-gray-300 rounded p-2 bg-white">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-[11px] font-semibold text-gray-700">Points block {bIdx+1}</div>
                                  <div className="flex items-center gap-2">
                                    <select className="text-[11px] border rounded p-1" value={b.style || 'number'} onChange={(e)=>updateBlockField(idx,bIdx,{ style: (e.target.value as 'bullet'|'number') })}>
                                      <option value="number">Numbered</option>
                                      <option value="bullet">Bullets</option>
                                    </select>
                                    <button type="button" onClick={()=>removeBlock(idx,bIdx)} className="text-red-600 text-[11px]">Remove</button>
                                  </div>
                                </div>
                                <input className="w-full p-1.5 text-xs border rounded mb-1" placeholder="Block title (optional)" value={b.title || ''} onChange={(e)=>updateBlockField(idx,bIdx,{ title: e.target.value })} />
                                <div className="space-y-1">
                                  {(b.items || []).map((p, pIdx) => (
                                    <div key={pIdx} className="flex items-center gap-2">
                                      <input className="flex-1 p-1.5 text-xs border rounded" placeholder={`Point ${pIdx+1}`} value={p} onChange={(e)=>updateItem(idx,bIdx,pIdx,e.target.value)} />
                                      <button type="button" onClick={()=>removeItem(idx,bIdx,pIdx)} className="text-red-600"><X size={11} /></button>
                                    </div>
                                  ))}
                                  <button type="button" onClick={()=>addItem(idx,bIdx)} className="text-blue-600 hover:text-blue-700 text-[11px] flex items-center"><Plus size={11} className="mr-1" />Add point</button>
                                </div>
                              </div>
                            ))}
                            <button type="button" onClick={()=>addBlock(idx,'number')} className="text-purple-700 hover:text-purple-800 text-[11px] flex items-center"><Plus size={11} className="mr-1" />Add Points Block</button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addSection} className="text-purple-700 hover:text-purple-800 text-xs flex items-center"><Plus size={12} className="mr-1" />Add Section</button>
                    </div>
                  )}
                </div>

                <ImageUpload
                  onImageSelect={(url) => setEventForm(prev => ({ ...prev, image: url }))}
                  currentImage={eventForm.image}
                  bucket="event-images"
                  folder="events"
                  className="h-32"
                  cropAspect={16/9}
                  maxImageBytes={20 * 1024 * 1024}
                  fileTypeLabel={`PNG or JPG up to 20MB. ${posterGuideline}`}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motion Poster (Video)</label>
                  <ImageUpload
                    onImageSelect={(url) => setEventForm(prev => ({ ...prev, motion_poster_url: url }))}
                    currentImage={eventForm.motion_poster_url || ''}
                    bucket="event-images"
                    folder="events/motion-posters"
                    acceptedTypes="video/*"
                    fileTypeLabel="MP4, MOV, WEBM up to 50MB"
                    enableCropper={false}
                    className="mt-1"
                  />
                </div>
                {/* Timer settings (edit) */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!!eventForm.registration_timer_enabled}
                      onChange={(e) => setEventForm(prev => ({ ...prev, registration_timer_enabled: e.target.checked }))}
                      className="mr-2"
                    />
                    Enable Timer (optional)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!!(eventForm as any).registration_photo_required}
                      onChange={(e) => setEventForm(prev => ({ ...prev, registration_photo_required: e.target.checked } as any))}
                      className="mr-2"
                    />
                    Require Photo During Registration
                  </label>
                  {eventForm.registration_timer_enabled && (
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registration Opens At</label>
                      <input
                        type="datetime-local"
                        value={eventForm.registration_opens_at || ''}
                        onChange={(e) => setEventForm(prev => ({ ...prev, registration_opens_at: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  )}
                </div>
                {/* Registration Photo Label (edit) */}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Photo Label (optional)</label>
                  <input
                    type="text"
                    value={(eventForm as any).registration_photo_label || ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, registration_photo_label: e.target.value } as any))}
                    placeholder="e.g., Participant Photo, College ID Photo, etc."
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent(null);
                      resetEventForm();
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
                  >
                    <X size={14} className="mr-1" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateEvent(event.id)}
                    className="w-full sm:w-auto px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center justify-center"
                  >
                    <Save size={14} className="mr-1" />
                    Save
                  </button>
                </div>
                {/* Coordinators management */}
                <div className="mt-4 border-t pt-3">
                  <div className="text-sm font-semibold mb-2">Coordinators</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {coordinatorsFor(event.id).map((c, idx, list) => (
                      <div key={c.id} className="grid grid-cols-12 gap-2 items-center">
                        <input className="col-span-5 p-1 text-sm border rounded" value={c.name} onChange={(e)=>updateCoordinatorField(c.id,'name',e.target.value)} />
                        <input className="col-span-5 p-1 text-sm border rounded" value={c.phone || ''} onChange={(e)=>updateCoordinatorField(c.id,'phone',e.target.value)} />
                        <div className="col-span-2 flex items-center gap-1">
                          <button type="button" onClick={()=>moveCoordinator(event.id, c.id, -1)} disabled={idx===0} className={`p-1 ${idx===0? 'text-gray-300':'text-gray-600 hover:text-gray-800'}`} title="Move up"><ArrowUp size={12} /></button>
                          <button type="button" onClick={()=>moveCoordinator(event.id, c.id, 1)} disabled={idx===list.length-1} className={`p-1 ${idx===list.length-1? 'text-gray-300':'text-gray-600 hover:text-gray-800'}`} title="Move down"><ArrowDown size={12} /></button>
                          <button type="button" onClick={()=>removeCoordinator(c.id)} className="p-1 text-red-600" title="Delete"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-12 gap-2 mt-2">
                    <input className="col-span-5 p-1 text-sm border rounded" value={newCoordinator.name} onChange={(e)=>setNewCoordinator(prev=>({...prev,name:e.target.value}))} placeholder="Name" />
                    <input className="col-span-5 p-1 text-sm border rounded" value={newCoordinator.phone} onChange={(e)=>setNewCoordinator(prev=>({...prev,phone:e.target.value}))} placeholder="Phone" />
                    <button type="button" onClick={()=>addCoordinator(event.id)} className="col-span-2 bg-green-600 text-white rounded text-xs px-2">Add</button>
                  </div>

                  {/* Winners management (show once per event) */}
                  <div className="mt-4 border-t pt-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                      <div className="text-sm font-semibold">Winners</div>
                    </div>
                    <EventWinnersEditor eventId={event.id} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative h-48">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Last-10s full-card countdown overlay for admins too */}
                  {(() => {
                    const secs = getSecondsToOpen(event);
                    const openAt = (event as any).registration_opens_at ? new Date((event as any).registration_opens_at as string).getTime() : null;
                    const isTimerOpenWithGrace = openAt != null ? Date.now() + 1000 >= openAt : false;
                    const show = !isTimerOpenWithGrace && !event.registration_open && (event as any).registration_timer_enabled && typeof secs === 'number' && secs > 0 && secs <= 10;
                    if (!show) return null;
                    return (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                        <div
                          className="font-black select-none countdown-drama"
                          title={getOpensAtTooltip(event)}
                          style={{
                            fontSize: 'clamp(36px, 14vw, 120px)',
                            lineHeight: 1,
                            textAlign: 'center',
                            ...getCountdownStylesForSecs(secs),
                          }}
                       >
                          {secs}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="absolute top-2 right-2 flex space-x-1">
                    {event.featured && (
                      <span className="bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-medium">
                        <Star size={12} className="inline mr-1" />
                        Featured
                      </span>
                    )}
                    {!event.visible && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Hidden
                      </span>
                    )}
                    {/* Quick winners preview + manage button */}
                    {(myPermissions?.can_events || true) && (
                      <div className="ml-2 flex items-center gap-2">
                        <div className="text-xs text-gray-300">{((_eventWinners || []) as any[]).filter((w:any) => w.event_id === event.id).length} winners</div>
                        <button onClick={() => setActiveWinnersFor((cur) => cur === event.id ? null : event.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Manage Winners</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{event.title}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {event.category}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{event.description}</p>
                  <div className="space-y-1 text-xs text-gray-500 mb-3">
                    {String(event.date || '').trim() && (
                      <div className="flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {event.date}
                      </div>
                    )}
                    {String(event.time || '').trim() && (
                      <div className="flex items-center">
                        <Clock size={12} className="mr-1" />
                        {event.time}
                      </div>
                    )}
                    {String(event.venue || '').trim() && (
                      <div className="flex items-center">
                        <MapPin size={12} className="mr-1" />
                        {event.venue}
                      </div>
                    )}
                    {(event.max_participants || (event as any).participants) && (
                      <div className="flex items-center">
                        <Users size={12} className="mr-1" />
                        {event.max_participants
                          ? `${event.current_registrations ?? 0} / ${event.max_participants} participants`
                          : `${String((event as any).participants).trim()} participants`}
                      </div>
                    )}
                    {event.rules && computeRulesCount(event.rules) > 0 && (
                      <div className="flex items-center">
                        <FileText size={12} className="mr-1" />
                        {computeRulesCount(event.rules)} rule{computeRulesCount(event.rules) !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  
                  {/* Registration Progress */}
                  {event.max_participants && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Registrations</span>
                        <span>{event.current_registrations || 0} / {event.max_participants}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, ((event.current_registrations || 0) / event.max_participants) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex space-x-1">
                      {/* Inline winners editor: show below card when toggled */}
                      {activeWinnersFor === event.id && (
                        <div className="col-span-12 mt-4">
                          <EventWinnersEditor eventId={event.id} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(event.id)}
                        className={`p-1 rounded transition-colors ${
                          event.featured ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'
                        } hover:bg-yellow-200`}
                        title={event.featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <Star size={14} className={event.featured ? 'fill-current' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(event.id)}
                        className={`p-1 rounded transition-colors ${
                          event.visible !== false ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        } hover:bg-green-200`}
                        title={event.visible !== false ? 'Hide from public' : 'Show to public'}
                      >
                        {event.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRegistration(event.id)}
                        className={`p-1 rounded transition-colors ${
                          event.registration_open ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        } hover:bg-blue-200`}
                        title={event.registration_open ? 'Close registration' : 'Open registration'}
                      >
                        {event.registration_open ? <UserPlus size={14} /> : <UserMinus size={14} />}
                      </button>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => startEditingEvent(event)}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                        title="Edit event"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                        title="Delete event"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="ml-2 flex items-center gap-2">
                      <label className="flex items-center text-xs text-gray-700">
                        <input
                          type="checkbox"
                          className="mr-1"
                          checked={!!event.registration_open}
                          onChange={(e)=>handleSetRegistrationOpen(event.id, e.target.checked)}
                        />
                        Live
                      </label>
                      {event.registration_open ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">Live Now</span>
                      ) : (event as any).registration_timer_enabled && (event as any).registration_opens_at ? (
                        getCountdown(event) === 'now' ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700" title="Opening now">Opening now…</span>
                        ) : (
                          (() => {
                            const secs = getSecondsToOpen(event);
                            const isBoundary = typeof secs === 'number' && secs > 0 && secs <= 3;
                            return (
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${isBoundary ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-blue-100 text-blue-700'}`}
                                title={getOpensAtTooltip(event)}
                              >
                                {isBoundary ? `Starting in ${secs}s` : `Opens in ${getCountdown(event)}`}
                              </span>
                            );
                          })()
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* No Events Message */}
      {events.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Calendar size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Events Yet</h3>
          <p className="text-gray-500 mb-4">Start by adding your first event</p>
          <button
            type="button"
            onClick={() => {
              setIsAddingEvent(true);
              resetEventForm();
            }}
            className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Add First Event
          </button>
        </div>
      )}
      <style>{`
        @keyframes countdownScalePulse { 
          0% { transform: scale(0.9); text-shadow: 0 12px 32px rgba(0,0,0,0.6); opacity: 0.9; }
          35% { transform: scale(1.06); text-shadow: 0 18px 48px rgba(0,0,0,0.7); opacity: 1; }
          70% { transform: scale(1.0); text-shadow: 0 12px 32px rgba(0,0,0,0.6); opacity: 0.95; }
          100% { transform: scale(0.98); text-shadow: 0 10px 24px rgba(0,0,0,0.55); opacity: 0.92; }
        }
        .countdown-drama {
          letter-spacing: -0.02em;
          animation: countdownScalePulse 1000ms ease-in-out infinite;
          filter: drop-shadow(0 10px 24px rgba(0,0,0,0.65));
        }
      `}</style>
    </div>
  );
};