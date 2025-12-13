import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Calendar, Clock, MapPin, Users, Eye, EyeOff, Star, UserPlus, UserMinus, FileText, ArrowUp, ArrowDown, Loader2, Bell, Upload } from 'lucide-react';
import { useData } from '../../context/DataContext';
import type { EventCoordinator } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import { VideoUpload } from '../VideoUpload';
import { supabase } from '../../lib/supabase';
import EventWinnersEditor from './EventWinnersEditor';
import type { Event } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';

import { useToast } from '../../components/ToastProvider';


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

export const EventsManagement: React.FC = () => {
  const { push } = useToast();
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
    // Reorder
    reorderEvents,
    lastEventReorderError,
  } = (useData() || {}) as any;
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Manual Notification Modal State
  const [manualNotifyEvent, setManualNotifyEvent] = useState<any | null>(null);
  const [manualNotifyType, setManualNotifyType] = useState<'schedule' | 'rules'>('rules');
  const [manualNotifyMessage, setManualNotifyMessage] = useState('');
  const [manualNotifyHighlights, setManualNotifyHighlights] = useState<Set<string>>(new Set()); // Rule strings to highlight
  const [sendingManualNotify, setSendingManualNotify] = useState(false);

  const handleManualNotify = (event: any) => {
    // Clone so we can modify rules for display without affecting store
    const evt = { ...event };

    // Flatten structured rules for manual selection
    if (evt.rules && isStructuredRules(evt.rules)) {
        const sections = unpackStructured(evt.rules);
        const flat: string[] = [];
        sections.forEach(sec => {
            if (sec.heading) flat.push(`<strong>${sec.heading}</strong>`);
            sec.blocks?.forEach(block => {
                if (block.title) flat.push(`<em>${block.title}</em>`);
                block.items.forEach(item => flat.push(item));
            });
        });
        evt.rules = flat;
    }

    setManualNotifyEvent(evt);
    setManualNotifyType('rules'); // Default to rules as it's the complex one
    setManualNotifyMessage('Please check the website for updated rules.');
    setManualNotifyHighlights(new Set());
  };

  const sendManualNotification = async () => {
    if (!manualNotifyEvent) return;
    
    // Validate
    if (!confirm(`Send "${manualNotifyType.toUpperCase()}" notification to approved participants?`)) return;

    setSendingManualNotify(true);
    try {
        const { supabase } = await import('../../lib/supabase');
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) throw new Error('No auth token');

        // Prepare rules with highlights
        const rulesPayload = manualNotifyEvent.rules?.map((r: string) => ({
            text: r,
            highlight: manualNotifyType === 'rules' && manualNotifyHighlights.has(r) // Only highlight if type is rules AND selected
        }));

        const res = await fetch('/api/notify-event-update', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                eventId: manualNotifyEvent.id,
                eventTitle: manualNotifyEvent.title,
                updateType: manualNotifyType,
                message: manualNotifyMessage,
                rules: rulesPayload, 
                newDetails: {
                    date: manualNotifyEvent.date,
                    time: manualNotifyEvent.time,
                    venue: manualNotifyEvent.venue
                }
            })
        });

        const result = await res.json();
        if (res.ok) {
            push({ message: `Success: Sent ${result.sent} emails.`, type: 'success' });
            setManualNotifyEvent(null); // Close modal
        } else {
            console.error(result);
            push({ message: `Failed: ${result.error}`, type: 'error' });
        }
    } catch (e: any) {
        console.error(e);
        push({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
        setSendingManualNotify(false);
    }
  };

  // ---- Email Stamp Helpers ----
  const [emailStampUrl, setEmailStampUrl] = useState<string | null>(null);
  const [uploadingEmailStamp, setUploadingEmailStamp] = useState(false);

  useEffect(() => {
    const loadEmailStamp = async () => {
        const { data: stList } = await supabase.storage.from('pdf-watermarks').list();
        const stFile = stList?.find((f: any) => f.name === 'email_stamp.png' || f.name === 'email_stamp.svg');
        if (stFile) {
            // Signed URL for 1 hour is enough for preview
             const { data } = await supabase.storage.from('pdf-watermarks').createSignedUrl(stFile.name, 3600);
             if (data?.signedUrl) setEmailStampUrl(data.signedUrl);
        }
    };
    loadEmailStamp();
  }, []);

  const handleEmailStampUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      if (!file.type.includes('image/png') && !file.type.includes('image/svg')) {
        alert('Please upload a PNG or SVG file.');
        return;
      }
      
      setUploadingEmailStamp(true);
      
      const fileExt = file.type.includes('image/svg') ? 'svg' : 'png';
      const fileName = `email_stamp.${fileExt}`;
      
      // Delete existing files first
      await supabase.storage.from('pdf-watermarks').remove(['email_stamp.png', 'email_stamp.svg']);

      const { error } = await supabase.storage
        .from('pdf-watermarks')
        .upload(fileName, file, { cacheControl: '0', upsert: true });

      if (error) throw error;

      // Get signed url for preview
      const { data } = await supabase.storage.from('pdf-watermarks').createSignedUrl(fileName, 3600);
      setEmailStampUrl(data?.signedUrl || null);
      push({ message: 'Email stamp uploaded successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading stamp:', error);
      push({ message: 'Failed to upload stamp.', type: 'error' });
    } finally {
      setUploadingEmailStamp(false);
    }
  };

  const handleEmailStampDelete = async () => {
    if (!confirm('Are you sure you want to remove the email stamp?')) return;
    try {
      setUploadingEmailStamp(true);
      await supabase.storage.from('pdf-watermarks').remove(['email_stamp.png', 'email_stamp.svg']);
      setEmailStampUrl(null);
      push({ message: 'Email stamp removed.', type: 'success' });
    } catch (error) {
      console.error('Error deleting stamp:', error);
    } finally {
      setUploadingEmailStamp(false);
    }
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
  rules_link: '' as string | null,
    registration_open: true,
    registration_timer_enabled: false as boolean,
  registration_opens_at: '' as string | null,
  registration_closes_at: '' as string | null,
  registration_photo_required: false as boolean,
  registration_photo_label: '' as string | null,
    registration_form_fields: [] as any[],
  registration_participant_types: [] as string[],
  registration_participant_quotas: {} as Record<string, number>,
    // registration_default_mode: 'individual' | 'team' — owner can set default per event
    registration_default_mode: 'individual' as 'individual' | 'team',
    registration_mode_locked: false as boolean,
  team_max_members: undefined as number | undefined,
  team_required_size: undefined as number | undefined,
    max_participants: undefined as number | undefined,
    featured: false,
    visible: true,
    artist_id: undefined as number | undefined,
    watch_live_url: '' as string | null,
    prefer_video: false as boolean,
    motion_poster_autoplay: false as boolean,
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

  // ---- Events reorder (owner/admin) ----
  const [reorderMode, setReorderMode] = useState(false);
  const [orderList, setOrderList] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [reorderMessage, setReorderMessage] = useState<string | null>(null);
  const canReorder = !!(myPermissions?.can_events || true); // owner and events-admins

  const openReorder = () => {
    setOrderList(events.map((e: any) => e.id));
    setReorderMode(true);
  };
  const closeReorder = () => {
    setReorderMode(false);
    setOrderList([]);
    setDragIndex(null);
    setReorderMessage(null);
  };
  const moveRow = (idx: number, delta: -1 | 1) => {
    setOrderList(prev => {
      const j = idx + delta;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return next;
    });
  };
  const onDragStartRow = (idx: number) => setDragIndex(idx);
  const onDragOverRow = (e: React.DragEvent<HTMLDivElement>, overIndex: number) => {
    e.preventDefault();
    setOrderList(prev => {
      if (dragIndex === null || dragIndex === overIndex) return prev;
      const arr = [...prev];
      const [item] = arr.splice(dragIndex, 1);
      arr.splice(overIndex, 0, item);
      setDragIndex(overIndex);
      return arr;
    });
  };
  const persistReorder = async () => {
    if (!orderList.length) return;
    setSavingOrder(true);
    setReorderMessage(null);
    try {
      const ok = await (reorderEvents?.(orderList) || Promise.resolve(false));
      setReorderMessage(ok ? 'Order saved' : 'Some rows failed to save');
      if (ok) setTimeout(() => { setReorderMode(false); setReorderMessage(null); }, 1200);
    } catch (e) {
      console.error('Failed to reorder events', e);
      setReorderMessage('Failed to reorder');
    } finally {
      setSavingOrder(false);
    }
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
      motion_poster_autoplay: false,
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
      registration_closes_at: '',
      registration_photo_required: false,
      registration_photo_label: '',
      registration_form_fields: [],
      registration_participant_types: [],
      registration_participant_quotas: {},
      registration_default_mode: 'individual',
      registration_mode_locked: false,
      team_max_members: undefined,
      team_required_size: undefined,
      max_participants: undefined,
      featured: false,
      visible: true,
      artist_id: undefined,
      watch_live_url: '',
      prefer_video: false,
      rules_link: '',
    });
    setRulesModeStructured(false);
    setRulesSections([]);
  };

  const validateRules = (rules: string[]): boolean => {
    try {
      if (!rules || !Array.isArray(rules)) return false;
      if (isStructuredRules(rules)) {
        const sections = unpackStructured(rules);
        // If structured but unpacking returns empty and input wasn't trivial, it might be corrupt
        // But unpackStructured returns [] on error.
        // We trust that if it passed packStructured, it's likely okay, but let's be sure.
        return true;
      }
      // Simple rules: check for non-strings?
      return rules.every(r => typeof r === 'string');
    } catch {
      return false;
    }
  };

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.description) {
      alert('Please fill in all required fields (title and description)');
      return;
    }
    
    try {
      setSavingAdd(true);
      const rawRules = rulesModeStructured ? packStructured(rulesSections) : (eventForm.rules || []);
      const finalRules = rawRules.filter(r => !!r); // Remove null/undefined
      
      if (!validateRules(finalRules)) {
        throw new Error('Invalid rules format. Please check your rules.');
      }

      const eventData = {
        ...eventForm,
        // Allow NULL for date/time/venue (migration removes NOT NULL constraint)
        date: eventForm.date?.trim() || null,
        time: eventForm.time?.trim() || null,
        venue: eventForm.venue?.trim() || null,
        rules_link: eventForm.rules_link || null,
        rules: finalRules,
        category: eventForm.category || (eventCategories.length > 0 ? eventCategories[0].name : 'General'),
        registration_timer_enabled: !!eventForm.registration_timer_enabled,
        registration_opens_at: eventForm.registration_opens_at ? new Date(eventForm.registration_opens_at).toISOString() : null,
        registration_closes_at: eventForm.registration_closes_at ? new Date(eventForm.registration_closes_at).toISOString() : null,
        registration_photo_required: !!(eventForm as any).registration_photo_required,
        registration_photo_label: (eventForm as any).registration_photo_label || null,
        current_registrations: 0,
        registration_participant_types: eventForm.registration_participant_types || undefined,
        registration_participant_quotas: (eventForm as any).registration_participant_quotas && Object.keys((eventForm as any).registration_participant_quotas).length ? (eventForm as any).registration_participant_quotas : null,
        registration_default_mode: (eventForm as any).registration_default_mode || 'individual',
        registration_mode_locked: (eventForm as any).registration_mode_locked ?? false,
        team_max_members: (eventForm as any).team_max_members ?? null,
        team_required_size: (eventForm as any).team_required_size ?? null,
        max_participants: (eventForm as any).max_participants ?? null,
        coordinators: draftCoordinators // Include coordinators in the data
      };
      
      // Check if current admin requires approval
      const needsApproval = await checkRequiresApproval();
      
      if (needsApproval) {
        // Submit for owner approval
        const result = await submitForApproval('event', 'create', eventData);
        if (result.success) {
          alert('✓ Event submitted for owner approval!\n\nYour event will be published once the owner reviews and approves it.');
          setIsAddingEvent(false);
          resetEventForm();
          setDraftCoordinators([]);
          try { localStorage.removeItem('admin_events_form_draft'); } catch {}
        } else {
          throw new Error(result.error || 'Failed to submit for approval');
        }
      } else {
        // Direct save (no approval required)
        // Extract coordinators before passing to addEventWithCoordinators
        const { coordinators, ...eventDataWithoutCoordinators } = eventData;
        await addEventWithCoordinators(eventDataWithoutCoordinators as any, coordinators);
        alert('✓ Event added successfully!');
        setIsAddingEvent(false);
        resetEventForm();
        setDraftCoordinators([]);
        try { localStorage.removeItem('admin_events_form_draft'); } catch {}
      }
    } catch (error: any) {
      console.error('Error adding event:', error);
      alert(error?.message || 'Failed to add event. Please try again.');
    } finally {
      setSavingAdd(false);
    }
  };

  const handleUpdateEvent = async (id: number) => {
    if (!eventForm.title || !eventForm.description) {
      alert('Please fill in all required fields (title and description)');
      return;
    }
    
    try {
      setSavingUpdate(true);
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      const rawRules = rulesModeStructured ? packStructured(rulesSections) : (eventForm.rules || []);
      const finalRules = rawRules.filter(r => !!r);
      
      if (!validateRules(finalRules)) {
        throw new Error('Invalid rules format. Please check your rules.');
      }

      const eventData = {
        ...eventForm,
        // Allow NULL for date/time/venue (migration removes NOT NULL constraint)
        date: eventForm.date?.trim() || null,
        time: eventForm.time?.trim() || null,
        venue: eventForm.venue?.trim() || null,
        rules_link: eventForm.rules_link || null,
        rules: finalRules,
        // Heuristic Logic for "Close Now":
        // If user is unchecking manual open (registration_open=false), AND timer is enabled, AND timer start time has passed, 
        // we assume they want to CLOSE the event, so we disable the timer too.
        registration_timer_enabled: (() => {
           // If user explicitly unchecked timer in UI, respect that
           if (!eventForm.registration_timer_enabled) return false;
           
           // If user unchecked manual open, check if we need to auto-disable timer to force close
           if (!eventForm.registration_open && eventForm.registration_opens_at) {
              const start = new Date(eventForm.registration_opens_at).getTime();
              // If start time is valid and passed
              if (!isNaN(start) && Date.now() >= start) {
                return false; // Disable timer to allow closing
              }
           }
           
           // Otherwise keep timer as set in UI
           return !!eventForm.registration_timer_enabled;
        })(),
        registration_opens_at: eventForm.registration_opens_at ? new Date(eventForm.registration_opens_at).toISOString() : null,
        registration_closes_at: eventForm.registration_closes_at ? new Date(eventForm.registration_closes_at).toISOString() : null,
        registration_photo_required: !!(eventForm as any).registration_photo_required,
        registration_photo_label: (eventForm as any).registration_photo_label || null,
        registration_participant_types: (eventForm as any).registration_participant_types || null,
        registration_participant_quotas: (eventForm as any).registration_participant_quotas && Object.keys((eventForm as any).registration_participant_quotas).length ? (eventForm as any).registration_participant_quotas : null,
        registration_default_mode: (eventForm as any).registration_default_mode || 'individual',
        registration_mode_locked: (eventForm as any).registration_mode_locked ?? false,
        team_max_members: (eventForm as any).team_max_members ?? null,
        team_required_size: (eventForm as any).team_required_size ?? null,
        max_participants: (eventForm as any).max_participants ?? null,
      };
      
      // Check if current admin requires approval
      const needsApproval = await checkRequiresApproval();
      
      if (needsApproval) {
        // Submit for owner approval
        const result = await submitForApproval('event', 'update', eventData, id);
        if (result.success) {
          push({ message: 'Event update submitted for owner approval!', type: 'success' });
          setEditingEvent(null);
          resetEventForm();
          try { localStorage.removeItem('admin_events_form_draft'); } catch {}
        } else {
          throw new Error(result.error || 'Failed to submit for approval');
        }
      } else {
        // Direct update (no approval required)
        
        // Detect changes before saving to ask for notification later
        const originalEvent = events.find((e: any) => e.id === id);
        const hasScheduleChanges = originalEvent && (
          (originalEvent.date || '') !== (eventData.date || '') ||
          (originalEvent.time || '') !== (eventData.time || '') ||
          (originalEvent.venue || '') !== (eventData.venue || '')
        );

        // Detect Rule Changes
        // Simple JSON stringify comparison to detect any change in the rules array structure or content
        const rulesChanged = JSON.stringify(originalEvent?.rules || []) !== JSON.stringify(eventData.rules || []);

        await updateEvent(id, eventData as any);
        steps.next('Finalizing');

        // Notification Logic
        if (hasScheduleChanges || rulesChanged) {
           let shouldNotify = false;
           let updateType = 'schedule';
           let customMsg = '';

           if (hasScheduleChanges && rulesChanged) {
             shouldNotify = confirm(
               'Both Schedule (Date/Time/Venue) AND Rules have changed.\n\nDo you want to send a COMBINED EMAIL NOTIFICATION to all approved participants?'
             );
             if (shouldNotify) {
                 updateType = 'schedule'; // We use schedule layout but append rule message
                 customMsg = prompt('Optional: Add a note about the rule changes:', 'Rules & Regulations have also been updated. Please review them on the website.') || '';
             }
           } else if (hasScheduleChanges) {
             shouldNotify = confirm(
               'Event Date/Time/Venue has changed.\n\nDo you want to send an EMAIL NOTIFICATION to all approved participants about this update?'
             );
           } else if (rulesChanged) {
             shouldNotify = confirm(
               'Event Rules have changed.\n\nDo you want to send an EMAIL NOTIFICATION to all approved participants about this rule change?'
             );
             if (shouldNotify) {
                 updateType = 'rules';
                 customMsg = prompt('Optional: Add a short message to include in the email:', 'Please review the updated rules.') || '';
             }
           }
           
           if (shouldNotify) {
              steps.next('Sending Emails');
              try {
                const { supabase } = await import('../../lib/supabase');
                const token = (await supabase.auth.getSession()).data.session?.access_token;

                if (token) {
                    const notifyRes = await fetch('/api/notify-event-update', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            'Authorization': `Bearer ${token}` 
                        },
                        body: JSON.stringify({
                            eventId: id,
                            eventTitle: eventData.title,
                            updateType: updateType,
                            message: customMsg,
                            rules: eventData.rules?.map((r: string) => {
                                const cleanRule = r.trim();
                                const isNew = !originalEvent.rules?.some((existing: string) => existing.trim() === cleanRule);
                                return {
                                    text: r,
                                    highlight: isNew
                                };
                            }), // Identify new rules by checking trimmed existence
                            newDetails: {
                                date: eventData.date,
                                time: eventData.time,
                                venue: eventData.venue
                            }
                        })
                    });
                    const notifyResult = await notifyRes.json();
                    if (notifyRes.ok) {
                        // Use useToast via prop/context if available, otherwise fallback to alert or window hook?
                        // This component uses hooks... but we need to pass `push` if available or use alert if local toast not in scope in this block?
                        // `EventsManagement` does not have `push` destructured from `useToast()` ?? 
                        // Ah, I need to check lines 1-50 imports. I don't see `useToast` used in `EventsManagement` top level.
                        // I will add `const { push } = useToast();` at the top of component.
                        push({ message: `Update Saved & Notified: ${notifyResult.sent} emails sent.`, type: 'success' });
                    } else {
                        console.warn('Notify failed', notifyResult);
                        push({ message: `Update Saved, but Notification Failed: ${notifyResult.error}`, type: 'error' });
                    }
                }
              } catch (notifyErr) {
                 console.error('Notify Error', notifyErr);
                 push({ message: 'Update Saved, but failed to initiate notifications.', type: 'error' });
              }
           } else {
             push({ message: 'Event updated successfully! (Participants were NOT notified)', type: 'info' });
           }
        } else {
            push({ message: 'Event updated successfully!', type: 'success' });
        }

        setEditingEvent(null);
        resetEventForm();
        try { localStorage.removeItem('admin_events_form_draft'); } catch {}
      }
    } catch (error: any) {
      console.error('Error updating event:', error);
      alert(error?.message || 'Failed to update event. Please try again.');
    } finally {
      savingProgress.done();
      setSavingUpdate(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    
    try {
      // Check if current admin requires approval
      const needsApproval = await checkRequiresApproval();
      
      if (needsApproval) {
        // Get event data for the approval record
        const event = events.find((e: any) => e.id === id);
        const result = await submitForApproval('event', 'delete', event || { id }, id);
        if (result.success) {
          alert('✓ Event deletion submitted for owner approval!');
        } else {
          throw new Error(result.error || 'Failed to submit for approval');
        }
      } else {
        // Direct delete
        await deleteEvent(id);
        alert('✓ Event deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      // Check if current admin requires approval
      const needsApproval = await checkRequiresApproval();
      
      if (needsApproval) {
        const event = events.find((e: any) => e.id === id);
        const newValue = !event?.featured;
        const result = await submitForApproval('event', 'update', { featured: newValue }, id);
        if (result.success) {
          alert(`✓ Featured status change submitted for owner approval!`);
        } else {
          throw new Error(result.error || 'Failed to submit for approval');
        }
      } else {
        await toggleEventFeatured(id);
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status. Please try again.');
    }
  };

  const handleToggleVisibility = async (id: number) => {
    try {
      // Check if current admin requires approval
      const needsApproval = await checkRequiresApproval();
      
      if (needsApproval) {
        const event = events.find((e: any) => e.id === id);
        const newValue = !event?.visible;
        const result = await submitForApproval('event', 'update', { visible: newValue }, id);
        if (result.success) {
          alert(`✓ Visibility change submitted for owner approval!`);
        } else {
          throw new Error(result.error || 'Failed to submit for approval');
        }
      } else {
        await toggleEventVisibility(id);
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to update visibility. Please try again.');
    }
  };

  const handleToggleRegistration = async (id: number) => {
    try {
      // Check if current admin requires approval
      const needsApproval = await checkRequiresApproval();
      
      if (needsApproval) {
        const event = events.find((e: any) => e.id === id);
        const newValue = !event?.registration_open;
        
        let newTimer = event?.registration_timer_enabled;
        // Heuristic: If turning OFF manual open, and Timer is currently keeping it open, disable timer too.
        if (!newValue && newTimer && event?.registration_opens_at) {
          const start = new Date(event.registration_opens_at).getTime();
          if (!isNaN(start) && Date.now() >= start) {
            newTimer = false;
          }
        }
        
        const result = await submitForApproval('event', 'update', { registration_open: newValue, registration_timer_enabled: newTimer }, id);
        if (result.success) {
          alert(`✓ Registration status change submitted for owner approval!`);
        } else {
          throw new Error(result.error || 'Failed to submit for approval');
        }
      } else {
        const event = events.find((e: any) => e.id === id);
        // Robustly cast to boolean to avoid sending undefined
        let newTimer = !!event?.registration_timer_enabled;
        const newOpen = !event?.registration_open;
        
        // Heuristic: If turning OFF manual open, and Timer is currently keeping it open, disable timer too.
        if (!newOpen && newTimer && event?.registration_opens_at) {
          const start = new Date(event.registration_opens_at).getTime();
          // If timer has started (or passed), and we are manually closing, we must disable timer to force close
          if (!isNaN(start) && Date.now() >= start) {
             newTimer = false;
          }
        }
        
        // Optimistic update
        await updateEvent(id, { registration_open: newOpen, registration_timer_enabled: newTimer } as any);
      }
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
  motion_poster_autoplay: (event as any).motion_poster_autoplay ?? false,
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
      registration_opens_at: (event as any).registration_opens_at ? (() => {
        const d = new Date((event as any).registration_opens_at);
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
      })() : '',
      registration_closes_at: (event as any).registration_closes_at ? (() => {
        const d = new Date((event as any).registration_closes_at);
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
      })() : '',
  registration_photo_required: (event as any).registration_photo_required ?? false,
    registration_photo_label: (event as any).registration_photo_label || '',
      registration_form_fields: (event as any).registration_form_fields || [],
  registration_participant_types: (event as any).registration_participant_types || [],
    registration_participant_quotas: ((event as any).registration_participant_quotas || {}) as any,
      registration_default_mode: (event as any).registration_default_mode || 'individual',
      registration_mode_locked: (event as any).registration_mode_locked ?? false,
  team_max_members: (event as any).team_max_members ?? undefined,
  team_required_size: (event as any).team_required_size ?? undefined,
      max_participants: event.max_participants ?? undefined,
      featured: event.featured || false,
      visible: event.visible !== false,
      artist_id: event.artist_id ?? undefined,
      watch_live_url: (event as any).watch_live_url || '',
      prefer_video: (event as any).prefer_video ?? false,
      rules_link: (event as any).rules_link || '',
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
      {/* Header - Improved Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Events Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage festival events and registrations</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {canReorder && events.length > 1 && (
            <button
              onClick={() => (reorderMode ? closeReorder() : openReorder())}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                reorderMode ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Drag to reorder events (affects public order)"
            >
              {reorderMode ? 'Done Reordering' : 'Reorder Events'}
            </button>
          )}
          <label className="flex items-center text-sm text-gray-700 px-2">
            <input type="checkbox" className="mr-2" checked={autoOpenEnabled} onChange={(e)=>persistAutoOpen(e.target.checked)} />
            Auto-open after timer
          </label>
          <button
          onClick={() => {
            setIsAddingEvent(true);
            resetEventForm();
          }}
          className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center justify-center font-medium"
        >
          <Plus size={16} className="mr-2" />
          Add Event
          </button>
        </div>
      </div>

      {/* Email Configuration (Email Stamp) - Responsive */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-indigo-500">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
            <Upload className="mr-2 text-indigo-600" size={20} />
            Email Stamp Configuration
          </h3>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
              {emailStampUrl ? (
                <img src={emailStampUrl} alt="Email Stamp" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400 text-center px-1">No Stamp</span>
              )}
              {uploadingEmailStamp && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-gray-600">
                Upload a specific stamp for email notifications (PNG/SVG). This will override the shared PDF stamp in emails.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className={`flex items-center justify-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-md cursor-pointer hover:bg-indigo-500 transition-colors ${uploadingEmailStamp ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={14} className="mr-1.5" />
                  Upload Email Stamp
                  <input 
                    type="file" 
                    accept="image/png,image/svg+xml" 
                    className="hidden" 
                    onChange={handleEmailStampUpload}
                    disabled={uploadingEmailStamp}
                  />
                </label>
                {emailStampUrl && (
                  <button 
                    onClick={handleEmailStampDelete}
                    disabled={uploadingEmailStamp}
                    className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-600 text-sm rounded-md hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* Add Event Form - Responsive */}
      {isAddingEvent && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-4 md:mb-6">Add New Event</h3>
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-4 md:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Will appear 60 minutes before start, disabled until live begins.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={eventForm.category}
                  onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="e.g., 10:00 AM - 2:00 PM"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
                <input
                  type="text"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Event venue location"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              {/* Coordinators (draft while creating a new event) */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-700 mb-2">Coordinators</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {draftCoordinators.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        className="col-span-5 p-2 text-sm border rounded text-gray-900"
                        value={c.name}
                        onChange={(e)=>{
                          const v = e.target.value; setDraftCoordinators(prev=>prev.map((row,i)=> i===idx? { ...row, name: v }: row));
                        }}
                        placeholder="Name"
                      />
                      <input
                        className="col-span-5 p-2 text-sm border rounded text-gray-900"
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
                  <input className="col-span-5 p-2 text-sm border rounded text-gray-900" value={newCoordinator.name} onChange={(e)=>setNewCoordinator(prev=>({...prev,name:e.target.value}))} placeholder="Name" />
                  <input className="col-span-5 p-2 text-sm border rounded text-gray-900" value={newCoordinator.phone} onChange={(e)=>setNewCoordinator(prev=>({...prev,phone:e.target.value}))} placeholder="Phone" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="Event venue"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participants (Optional)</label>
                  <input
                    type="text"
                    value={eventForm.participants}
                    onChange={(e) => setEventForm(prev => ({ ...prev, participants: e.target.value }))}
                    placeholder="e.g., 100+ students"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <label className="flex items-center text-sm text-gray-700 mt-2">
                  <input
                    type="checkbox"
                    checked={(eventForm as any).show_max_participants !== false}
                    onChange={(e) => setEventForm(prev => ({ ...prev, show_max_participants: e.target.checked } as any))}
                    className="mr-2"
                  />
                  Show participant counter on event card
                </label>
                <p className="text-xs text-gray-500">Display registration progress bar when max participants is set</p>
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
                        className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
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
                          className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
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
                        <input className="w-full p-2 text-sm border rounded mb-2 text-gray-900" placeholder="Heading (optional)" value={sec.heading || ''} onChange={(e)=>updateSectionField(idx,'heading',e.target.value)} />
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
                              <input className="w-full p-1.5 text-xs border rounded mb-2 text-gray-900" placeholder="Block title (optional)" value={b.title || ''} onChange={(e)=>updateBlockField(idx,bIdx,{ title: e.target.value })} />
                              <div className="space-y-1">
                                {(b.items || []).map((p, pIdx) => (
                                  <div key={pIdx} className="flex items-center gap-2">
                                    <input className="flex-1 p-1.5 text-xs border rounded text-gray-900" placeholder={`Point ${pIdx+1}`} value={p} onChange={(e)=>updateItem(idx,bIdx,pIdx,e.target.value)} />
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
                <label className="flex items-center text-gray-900">
                  <input
                    type="checkbox"
                    checked={eventForm.registration_open}
                    onChange={(e) => setEventForm(prev => ({ ...prev, registration_open: e.target.checked }))}
                    className="mr-2"
                  />
                  Registration Open
                </label>
                <label className="flex items-center text-gray-900">
                  <input
                    type="checkbox"
                    checked={!!eventForm.registration_timer_enabled}
                    onChange={(e) => setEventForm(prev => ({ ...prev, registration_timer_enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  Enable Timer (optional)
                </label>
                <label className="flex items-center text-gray-900">
                  <input
                    type="checkbox"
                    checked={!!(eventForm as any).registration_photo_required}
                    onChange={(e) => setEventForm(prev => ({ ...prev, registration_photo_required: e.target.checked } as any))}
                    className="mr-2"
                  />
                  Require Photo During Registration
                </label>
                <label className="flex items-center text-gray-900">
                  <input
                    type="checkbox"
                    checked={eventForm.featured}
                    onChange={(e) => setEventForm(prev => ({ ...prev, featured: e.target.checked }))}
                    className="mr-2"
                  />
                  Featured Event
                </label>
                <label className="flex items-center text-gray-900">
                  <input
                    type="checkbox"
                    checked={eventForm.visible}
                    onChange={(e) => setEventForm(prev => ({ ...prev, visible: e.target.checked }))}
                    className="mr-2"
                  />
                  Visible to Public
                </label>
                <div
                  className="flex items-center gap-4 overflow-x-auto whitespace-nowrap cyberpunk-scrollbar pr-2"
                  tabIndex={0}
                  aria-label="Default Registration Mode and Max Team Members horizontal scroller"
                >
                  <div className="text-sm font-medium text-gray-700">Default Registration Mode</div>
                  <label className="flex items-center text-sm text-gray-900">
                    <input type="radio" name="registration_default_mode" className="mr-2" value="individual" checked={(eventForm as any).registration_default_mode === 'individual'} onChange={() => setEventForm(prev => ({ ...prev, registration_default_mode: 'individual' } as any))} /> Individual
                  </label>
                  <label className="flex items-center text-sm text-gray-900">
                    <input type="radio" name="registration_default_mode" className="mr-2" value="team" checked={(eventForm as any).registration_default_mode === 'team'} onChange={() => setEventForm(prev => ({ ...prev, registration_default_mode: 'team' } as any))} /> Team
                  </label>
                  <label className="flex items-center text-sm text-gray-900 border-l pl-4 border-gray-300">
                    <input type="checkbox" className="mr-2" checked={(eventForm as any).registration_mode_locked ?? false} onChange={(e) => setEventForm(prev => ({ ...prev, registration_mode_locked: e.target.checked } as any))} /> Lock Mode
                  </label>
                </div>
                <p className="text-xs text-gray-600 mt-1">When locked, users cannot switch between individual and team modes.</p>
                <p className="sm:hidden text-xs text-gray-600 mt-1">Tip: Swipe sideways on the row above to see all controls.</p>
                
                {/* Team Size Configuration */}
                <div className="mt-4 border-t pt-4">
                  <label className="flex items-center text-sm font-medium text-gray-900 mb-2">
                    <input 
                      type="checkbox" 
                      className="mr-2" 
                      checked={!!((eventForm as any).team_required_size)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEventForm(prev => ({ ...prev, team_required_size: 2, team_max_members: undefined } as any));
                        } else {
                          setEventForm(prev => ({ ...prev, team_required_size: undefined } as any));
                        }
                      }}
                    />
                    Require Exact Team Size
                  </label>
                  
                  {(eventForm as any).team_required_size ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Required Team Size</label>
                      <input
                        type="number"
                        min={2}
                        max={50}
                        value={(eventForm as any).team_required_size ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const n = v === '' ? undefined : Math.max(2, Math.min(50, Number(v)));
                          setEventForm(prev => ({ ...prev, team_required_size: Number.isNaN(Number(v)) ? undefined : n } as any));
                        }}
                        placeholder="e.g., 5"
                        className="w-32 sm:w-40 px-3 py-2 border rounded text-gray-900"
                      />
                      <p className="text-xs text-gray-600 mt-1">Teams must have exactly this many members</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Max Team Members (team mode)</label>
                      <input
                        type="number"
                        min={2}
                        max={50}
                        value={(eventForm as any).team_max_members ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const n = v === '' ? undefined : Math.max(2, Math.min(50, Number(v)));
                          setEventForm(prev => ({ ...prev, team_max_members: Number.isNaN(Number(v)) ? undefined : n } as any));
                        }}
                        placeholder="Default 50"
                        className="w-32 sm:w-40 px-3 py-2 border rounded text-gray-900"
                      />
                      <p className="text-xs text-gray-600 mt-1">Maximum allowed team size (flexible 2-max)</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Per-event participant types editor - choose from site-level list and set per-type limits */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Participant Types for this event</label>
                {Array.isArray((siteSettings as any)?.registration_participant_types) && (siteSettings as any).registration_participant_types.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-1">
                      Check to enable a type for this event. Leave the limit blank for unlimited, or set 0 to close that type.
                    </p>
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        type="button"
                        className="text-xs px-2 py-1 border rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => {
                          const list = (siteSettings as any).registration_participant_types as string[];
                          setEventForm(prev => ({ ...prev, registration_participant_types: [...list] } as any));
                        }}
                      >Select all</button>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 border rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => setEventForm(prev => ({ ...prev, registration_participant_types: [] as string[], registration_participant_quotas: {} as any } as any))}
                      >Clear all</button>
                    </div>
                    {((siteSettings as any).registration_participant_types as string[]).map((t: string) => {
                      // Detect placeholder options (like 'select batch') but show them disabled
                      const isPlaceholder = t.toLowerCase().includes('select') || t.trim().startsWith('.');
                      const selected = (eventForm.registration_participant_types || []).includes(t);
                      const limitVal = ((eventForm as any).registration_participant_quotas?.[t] ?? '') as any;
                      return (
                        <div key={t} className={`flex items-center justify-between p-2 border rounded ${isPlaceholder ? 'bg-gray-50 opacity-60' : ''}`}>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={isPlaceholder}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEventForm(prev => {
                                    const cur = new Set(prev.registration_participant_types || []);
                                    const quotas = { ...(((prev as any).registration_participant_quotas || {}) as Record<string, number>) };
                                    if (checked) cur.add(t); else { cur.delete(t); if (quotas[t] !== undefined) delete quotas[t]; }
                                    return { ...prev, registration_participant_types: Array.from(cur), registration_participant_quotas: quotas } as any;
                                  });
                                }}
                                className={isPlaceholder ? 'cursor-not-allowed' : ''}
                              />
                              <span className={`text-sm min-w-[120px] ${isPlaceholder ? 'text-gray-400 italic' : 'text-gray-900'}`}>{t}</span>
                            </label>
                            <label className="text-xs text-gray-600">Limit</label>
                            <input
                              type="number"
                              min={0}
                              className={`w-28 border rounded px-2 py-1 ${!selected || isPlaceholder ? 'bg-gray-100 text-gray-500 placeholder:text-gray-500' : 'text-gray-900'}`}
                              placeholder={selected ? 'Unlimited' : 'Unavailable'}
                              title={isPlaceholder ? 'Placeholder option - cannot be selected' : 'Check to enable this type. Leave blank for unlimited. Set 0 to close.'}
                              value={limitVal}
                              disabled={!selected || isPlaceholder}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setEventForm(prev => {
                                  const base = ((prev as any).registration_participant_quotas || {}) as Record<string, number>;
                                  const quotas = { ...base };
                                  if (raw === '') delete quotas[t]; else quotas[t] = Math.max(0, parseInt(raw || '0')) || 0;
                                  return { ...prev, registration_participant_quotas: quotas } as any;
                                });
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {(() => {
                      const siteList = (siteSettings as any).registration_participant_types as string[];
                      const unknown = (eventForm.registration_participant_types || []).filter((t: string) => !siteList.includes(t));
                      if (!unknown.length) return null;
                      return (
                        <div className="mt-2 p-2 border border-amber-200 bg-amber-50 rounded text-xs text-amber-800">
                          Some types are selected on this event but not present in site settings: {unknown.join(', ')}.
                          <button
                            type="button"
                            className="ml-2 underline"
                            onClick={() => setEventForm(prev => {
                              const siteSet = new Set((siteSettings as any).registration_participant_types as string[]);
                              const list = (prev.registration_participant_types || []).filter((t: string) => siteSet.has(t));
                              const quotas = { ...(((prev as any).registration_participant_quotas || {}) as Record<string, number>) };
                              Object.keys(quotas).forEach(k => { if (!siteSet.has(k)) delete quotas[k]; });
                              return { ...prev, registration_participant_types: list, registration_participant_quotas: quotas } as any;
                            })}
                          >Remove unknown</button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3 border rounded bg-gray-50 text-sm text-gray-600">
                    No participant types found. Define them in Admin → Registration Modal settings first.
                  </div>
                )}
              </div>
              {/* Note about quotas */}
              <div className="mt-3 p-3 border rounded bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-1">Participant Type Limits</label>
                <p className="text-xs text-gray-500">Set per-event maximums for each selected type. 0 = closed, blank = unlimited (falls back to site quota if set).</p>
              </div>
              {/* Registration Photo Label (optional) */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Photo Label (optional)</label>
                <input
                  type="text"
                  value={(eventForm as any).registration_photo_label || ''}
                  onChange={(e) => setEventForm(prev => ({ ...prev, registration_photo_label: e.target.value } as any))}
                  placeholder="e.g., Participant Photo, College ID Photo, etc."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Shown to users on the registration form. Leave blank to use default.</p>
              </div>
              {eventForm.registration_timer_enabled && (
                <>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Opens At (optional)</label>
                    <input
                      type="datetime-local"
                      value={eventForm.registration_opens_at || ''}
                      onChange={(e) => setEventForm(prev => ({ ...prev, registration_opens_at: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">Users will see countdown until this time. After it passes, event can show "Live Now" if registration is open.</p>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Closes At (optional)</label>
                    <input
                      type="datetime-local"
                      value={eventForm.registration_closes_at || ''}
                      onChange={(e) => setEventForm(prev => ({ ...prev, registration_closes_at: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">Registration will automatically close at this time. Users attempting to register after this will see "Registration Closed".</p>
                  </div>
                </>
              )}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Watch Live URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={eventForm.watch_live_url || ''}
                  onChange={(e) => setEventForm(prev => ({ ...prev, watch_live_url: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Shown 60 min before start (disabled until live) and during the event.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Image</label>
                <ImageUpload
                  onImageSelect={(url) => setEventForm(prev => ({ ...prev, image: url }))}
                  currentImage={eventForm.image}
                  bucket="event-images"
                  folder="events"
                    cropAspect={5/6}
                    enableCropper={true}
                    maxImageBytes={20 * 1024 * 1024}
                    fileTypeLabel={`PNG or JPG up to 20MB. Aspect ratio 5:6 (49x59.4cm)`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motion Poster (Video)</label>
                <VideoUpload
                  onVideoSelect={(url) => setEventForm(prev => ({ ...prev, motion_poster_url: url }))}
                  currentVideo={eventForm.motion_poster_url || ''}
                  bucket="event-images"
                  folder="events/motion-posters"
                  maxSizeMB={50}
                />
              </div>
              <div className="mt-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={(eventForm as any).motion_poster_autoplay || false}
                    onChange={(e) => setEventForm(prev => ({ ...prev, motion_poster_autoplay: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-900">Auto-play motion poster on event card</span>
                </label>
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
              disabled={savingAdd}
              className={`w-full sm:w-auto px-6 py-2 ${savingAdd ? 'bg-gray-400 text-white' : 'bg-yellow-400 text-black hover:bg-yellow-300'} rounded-lg flex items-center justify-center`}
            >
              {savingAdd ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Save size={16} className="mr-1" />}
              {savingAdd ? 'Saving…' : 'Add Event'}
            </button>
          </div>
        </div>
      )}

      {/* Reorder Mode Panel - Enhanced */}
      {reorderMode && (
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-lg border-2 border-purple-300 p-4 md:p-6 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-base md:text-lg font-bold text-purple-900 flex items-center">
                <ArrowUp size={18} className="mr-2 text-purple-600" />
                Reorder Events
              </div>
              <div className="text-xs md:text-sm text-purple-700 mt-1">
                <span className="hidden sm:inline">Drag rows or use arrow buttons. </span>
                Top position = shows first on Events page
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {lastEventReorderError && (
                <span className="text-xs text-red-600 mr-2" title={`${lastEventReorderError.phase || ''} ${lastEventReorderError.details || ''}`}>
                  Warning: {lastEventReorderError.message}
                </span>
              )}
              <button 
                onClick={closeReorder} 
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={persistReorder} 
                disabled={savingOrder} 
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  savingOrder 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                }`}
              >
                {savingOrder ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving…
                  </span>
                ) : '✓ Save Order'}
              </button>
            </div>
          </div>
          
          {!!reorderMessage && (
            <div className="mb-3 px-3 py-2 bg-green-100 border border-green-300 text-sm text-green-800 rounded-lg">
              ✓ {reorderMessage}
            </div>
          )}
          
          <div className="divide-y divide-purple-200 rounded-lg border-2 border-purple-200 bg-white shadow-sm overflow-hidden">
            {orderList.map((id, idx) => {
              const ev = events.find((e: any) => e.id === id);
              if (!ev) return null;
              const isDragging = dragIndex === idx;
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => onDragStartRow(idx)}
                  onDragOver={(e) => onDragOverRow(e, idx)}
                  className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 md:py-3 bg-white transition-all cursor-move touch-none select-none ${
                    isDragging 
                      ? 'opacity-50 scale-105 bg-purple-100 ring-2 ring-purple-400 shadow-lg z-10' 
                      : 'hover:bg-purple-50 hover:shadow-md'
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="text-gray-400 hover:text-purple-600 transition-colors cursor-grab active:cursor-grabbing">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="5" cy="4" r="1.5"/>
                      <circle cx="11" cy="4" r="1.5"/>
                      <circle cx="5" cy="8" r="1.5"/>
                      <circle cx="11" cy="8" r="1.5"/>
                      <circle cx="5" cy="12" r="1.5"/>
                      <circle cx="11" cy="12" r="1.5"/>
                    </svg>
                  </div>

                  {/* Position Number */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold border border-purple-300">
                    {idx + 1}
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm md:text-base font-semibold text-gray-900 truncate">{ev.title}</div>
                    <div className="text-xs md:text-sm text-gray-600 truncate">{ev.category || 'Uncategorized'}</div>
                  </div>

                  {/* Arrow Buttons */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => moveRow(idx, -1)} 
                      disabled={idx === 0} 
                      className={`p-2 rounded-lg transition-all ${
                        idx === 0
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-purple-600 hover:bg-purple-100 hover:text-purple-800 active:scale-95'
                      }`} 
                      title="Move up"
                    >
                      <ArrowUp size={18} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={() => moveRow(idx, 1)} 
                      disabled={idx === orderList.length - 1} 
                      className={`p-2 rounded-lg transition-all ${
                        idx === orderList.length - 1
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-purple-600 hover:bg-purple-100 hover:text-purple-800 active:scale-95'
                      }`} 
                      title="Move down"
                    >
                      <ArrowDown size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Helpful Tip */}
          <div className="mt-3 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg p-2 md:p-3">
            <strong>💡 Tip:</strong> On desktop, drag rows to reorder. On mobile, use the arrow buttons for easier control.
          </div>
        </div>
      )}
      {/* Events List - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {events.map((event: any) => (
          <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {editingEvent === event.id ? (
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <select
                  value={eventForm.category}
                  onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
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
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="text"
                    value={eventForm.participants || ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, participants: e.target.value }))}
                    placeholder="Participants (e.g., 100+ students)"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                  <input
                    type="number"
                    min={0}
                    value={typeof eventForm.max_participants === 'number' ? String(eventForm.max_participants) : ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, max_participants: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="Max participants (optional)"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="Time"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
                <input
                  type="text"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Venue"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="text"
                    value={eventForm.participants || ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, participants: e.target.value }))}
                    placeholder="Participants (optional)"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                  <input
                    type="number"
                    min={0}
                    value={typeof eventForm.max_participants === 'number' ? String(eventForm.max_participants) : ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, max_participants: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="Max participants (optional)"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
                {/* Per-event participant types editor (edit mode) - select from site-level list with per-type limits */}
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Participant Types for this event</label>
                  {Array.isArray((siteSettings as any)?.registration_participant_types) && (siteSettings as any).registration_participant_types.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          type="button"
                          className="text-xs px-2 py-1 border rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                          onClick={() => {
                            const list = (siteSettings as any).registration_participant_types as string[];
                            setEventForm(prev => ({ ...prev, registration_participant_types: [...list] } as any));
                          }}
                        >Select all</button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 border rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                          onClick={() => setEventForm(prev => ({ ...prev, registration_participant_types: [] as string[], registration_participant_quotas: {} as any } as any))}
                        >Clear all</button>
                      </div>
                      {((siteSettings as any).registration_participant_types as string[]).map((t: string) => {
                        // Detect placeholder options (like 'select batch') but show them disabled
                        const isPlaceholder = t.toLowerCase().includes('select') || t.trim().startsWith('.');
                        const selected = (eventForm.registration_participant_types || []).includes(t);
                        const limitVal = ((eventForm as any).registration_participant_quotas?.[t] ?? '') as any;
                        return (
                          <div key={t} className={`flex items-center justify-between p-2 border rounded ${isPlaceholder ? 'bg-gray-50 opacity-60' : ''}`}>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={isPlaceholder}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setEventForm(prev => {
                                      const cur = new Set(prev.registration_participant_types || []);
                                      const quotas = { ...(((prev as any).registration_participant_quotas || {}) as Record<string, number>) };
                                      if (checked) cur.add(t); else { cur.delete(t); if (quotas[t] !== undefined) delete quotas[t]; }
                                      return { ...prev, registration_participant_types: Array.from(cur), registration_participant_quotas: quotas } as any;
                                    });
                                  }}
                                  className={isPlaceholder ? 'cursor-not-allowed' : ''}
                                />
                                <span className={`text-sm min-w-[120px] ${isPlaceholder ? 'text-gray-400 italic' : 'text-gray-900'}`}>{t}</span>
                              </label>
                              <label className="text-xs text-gray-600">Limit</label>
                              <input
                                type="number"
                                min={0}
                                className={`w-28 border rounded px-2 py-1 ${!selected || isPlaceholder ? 'bg-gray-100 text-gray-400' : 'text-gray-900'}`}
                                placeholder="Unlimited"
                                title={isPlaceholder ? 'Placeholder option - cannot be selected' : 'Set per-event limit (0 = closed, blank = unlimited)'}
                                value={limitVal}
                                disabled={!selected || isPlaceholder}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setEventForm(prev => {
                                    const base = ((prev as any).registration_participant_quotas || {}) as Record<string, number>;
                                    const quotas = { ...base };
                                    if (raw === '') delete quotas[t]; else quotas[t] = Math.max(0, parseInt(raw || '0')) || 0;
                                    return { ...prev, registration_participant_quotas: quotas } as any;
                                  });
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {(() => {
                        const siteList = (siteSettings as any).registration_participant_types as string[];
                        const unknown = (eventForm.registration_participant_types || []).filter((t: string) => !siteList.includes(t));
                        if (!unknown.length) return null;
                        return (
                          <div className="mt-2 p-2 border border-amber-200 bg-amber-50 rounded text-xs text-amber-800">
                            Some types are selected on this event but not present in site settings: {unknown.join(', ')}.
                            <button
                              type="button"
                              className="ml-2 underline"
                              onClick={() => setEventForm(prev => {
                                const siteSet = new Set((siteSettings as any).registration_participant_types as string[]);
                                const list = (prev.registration_participant_types || []).filter((t: string) => siteSet.has(t));
                                const quotas = { ...(((prev as any).registration_participant_quotas || {}) as Record<string, number>) };
                                Object.keys(quotas).forEach(k => { if (!siteSet.has(k)) delete quotas[k]; });
                                return { ...prev, registration_participant_types: list, registration_participant_quotas: quotas } as any;
                              })}
                            >Remove unknown</button>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-3 border rounded bg-gray-50 text-sm text-gray-600">
                      No participant types found. Define them in Admin → Registration Modal settings first.
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Venue"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                {/* Watch Live URL (edit mode) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 mt-1">Watch Live URL (optional)</label>
                  <input
                    type="url"
                    value={eventForm.watch_live_url || ''}
                    onChange={(e) => setEventForm(prev => ({ ...prev, watch_live_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
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
                          <input type="text" value={rule} onChange={(e) => updateRule(index, e.target.value)} placeholder="Event rule" className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400 text-gray-900" />
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
                          <input className="w-full p-1.5 text-xs border border-gray-300 rounded mb-1 text-gray-900 bg-white focus:ring-1 focus:ring-yellow-400 focus:outline-none" placeholder="Heading (optional)" value={sec.heading || ''} onChange={(e)=>updateSectionField(idx,'heading',e.target.value)} />
                          <div className="space-y-2">
                            {(sec.blocks || []).map((b, bIdx) => (
                              <div key={bIdx} className="border border-dashed border-gray-300 rounded p-2 bg-white">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-[11px] font-semibold text-gray-700">Points block {bIdx+1}</div>
                                  <div className="flex items-center gap-2">
                                    <select className="text-[11px] border border-gray-300 rounded p-1 bg-white text-gray-900 focus:ring-1 focus:ring-yellow-400 focus:outline-none" value={b.style || 'number'} onChange={(e)=>updateBlockField(idx,bIdx,{ style: (e.target.value as 'bullet'|'number') })}>
                                      <option value="number">Numbered</option>
                                      <option value="bullet">Bullets</option>
                                    </select>
                                    <button type="button" onClick={()=>removeBlock(idx,bIdx)} className="text-red-600 text-[11px] hover:text-red-800">Remove</button>
                                  </div>
                                </div>
                                <input className="w-full p-1.5 text-xs border border-gray-300 rounded mb-1 text-gray-900 bg-white focus:ring-1 focus:ring-yellow-400 focus:outline-none" placeholder="Block title (optional)" value={b.title || ''} onChange={(e)=>updateBlockField(idx,bIdx,{ title: e.target.value })} />
                                <div className="space-y-1">
                                  {(b.items || []).map((p, pIdx) => (
                                    <div key={pIdx} className="flex items-center gap-2">
                                      <input className="flex-1 p-1.5 text-xs border border-gray-300 rounded text-gray-900 bg-white focus:ring-1 focus:ring-yellow-400 focus:outline-none" placeholder={`Point ${pIdx+1}`} value={p} onChange={(e)=>updateItem(idx,bIdx,pIdx,e.target.value)} />
                                      <button type="button" onClick={()=>removeItem(idx,bIdx,pIdx)} className="text-red-600 hover:text-red-800"><X size={11} /></button>
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
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rules PDF / Drive link (optional)</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/... or https://...pdf"
                      value={eventForm.rules_link || ''}
                      onChange={(e) => setEventForm(prev => ({ ...prev, rules_link: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">Add a link to a PDF or Google Drive file for full rules. This will show a View/Share control on the public event card.</p>
                  </div>
                </div>

                <ImageUpload
                  onImageSelect={(url) => setEventForm(prev => ({ ...prev, image: url }))}
                  currentImage={eventForm.image}
                  bucket="event-images"
                  folder="events"
                  className="mb-4"
                  cropAspect={16/9}
                  maxImageBytes={20 * 1024 * 1024}
                  fileTypeLabel={`PNG or JPG up to 20MB. ${posterGuideline}`}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motion Poster (Video)</label>
                  <VideoUpload
                    onVideoSelect={(url) => setEventForm(prev => ({ ...prev, motion_poster_url: url }))}
                    currentVideo={eventForm.motion_poster_url || ''}
                    bucket="event-images"
                    folder="events/motion-posters"
                    maxSizeMB={50}
                  />
                  <div className="mt-2">
                    <label className="flex items-center text-sm text-gray-900">
                      <input
                        type="checkbox"
                        checked={(eventForm as any).prefer_video || false}
                        onChange={(e) => setEventForm(prev => ({ ...prev, prefer_video: e.target.checked }))}
                        className="mr-2"
                      />
                      Prefer video over image on the event card
                    </label>
                    <div className="mt-2">
                      <label className="flex items-center text-sm text-gray-900">
                        <input
                          type="checkbox"
                          checked={(eventForm as any).motion_poster_autoplay || false}
                          onChange={(e) => setEventForm(prev => ({ ...prev, motion_poster_autoplay: e.target.checked }))}
                          className="mr-2"
                        />
                        Auto-play motion poster on card
                      </label>
                    </div>
                  </div>
                </div>
                {/* Timer settings (edit) */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center text-gray-900">
                    <input
                      type="checkbox"
                      checked={!!eventForm.registration_timer_enabled}
                      onChange={(e) => setEventForm(prev => ({ ...prev, registration_timer_enabled: e.target.checked }))}
                      className="mr-2"
                    />
                    Enable Timer (optional)
                  </label>
                  <label className="flex items-center text-gray-900">
                    <input
                      type="checkbox"
                      checked={!!(eventForm as any).registration_photo_required}
                      onChange={(e) => setEventForm(prev => ({ ...prev, registration_photo_required: e.target.checked } as any))}
                      className="mr-2"
                    />
                    Require Photo During Registration
                  </label>
                  {eventForm.registration_timer_enabled && (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registration Opens At</label>
                      <input
                        type="datetime-local"
                        value={eventForm.registration_opens_at || ''}
                        onChange={(e) => setEventForm(prev => ({ ...prev, registration_opens_at: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 mb-3"
                      />
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registration Closes At</label>
                      <input
                        type="datetime-local"
                        value={eventForm.registration_closes_at || ''}
                        onChange={(e) => setEventForm(prev => ({ ...prev, registration_closes_at: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </>
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
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200 mt-2">
                  <div
                    className="flex items-center gap-4 mr-auto overflow-x-auto whitespace-nowrap cyberpunk-scrollbar pr-2"
                    tabIndex={0}
                    aria-label="Default Registration Mode and Max Team Members horizontal scroller"
                  >
                    <div className="text-sm font-medium text-gray-700">Default Registration Mode</div>
                    <label className="flex items-center text-sm text-gray-900">
                      <input type="radio" name={`registration_default_mode_row_${event.id}`} className="mr-2" value="individual" checked={(eventForm as any).registration_default_mode === 'individual'} onChange={() => setEventForm(prev => ({ ...prev, registration_default_mode: 'individual' } as any))} /> Individual
                    </label>
                    <label className="flex items-center text-sm text-gray-900">
                      <input type="radio" name={`registration_default_mode_row_${event.id}`} className="mr-2" value="team" checked={(eventForm as any).registration_default_mode === 'team'} onChange={() => setEventForm(prev => ({ ...prev, registration_default_mode: 'team' } as any))} /> Team
                    </label>
                    <label className="flex items-center text-sm text-gray-900 border-l pl-2 border-gray-300">
                      <input type="checkbox" className="mr-2" checked={(eventForm as any).registration_mode_locked ?? false} onChange={(e) => setEventForm(prev => ({ ...prev, registration_mode_locked: e.target.checked } as any))} /> Lock
                    </label>
                    
                    {/* Team Size Controls */}
                    <div className="ml-4 flex items-center gap-2 min-w-[320px]">
                      <label className="flex items-center text-sm text-gray-900">
                        <input 
                          type="checkbox" 
                          className="mr-2" 
                          checked={!!((eventForm as any).team_required_size)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEventForm(prev => ({ ...prev, team_required_size: 2, team_max_members: undefined } as any));
                            } else {
                              setEventForm(prev => ({ ...prev, team_required_size: undefined } as any));
                            }
                          }}
                        />
                        Exact Size
                      </label>
                      {(eventForm as any).team_required_size ? (
                        <input
                          type="number"
                          min={2}
                          max={50}
                          value={(eventForm as any).team_required_size ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            const n = v === '' ? undefined : Math.max(2, Math.min(50, Number(v)));
                            setEventForm(prev => ({ ...prev, team_required_size: Number.isNaN(Number(v)) ? undefined : n } as any));
                          }}
                          placeholder="e.g., 5"
                          className="w-20 px-2 py-1 border rounded text-gray-900"
                          title="Required team size"
                        />
                      ) : (
                        <>
                          <label className="text-sm text-gray-700">Max:</label>
                          <input
                            type="number"
                            min={2}
                            max={50}
                            value={(eventForm as any).team_max_members ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              const n = v === '' ? undefined : Math.max(2, Math.min(50, Number(v)));
                              setEventForm(prev => ({ ...prev, team_max_members: Number.isNaN(Number(v)) ? undefined : n } as any));
                            }}
                            placeholder="50"
                            className="w-20 px-2 py-1 border rounded text-gray-900"
                          />
                        </>
                      )}
                    </div>
                    
                  </div>
                  <p className="text-xs text-amber-600 font-medium mt-1 bg-amber-50 px-2 py-1 rounded">← Scroll sideways in the row above to see Team Size settings →</p>
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
                    disabled={savingUpdate}
                    className={`w-full sm:w-auto px-4 py-2 ${savingUpdate ? 'bg-gray-400 text-white' : 'bg-yellow-400 text-black hover:bg-yellow-300'} rounded flex items-center justify-center`}
                  >
                    {savingUpdate ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                    {savingUpdate ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {/* Coordinators management */}
                <div className="mt-4 border-t pt-3">
                  <div className="text-sm font-semibold mb-2 text-gray-900">Coordinators</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {coordinatorsFor(event.id).map((c, idx, list) => (
                      <div key={c.id} className="grid grid-cols-12 gap-2 items-center">
                        <input className="col-span-5 p-1 text-sm border rounded text-gray-900" value={c.name} onChange={(e)=>updateCoordinatorField(c.id,'name',e.target.value)} />
                        <input className="col-span-5 p-1 text-sm border rounded text-gray-900" value={c.phone || ''} onChange={(e)=>updateCoordinatorField(c.id,'phone',e.target.value)} />
                        <div className="col-span-2 flex items-center gap-1">
                          <button type="button" onClick={()=>moveCoordinator(event.id, c.id, -1)} disabled={idx===0} className={`p-1 ${idx===0? 'text-gray-300':'text-gray-600 hover:text-gray-800'}`} title="Move up"><ArrowUp size={12} /></button>
                          <button type="button" onClick={()=>moveCoordinator(event.id, c.id, 1)} disabled={idx===list.length-1} className={`p-1 ${idx===list.length-1? 'text-gray-300':'text-gray-600 hover:text-gray-800'}`} title="Move down"><ArrowDown size={12} /></button>
                          <button type="button" onClick={()=>removeCoordinator(c.id)} className="p-1 text-red-600" title="Delete"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-12 gap-2 mt-2">
                    <input className="col-span-5 p-1 text-sm border rounded text-gray-900" value={newCoordinator.name} onChange={(e)=>setNewCoordinator(prev=>({...prev,name:e.target.value}))} placeholder="Name" />
                    <input className="col-span-5 p-1 text-sm border rounded text-gray-900" value={newCoordinator.phone} onChange={(e)=>setNewCoordinator(prev=>({...prev,phone:e.target.value}))} placeholder="Phone" />
                    <button type="button" onClick={()=>addCoordinator(event.id)} className="col-span-2 bg-green-600 text-white rounded text-xs px-2">Add</button>
                  </div>

                  {/* Winners management (show once per event) */}
                  <div className="mt-4 border-t pt-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                      <div className="text-sm font-semibold text-gray-900">Winners</div>
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
                    {/* Registration mode badge */}
                    <div className="bg-gray-900/70 text-xs text-white px-2 py-1 rounded mr-1 flex items-center" title={`Default registration mode: ${(event as any).registration_default_mode || 'individual'}`}>
                      {(event as any).registration_default_mode === 'team' ? 'Mode: Team' : 'Mode: Individual'}
                    </div>
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
                    <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
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
                        onClick={() => handleManualNotify(event)}
                        className="bg-purple-600 text-white p-1 rounded hover:bg-purple-500 transition-colors"
                        title="Send Notification"
                      >
                        <Bell size={14} />
                      </button>
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

      {/* Manual Notification Modal */}
      {manualNotifyEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-900">Send Notification</h3>
                        <p className="text-xs text-gray-500">{manualNotifyEvent.title}</p>
                    </div>
                    <button onClick={() => setManualNotifyEvent(null)} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 overflow-y-auto space-y-4">
                    {/* Step 1: Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => { setManualNotifyType('rules'); setManualNotifyMessage('Please check the website for updated rules.'); }}
                                className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${manualNotifyType === 'rules' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                <FileText size={16} className="inline mr-2" />
                                Rules Update
                            </button>
                            <button 
                                onClick={() => { setManualNotifyType('schedule'); setManualNotifyMessage('Please note the latest details.'); }}
                                className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${manualNotifyType === 'schedule' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                <Calendar size={16} className="inline mr-2" />
                                Schedule/Venue
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message</label>
                        <textarea
                            value={manualNotifyMessage}
                            onChange={e => setManualNotifyMessage(e.target.value)}
                            className="w-full p-2 border rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Add a note for participants..."
                        />
                    </div>

                    {/* Step 3: Rule Selection (Only for Rules type) */}
                    {manualNotifyType === 'rules' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Select Changed Rules (Highlights)</label>
                            <div className="text-xs text-gray-500 mb-2 bg-blue-50 p-2 rounded">
                                Check the rules that are <strong>NEW</strong> or <strong>CHANGED</strong>. These will be highlighted in yellow in the email.
                            </div>
                            <div className="border rounded max-h-48 overflow-y-auto bg-gray-50 divide-y">
                                {manualNotifyEvent.rules && manualNotifyEvent.rules.length > 0 ? (
                                    manualNotifyEvent.rules.map((rule: string, idx: number) => {
                                        // If it's structured, show simplified preview
                                        const isStruct = rule.startsWith('__SR__');
                                        const display = isStruct ? '(Structured Rule Section) ' + rule.substring(0, 50) : rule;
                                        
                                        return (
                                            <label key={idx} className="flex items-start gap-3 p-2 hover:bg-white cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={manualNotifyHighlights.has(rule)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setManualNotifyHighlights(prev => {
                                                            const next = new Set(prev);
                                                            if (checked) next.add(rule); else next.delete(rule);
                                                            return next;
                                                        });
                                                    }}
                                                    className="mt-1"
                                                />
                                                <span className="text-sm text-gray-700 leading-snug" dangerouslySetInnerHTML={{ __html: display }} />
                                            </label>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 text-center text-gray-500 text-sm italic">No rules found for this event.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={() => setManualNotifyEvent(null)}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={sendManualNotification}
                        disabled={sendingManualNotify}
                        className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-500 disabled:opacity-50 flex items-center"
                    >
                        {sendingManualNotify ? <Loader2 size={16} className="animate-spin mr-2" /> : <Bell size={16} className="mr-2" />}
                        {sendingManualNotify ? 'Sending...' : 'Send Notification'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};