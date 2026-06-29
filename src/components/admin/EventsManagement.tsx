import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Save, X, Calendar, Clock, MapPin, Users, Eye, EyeOff, Star, UserPlus, UserMinus, FileText, ArrowUp, ArrowDown, Loader2, Bell, Upload, FileImage, ArrowLeft, ArrowRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { EventCoordinator } from '../../types/data';
import { ImageUpload } from '../ImageUpload';
import { VideoUpload } from '../VideoUpload';
import { supabase } from '../../lib/supabase';
import EventWinnersEditor from './EventWinnersEditor';
import type { Event } from '../../types/data';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { deleteFromStorageByPublicUrl } from '../../utils/uploadUtils';
import { InlineDescriptionAI } from './InlineDescriptionAI';
import { AIEventScanner } from './events/AIEventScanner';

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
  const { user } = useAuth();
  const { 
    events, 
    eventCategories,
    updateEvent, 
    deleteEvent,
    toggleEventFeatured,
    toggleEventVisibility,
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
    adminUsers,
    sanitizeUrl,
    addNotification,
  } = (useData() || {}) as any;
  
  // Determine if current user is the OWNER
  const isOwner = useMemo(() => {
    try {
      const uid = user?.id;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.is_primary));
    } catch {
      return false;
    }
  }, [user, adminUsers]);
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
  const [showEventScanner, setShowEventScanner] = useState(false);

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
  const [formStep, setFormStep] = useState(1);
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


  const [eventForm, setEventForm] = useLocalStorage('admin_events_form_draft', {
    title: '',
    category: '',
    description: '',
    image: '',
    motion_poster_url: '' as string | null,
    coordinator_name: '' as string | null,
    coordinator_phone: '' as string | null,
    coordinator_password: '123@Rajaevent' as string | null,
    whatsapp_group_link: '' as string | null,
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
  team_min_members: undefined as number | undefined,
    team_required_size: undefined as number | undefined,
    max_participants: undefined as number | undefined,
    featured: false,
    visible: true,
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
      coordinator_password: '123@Rajaevent',
      whatsapp_group_link: '',
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
      team_min_members: undefined,
      team_required_size: undefined,
      max_participants: undefined,
      featured: false,
      visible: true,
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
        return true;
      }
      return rules.every(r => typeof r === 'string');
    } catch {
      return false;
    }
  };

  const VALID_EVENT_COLUMNS = [
    'title', 'category', 'description', 'image', 'date', 'time', 'venue',
    'participants', 'highlights', 'registration_open', 'max_participants',
    'current_registrations', 'featured', 'visible', 'rules',
    'display_order',
    // Motion poster fields
    'motion_poster_url', 'motion_poster_autoplay', 'owner_hover_reveal',
    // Registration fields
    'registration_timer_enabled', 'registration_opens_at', 'registration_closes_at',
    'registration_photo_required', 'registration_photo_label',
    'registration_participant_types', 'registration_participant_quotas',
    'registration_default_mode', 'registration_mode_locked',
    // Team fields
    'team_max_members', 'team_min_members', 'team_required_size',
    // Other fields
    'rules_link', 'watch_live_url', 'whatsapp_group_link',
    'artist_id'
  ];

  const sanitizeEventPayload = (payload: any) => {
    const clean: any = {};
    for (const key of VALID_EVENT_COLUMNS) {
      if (payload[key] !== undefined) {
        clean[key] = payload[key];
      }
    }
    return clean;
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

      const { coordinator_name, coordinator_phone, coordinator_password, ...restEventForm } = eventForm;

      const eventData = {
        ...restEventForm,
        // Fallback to empty string for date/time/venue since remote DB still requires NOT NULL
        date: eventForm.date?.trim() || '',
        time: eventForm.time?.trim() || '',
        venue: eventForm.venue?.trim() || '',
        rules_link: eventForm.rules_link || null,
        rules: finalRules,
        category: eventForm.category || (eventCategories.length > 0 ? eventCategories[0].name : 'General'),
        registration_timer_enabled: !!eventForm.registration_timer_enabled,
        registration_opens_at: eventForm.registration_opens_at ? new Date(eventForm.registration_opens_at).toISOString() : null,
        registration_closes_at: eventForm.registration_closes_at ? new Date(eventForm.registration_closes_at).toISOString() : null,
        registration_photo_required: !!(eventForm as any).registration_photo_required,
        registration_photo_label: (eventForm as any).registration_photo_label || null,
        current_registrations: 0,
        registration_participant_types: eventForm.registration_participant_types?.filter(t => t && !t.toLowerCase().includes('select') && !t.trim().startsWith('.')) || undefined,
        registration_participant_quotas: (eventForm as any).registration_participant_quotas && Object.keys((eventForm as any).registration_participant_quotas).length ? (eventForm as any).registration_participant_quotas : null,
        registration_default_mode: (eventForm as any).registration_default_mode || 'individual',
        registration_mode_locked: (eventForm as any).registration_mode_locked ?? false,
        team_max_members: (eventForm as any).team_max_members ?? null,
        team_min_members: (eventForm as any).team_min_members ?? null,
        team_required_size: (eventForm as any).team_required_size ?? null,
        max_participants: (eventForm as any).max_participants ?? null,
        coordinators: draftCoordinators // Include coordinators in the data
      };
      
      // Check if current admin requires approval
      const needsApproval = await checkRequiresApproval();
      
      if (needsApproval) {
        // Submit for owner approval
        const safeDataForApproval = sanitizeEventPayload(eventData);
        const result = await submitForApproval('event', 'create', safeDataForApproval);
        if (result.success) {
          alert('✓ Event submitted for owner approval!\n\nYour event will be published once the owner reviews and approves it.');
          setIsAddingEvent(false);
          resetEventForm();
          setDraftCoordinators([]);
          setFormStep(1);
          try { localStorage.removeItem('admin_events_form_draft'); } catch {}
        } else {
          throw new Error(result.error || 'Failed to submit for approval');
        }
      } else {
        // Direct save (no approval required)
        const safeData = sanitizeEventPayload(eventData);
        await addEventWithCoordinators(safeData, draftCoordinators);
        alert('✓ Event added successfully!');
        setIsAddingEvent(false);
        resetEventForm();
        setDraftCoordinators([]);
        setFormStep(1);
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

      const { coordinator_name, coordinator_phone, coordinator_password, ...restEventForm } = eventForm;

      const eventData = {
        ...restEventForm,
        // Fallback to empty string for date/time/venue since remote DB still requires NOT NULL
        date: eventForm.date?.trim() || '',
        time: eventForm.time?.trim() || '',
        venue: eventForm.venue?.trim() || '',
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
        registration_participant_types: (eventForm as any).registration_participant_types?.filter((t: string) => t && !t.toLowerCase().includes('select') && !t.trim().startsWith('.')) || null,
        registration_participant_quotas: (eventForm as any).registration_participant_quotas && Object.keys((eventForm as any).registration_participant_quotas).length ? (eventForm as any).registration_participant_quotas : null,
        registration_default_mode: (eventForm as any).registration_default_mode || 'individual',
        registration_mode_locked: (eventForm as any).registration_mode_locked ?? false,
        team_max_members: (eventForm as any).team_max_members ?? null,
        team_min_members: (eventForm as any).team_min_members ?? null,
        team_required_size: (eventForm as any).team_required_size ?? null,
        max_participants: (eventForm as any).max_participants ?? null,
      };
      
      // Check if current admin requires approval
      const needsApproval = await checkRequiresApproval();
      
      const safeData = sanitizeEventPayload(eventData);

      if (needsApproval) {
        // Submit for owner approval
        const result = await submitForApproval('event', 'update', safeData, id);
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
        // Detect changes before saving to ask for notification later
        const originalEvent = events.find((e: any) => e.id === id);

        // Cleanup abandoned files if assets changed
        if (originalEvent) {
             const checks = [
                 { old: originalEvent.image, new: eventData.image },
                 { old: originalEvent.motion_poster_url, new: eventData.motion_poster_url }
             ];
             for (const check of checks) {
                 if (check.old && check.old !== check.new) {
                     await deleteFromStorageByPublicUrl(check.old);
                 }
             }
        }

        const hasScheduleChanges = originalEvent && (
          (originalEvent.date || '') !== (eventData.date || '') ||
          (originalEvent.time || '') !== (eventData.time || '') ||
          (originalEvent.venue || '') !== (eventData.venue || '')
        );

        // Detect Rule Changes
        const rulesChanged = JSON.stringify(originalEvent?.rules || []) !== JSON.stringify(safeData.rules || []);

        await updateEvent(id, safeData);
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

        // Real-time student dashboard popup notification trigger
        if (hasScheduleChanges) {
          const formatDetails = () => {
            const parts = [];
            if (eventData.date) {
              try {
                parts.push(`Date: ${new Date(eventData.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`);
              } catch (e) {
                parts.push('Date: Yet to be decided');
              }
            } else {
              parts.push('Date: Yet to be decided');
            }
            
            if (eventData.time) {
              parts.push(`Time: ${eventData.time}`);
            } else {
              parts.push('Time: Yet to be decided');
            }

            if (eventData.venue) {
              parts.push(`Venue: ${eventData.venue}`);
            } else {
              parts.push('Venue: Yet to be decided');
            }

            return parts.join(' | ');
          };

          addNotification?.({
            title: `📅 Schedule Updated: ${eventData.title}`,
            message: `The schedule for "${eventData.title}" has been updated. ${formatDetails()}. Please verify the new details.`,
            type: 'urgent',
            visible: true,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 10,
            link_url: '/events',
          }).catch((err: any) => console.error('Failed to create student dashboard notification:', err));
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
        const event = events.find((e: any) => e.id === id);
        if (event) {
            // Cleanup files
            const files = [event.image, event.motion_poster_url];
            for (const url of files) {
                if (url) await deleteFromStorageByPublicUrl(url);
            }
        }
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
      coordinator_password: (event as any).coordinator_password || '',
      whatsapp_group_link: (event as any).whatsapp_group_link || '',
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
  team_min_members: (event as any).team_min_members ?? undefined,
  team_required_size: (event as any).team_required_size ?? undefined,
      max_participants: event.max_participants ?? undefined,
      featured: event.featured || false,
      visible: event.visible !== false,
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

  const base64ToFile = async (base64String: string, fileName: string): Promise<File> => {
    const [header, data] = base64String.includes(',') ? base64String.split(',') : ['', base64String];
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    const binary = atob(data);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
    }
    const blob = new Blob([new Uint8Array(array)], { type: mime });
    return new File([blob], fileName, { type: mime });
  };

  const handleEventScanComplete = async (scannedEvents: any[], images: string[]) => {
    try {
      setShowEventScanner(false);
      const progress = savingProgress.withSteps(scannedEvents.length, 'Saving Events...');
      let skippedCount = 0;

      for (const eventData of scannedEvents) {
        try {
          let imageUrl = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800';
          
          // Handle AI captured image
          const imgBase64 = typeof eventData.image_index === 'number' ? images[eventData.image_index] : null;

          if (imgBase64) {
            try {
              const fileName = `event_${Date.now()}_${eventData.title.replace(/[^a-z0-9]/gi, '_')}.jpg`;
              const file = await base64ToFile(imgBase64, fileName);
              
              const { error: uploadError } = await supabase.storage
                .from('event-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('event-images')
                  .getPublicUrl(fileName);
                imageUrl = publicUrl;
              } else {
                console.error(`[AIImport] Upload error for ${eventData.title}:`, uploadError);
              }
            } catch (imageErr) {
              console.error(`[AIImport] Image processing error for ${eventData.title}:`, imageErr);
            }
          }

          // Fallback image if both current and AI image are missing
          const defaultImage = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80';
          if (!imageUrl || imageUrl.includes('images.unsplash.com') && !eventData.image) {
             imageUrl = imageUrl || defaultImage;
          }

          const payload = {
            ...eventData,
            image: imageUrl,
            date: eventData.date || '',
            time: eventData.time || '',
            venue: eventData.venue || '',
            participants: eventData.participants || 'Open to all',
            highlights: Array.isArray(eventData.highlights) ? eventData.highlights : [],
            rules: Array.isArray(eventData.rules) ? eventData.rules : [],
            registration_open: true,
            visible: true,
            current_registrations: 0,
            featured: false
          };

          const safeData = sanitizeEventPayload(payload);
          console.info(`[AIImport] Final event payload for ${eventData.title}:`, safeData);
          await addEventWithCoordinators(safeData, eventData.coordinators || []);
          progress.next(`Added ${eventData.title}`);
        } catch (err) {
          console.error(`Failed to create event ${eventData.title}:`, err);
          progress.next(`Skipped ${eventData.title}`);
          skippedCount++;
        }
      }

      const successCount = scannedEvents.length - skippedCount;
      if (successCount > 0) {
        push({ message: `Successfully imported ${successCount} events!`, type: 'success' });
      } else {
        push({ message: `Failed to import events. Check console for details.`, type: 'error' });
      }
    } catch (error) {
      console.error('Error saving scanned events:', error);
      push({ message: 'Failed to save scanned events', type: 'error' });
    } finally {
      savingProgress.done();
    }
  };

  const handleNextStep = () => {
    if (formStep === 1) {
      if (!eventForm.title.trim()) {
        push({ message: 'Please enter the Event Title first.', type: 'warning' });
        return;
      }
    }
    setFormStep(prev => Math.min(prev + 1, 4));
  };

  return (
    <div className="space-y-6">
      {/* AI Event Scanner Modal */}
      {showEventScanner && (
        <AIEventScanner 
          onScanComplete={handleEventScanComplete}
          onCancel={() => setShowEventScanner(false)}
        />
      )}
      {/* Backend schema compatibility notice */}
      {events.length > 0 && !('registration_timer_enabled' in (events[0] as any)) && (
        <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3">
          Registration timer fields are not found in the database yet. Please apply the migration and then Reset API cache in Supabase. Until then, timer settings will be ignored on save.
        </div>
      )}
      {/* Header - Improved Responsive */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
            <div className="w-2 h-10 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">Events Management</span>
            <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-400 tracking-widest uppercase ml-2">{siteSettings?.site_version || 'v10.0 PRO'}</div>
          </h2>
          <p className="text-gray-400 mt-2 font-medium flex items-center gap-2">
            <Calendar size={14} className="text-purple-400" />
            Curating the festival's digital epicenter
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {canReorder && events.length > 1 && (
            <button
              onClick={() => (reorderMode ? closeReorder() : openReorder())}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all shadow-lg ${
                reorderMode 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-white/10 shadow-purple-500/25' 
                  : 'bg-[#181824]/60 text-gray-400 border-white/5 hover:text-white hover:border-white/10 backdrop-blur-md'
              }`}
              title="Drag to reorder events (affects public order)"
            >
              {reorderMode ? 'Done Reordering' : 'Reorder Events'}
            </button>
          )}
          <label className="flex items-center text-sm text-gray-400 px-3 py-2 bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-xl cursor-pointer group hover:border-white/10 transition-all">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-white/10 bg-black/20 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 transition-colors" 
              checked={autoOpenEnabled} 
              onChange={(e)=>persistAutoOpen(e.target.checked)} 
            />
            <span className="ml-2 font-bold uppercase tracking-widest text-[10px] group-hover:text-white transition-colors">Auto-open timer</span>
          </label>
          <button
            onClick={() => setShowEventScanner(true)}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-5 py-2.5 rounded-xl hover:from-pink-400 hover:to-purple-400 transition-all flex items-center justify-center font-bold shadow-lg shadow-pink-500/20 hover:-translate-y-0.5"
          >
            <FileImage size={18} className="mr-2" />
            AI Scan
          </button>
          <button
            onClick={() => {
              setIsAddingEvent(true);
              resetEventForm();
            }}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-2.5 rounded-xl hover:from-purple-400 hover:to-indigo-400 transition-all flex items-center justify-center font-bold shadow-lg shadow-purple-500/20 hover:-translate-y-0.5"
          >
            <Plus size={18} className="mr-2" />
            Add Event
          </button>
        </div>
      </div>

      {/* Email Configuration (Email Stamp) - Glassmorphic */}
      <div className="rico-glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50" />
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden relative shadow-inner group-hover:border-indigo-500/30 transition-colors">
            {emailStampUrl ? (
              <img src={emailStampUrl} alt="Email Stamp" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 opacity-30">
                <Upload size={24} className="text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Stamp</span>
              </div>
            )}
            {uploadingEmailStamp && (
              <div className="absolute inset-0 bg-[#181824]/80 backdrop-blur-sm flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2 mb-2">
              <Upload className="text-indigo-400" size={20} />
              Email Stamp
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xl mx-auto sm:mx-0">
              Upload a specific stamp for email notifications (PNG/SVG). This will override the shared PDF stamp in emails.
            </p>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
              <label className={`flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-900/20 active:scale-95 ${uploadingEmailStamp ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={14} />
                UPLOAD STAMP
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
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-all border border-red-500/20"
                >
                  <Trash2 size={14} />
                  REMOVE
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Form - Responsive */}
      {isAddingEvent && (
        <div className="rico-glass-card rounded-[2.5rem] p-8 md:p-10 border-indigo-500/20 animate-in slide-in-from-top-4 duration-500 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full translate-x-1/4 -translate-y-1/4 blur-[100px]"></div>
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                <Plus className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Add New Festival Event</h3>
                <p className="text-sm text-gray-400 mt-1">Configure all parameters for your new event (Step {formStep} of 4)</p>
              </div>
            </div>
          </div>

          {/* Step Progress Tracker */}
          <div className="mb-10 max-w-3xl mx-auto">
            <div className="flex items-center justify-between relative">
              {/* Background connecting line */}
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/5 -translate-y-1/2 z-0" />
              <div className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500 -translate-y-1/2 z-0 transition-all duration-300" style={{ width: `${((formStep - 1) / 3) * 100}%` }} />

              {[
                { step: 1, label: 'Basics' },
                { step: 2, label: 'Schedule' },
                { step: 3, label: 'Rules & Format' },
                { step: 4, label: 'Media & Staff' }
              ].map((s) => {
                const isActive = formStep >= s.step;
                const isCurrent = formStep === s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      if (eventForm.title.trim() || s.step < formStep) {
                        setFormStep(s.step);
                      } else {
                        push({ message: 'Please fill in the Event Title first.', type: 'warning' });
                      }
                    }}
                    className="flex flex-col items-center gap-2 relative z-10 group focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs transition-all duration-300 ${
                      isCurrent 
                        ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-110' 
                        : isActive 
                          ? 'bg-indigo-950 border-indigo-500 text-purple-300' 
                          : 'bg-black border-white/10 text-gray-500 group-hover:border-white/20'
                    }`}>
                      {s.step}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isCurrent ? 'text-purple-400' : isActive ? 'text-gray-300' : 'text-gray-600'}`}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* STEP 1: BASICS */}
            {formStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Event Title *</label>
                    <input
                      type="text"
                      value={eventForm.title}
                      onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Battle of Bands, Hackathon"
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Category</label>
                    <select
                      value={eventForm.category}
                      onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white appearance-none transition-all"
                    >
                      <option value="" className="bg-[#181824]">Select Category</option>
                      {eventCategories.map((category: any) => (
                        <option key={category.id} value={category.name} className="bg-[#181824]">{category.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Event Description *</label>
                      <InlineDescriptionAI
                        contextName={eventForm.title}
                        contextType="event"
                        onDescriptionGenerated={(desc) => setEventForm(prev => ({ ...prev, description: desc }))}
                      />
                    </div>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the magic of this event..."
                      rows={5}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all leading-relaxed"
                    />
                  </div>
                </div>

                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Event Highlights</label>
                    <button
                      type="button"
                      onClick={addHighlight}
                      className="text-[10px] font-bold text-purple-500 hover:text-purple-400 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Add Highlight
                    </button>
                  </div>
                  <div className="space-y-3">
                    {eventForm.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-center gap-2 group animate-in slide-in-from-right-2 duration-300">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                        <input
                          type="text"
                          value={highlight}
                          onChange={(e) => updateHighlight(index, e.target.value)}
                          placeholder="Bullet point highlight..."
                          className="flex-1 bg-transparent border-none p-0 text-white text-sm focus:ring-0 placeholder-gray-700 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => removeHighlight(index)}
                          className="text-red-400/60 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {eventForm.highlights.length === 0 && (
                      <div className="text-center py-4 border border-dashed border-white/5 rounded-xl">
                         <p className="text-[10px] text-gray-600 italic uppercase tracking-widest">No highlights listed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SCHEDULE */}
            {formStep === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Scheduled Date</label>
                      <input
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Start/End Time</label>
                      <input
                        type="text"
                        value={eventForm.time}
                        onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                        placeholder="e.g., 10:00 AM - 2:00 PM"
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Event Venue</label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                      <input
                        type="text"
                        value={eventForm.venue}
                        onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                        placeholder="Main Auditorium, Ground Floor"
                        className="w-full pl-12 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: RULES & FORMAT */}
            {formStep === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                {/* Event Rules & Guidelines */}
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-500 rounded-full" />
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Event Rules & Guidelines</h4>
                    </div>
                    <label className="text-[10px] font-bold text-gray-500 hover:text-white flex items-center gap-2 cursor-pointer transition-colors uppercase tracking-widest select-none">
                      <input 
                        type="checkbox" 
                        className="w-3 h-3 rounded border-white/10 bg-black/20 text-purple-500 focus:ring-purple-500 focus:ring-offset-0" 
                        checked={rulesModeStructured} 
                        onChange={(e)=>{
                          const enabled = e.target.checked;
                          if (enabled) {
                            setRulesModeStructured(true);
                            if (rulesSections.length === 0) setRulesSections([{ heading: '', blocks: [{ kind: 'points', style: 'number', title: '', items: eventForm.rules.length ? [...eventForm.rules] : [''] }] }]);
                          } else {
                            const flat = rulesSections.flatMap(s => (s.blocks || []).flatMap(b => (b.items || [])).filter(p=>p && p.trim()));
                            if (flat.length) setEventForm(prev => ({ ...prev, rules: flat }));
                            setRulesModeStructured(false);
                          }
                        }} 
                      />
                      Structured Mode
                    </label>
                  </div>

                  {!rulesModeStructured ? (
                    <div className="space-y-3">
                      {eventForm.rules.map((rule, index) => (
                        <div key={index} className="flex items-center gap-3 animate-in slide-in-from-right-2 duration-300">
                          <span className="text-xs font-bold text-purple-500 w-4">{index + 1}.</span>
                          <input
                            type="text"
                            value={rule}
                            onChange={(e) => updateRule(index, e.target.value)}
                            placeholder="Event rule..."
                            className="flex-1 bg-transparent border-none p-0 text-white text-sm focus:ring-0 placeholder-gray-700"
                          />
                          <button type="button" onClick={() => removeRule(index)} className="text-red-400/60 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><X size={14} /></button>
                        </div>
                      ))}
                      <button type="button" onClick={addRule} className="text-[10px] font-bold text-purple-500 hover:text-purple-400 uppercase tracking-widest transition-colors flex items-center gap-1.5 mt-2"><Plus size={14} /> Add Manual Rule</button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {rulesSections.map((sec, idx) => (
                        <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-4 relative group/section animate-in fade-in duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <input 
                              className="bg-transparent border-none p-0 text-sm font-bold text-purple-400 placeholder-purple-900 focus:ring-0 w-2/3" 
                              placeholder="Section Title (e.g. Gameplay)" 
                              value={sec.heading || ''} 
                              onChange={(e)=>updateSectionField(idx,'heading',e.target.value)} 
                            />
                            <button type="button" onClick={()=>removeSection(idx)} className="text-[10px] font-bold text-red-400/60 hover:text-red-400 uppercase tracking-widest">Delete Section</button>
                          </div>
                          
                          <div className="space-y-4">
                            {(sec.blocks || []).map((b, bIdx) => (
                              <div key={bIdx} className="bg-white/5 border border-white/5 rounded-lg p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <input 
                                    className="bg-transparent border-none p-0 text-xs font-bold text-white placeholder-gray-700 focus:ring-0 w-1/2" 
                                    placeholder="Block Title (optional)" 
                                    value={b.title || ''} 
                                    onChange={(e)=>updateBlockField(idx,bIdx,{ title: e.target.value })} 
                                  />
                                  <div className="flex items-center gap-3">
                                    <select 
                                      className="bg-black/40 border-none text-[10px] font-bold text-gray-500 uppercase tracking-widest rounded-md focus:ring-0 cursor-pointer" 
                                      value={b.style || 'number'} 
                                      onChange={(e)=>updateBlockField(idx,bIdx,{ style: (e.target.value as 'bullet'|'number') })}
                                    >
                                      <option value="number">Numeric</option>
                                      <option value="bullet">Bullets</option>
                                    </select>
                                    <button type="button" onClick={()=>removeBlock(idx,bIdx)} className="text-red-400/60 hover:text-red-400"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  {(b.items || []).map((p, pIdx) => (
                                    <div key={pIdx} className="flex items-center gap-2 group/point">
                                      <div className="w-1 h-1 bg-purple-500 rounded-full" />
                                      <input className="flex-1 bg-transparent border-none p-0 text-xs text-gray-300 placeholder-gray-700 focus:ring-0" placeholder={`Point ${pIdx+1}`} value={p} onChange={(e)=>updateItem(idx,bIdx,pIdx,e.target.value)} />
                                      <button type="button" onClick={()=>removeItem(idx,bIdx,pIdx)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover/point:opacity-100 transition-opacity"><X size={12} /></button>
                                    </div>
                                  ))}
                                  <button type="button" onClick={()=>addItem(idx,bIdx)} className="text-[10px] font-bold text-purple-500/60 hover:text-purple-500 uppercase tracking-widest flex items-center gap-1"><Plus size={10} /> Add Point</button>
                                </div>
                              </div>
                            ))}
                            <button type="button" onClick={()=>addBlock(idx,'number')} className="w-full py-2 bg-purple-500/5 border border-dashed border-purple-500/20 rounded-lg text-[10px] font-bold text-purple-400 hover:bg-purple-500/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2"><Plus size={12} /> Add Points Block</button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addSection} className="w-full py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2"><Plus size={16} /> Add Rules Section</button>
                    </div>
                  )}
                </div>

                {/* Entry Format */}
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Entry Format</h4>
                  </div>

                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Entry Mode</h5>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="registration_default_mode" 
                          className="w-3 h-3 bg-black/20 border-white/10 text-purple-500 focus:ring-0" 
                          value="individual" 
                          checked={(eventForm as any).registration_default_mode === 'individual'} 
                          onChange={() => setEventForm(prev => ({ ...prev, registration_default_mode: 'individual' } as any))} 
                        />
                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-white uppercase tracking-tighter">Individual</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="registration_default_mode" 
                          className="w-3 h-3 bg-black/20 border-white/10 text-purple-500 focus:ring-0" 
                          value="team" 
                          checked={(eventForm as any).registration_default_mode === 'team'} 
                          onChange={() => setEventForm(prev => ({ ...prev, registration_default_mode: 'team' } as any))} 
                        />
                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-white uppercase tracking-tighter">Team</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <label className="flex items-center group cursor-pointer select-none w-fit">
                      <input 
                        type="checkbox" 
                        className="w-3 h-3 rounded border-white/10 bg-black/20 text-amber-500 focus:ring-0" 
                        checked={(eventForm as any).registration_mode_locked ?? false} 
                        onChange={(e) => setEventForm(prev => ({ ...prev, registration_mode_locked: e.target.checked } as any))} 
                      />
                      <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Lock selection mode</span>
                    </label>
                    <p className="text-xs text-gray-600">When locked, users cannot switch between individual and team modes.</p>
                  </div>
                  
                  {/* Team Size Configuration */}
                  {(eventForm as any).registration_default_mode === 'team' && (
                    <div className="pt-6 border-t border-white/5 space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center group cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-white/10 bg-black/20 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 transition-colors" 
                            checked={!!((eventForm as any).team_required_size)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEventForm(prev => ({ ...prev, team_required_size: 2, team_max_members: undefined } as any));
                              } else {
                                setEventForm(prev => ({ ...prev, team_required_size: undefined } as any));
                              }
                            }}
                          />
                          <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Fixed Team Size</span>
                        </label>
                        <p className="text-[10px] text-gray-600 italic">Forces exact participant count</p>
                      </div>
                      
                      {(eventForm as any).team_required_size ? (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1.5">Required Members Count</label>
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
                            className="w-24 px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-white text-sm font-mono"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1.5">Min Team Size</label>
                            <input
                              type="number"
                              min={2}
                              max={(eventForm as any).team_max_members || 50}
                              value={(eventForm as any).team_min_members ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                const n = v === '' ? undefined : Math.max(2, Math.min(50, Number(v)));
                                setEventForm(prev => ({ ...prev, team_min_members: Number.isNaN(Number(v)) ? undefined : n } as any));
                              }}
                              placeholder="Min (2)"
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-white text-sm font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1.5">Max Team Size</label>
                            <input
                              type="number"
                              min={(eventForm as any).team_min_members || 2}
                              max={50}
                              value={(eventForm as any).team_max_members ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                const n = v === '' ? undefined : Math.max(2, Math.min(50, Number(v)));
                                setEventForm(prev => ({ ...prev, team_max_members: Number.isNaN(Number(v)) ? undefined : n } as any));
                              }}
                              placeholder="Max (50)"
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-white text-sm font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Participant Access */}
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-500 rounded-full" />
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Participant Access</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const list = ((siteSettings as any)?.registration_participant_types as string[] || [])
                            .filter(t => t && !t.toLowerCase().includes('select') && !t.trim().startsWith('.'));
                          setEventForm(prev => ({ ...prev, registration_participant_types: list } as any));
                        }}
                        className="text-[10px] font-bold text-purple-500 hover:text-purple-400 uppercase tracking-widest transition-colors"
                      >All</button>
                      <span className="text-white/10">|</span>
                      <button
                        type="button"
                        onClick={() => setEventForm(prev => ({ ...prev, registration_participant_types: [], registration_participant_quotas: {} } as any))}
                        className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                      >None</button>
                    </div>
                  </div>

                  {Array.isArray((siteSettings as any)?.registration_participant_types) && (siteSettings as any).registration_participant_types.length > 0 ? (
                    <div className="space-y-3 max-h-62 overflow-y-auto pr-2 custom-scrollbar">
                      {((siteSettings as any).registration_participant_types as string[]).map((t: string) => {
                        const isPlaceholder = t.toLowerCase().includes('select') || t.trim().startsWith('.');
                        const selected = (eventForm.registration_participant_types || []).includes(t);
                        const limitVal = ((eventForm as any).registration_participant_quotas?.[t] ?? '') as any;
                        if (isPlaceholder) return null;
                        return (
                          <div key={t} className={`p-3 rounded-xl border transition-all ${
                            selected 
                              ? 'bg-purple-500/10 border-purple-500/20 shadow-[0_0_15px_-5px_rgba(168,85,247,0.2)]' 
                              : 'bg-black/20 border-white/5 opacity-60'
                          }`}>
                            <div className="flex items-center justify-between gap-4">
                              <label className="flex items-center gap-3 cursor-pointer group flex-1">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setEventForm(prev => {
                                      const cur = new Set(prev.registration_participant_types || []);
                                      const quotas = { ...(((prev as any).registration_participant_quotas || {}) as Record<string, number>) };
                                      if (checked) cur.add(t); else { cur.delete(t); delete quotas[t]; }
                                      return { ...prev, registration_participant_types: Array.from(cur), registration_participant_quotas: quotas } as any;
                                    });
                                  }}
                                  className="w-3.5 h-3.5 rounded border-white/10 bg-black/20 text-purple-500 focus:ring-0 appearance-none flex items-center justify-center checked:after:content-['✓'] checked:after:text-[10px] checked:after:text-white"
                                />
                                <span className={`text-xs font-bold uppercase tracking-tight ${selected ? 'text-white' : 'text-gray-500'}`}>{t}</span>
                              </label>
                              
                              {selected && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-1 duration-200">
                                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Quota:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={limitVal}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      setEventForm(prev => {
                                        const base = ((prev as any).registration_participant_quotas || {}) as Record<string, number>;
                                        const quotas = { ...base };
                                        if (raw === '') delete quotas[t]; else quotas[t] = Math.max(0, parseInt(raw || '0')) || 0;
                                        return { ...prev, registration_participant_quotas: quotas } as any;
                                      });
                                    }}
                                    placeholder="∞"
                                    className="w-16 px-2 py-1 bg-black/40 border border-white/10 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none text-[10px] font-mono text-white text-center"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-black/20 border border-dashed border-white/5 rounded-xl">
                      <p className="text-[10px] text-gray-600 italic uppercase tracking-widest">No types defined in site settings</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: MEDIA & SUPPORT STAFF */}
            {formStep === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                {/* Registration Logistics */}
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Registration Logistics</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <label className="flex items-center group cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!(eventForm as any).registration_photo_required}
                          onChange={(e) => setEventForm(prev => ({ ...prev, registration_photo_required: e.target.checked } as any))}
                          className="w-4 h-4 rounded border-white/10 bg-black/20 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 transition-colors"
                        />
                        <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Require Photo</span>
                      </label>
                      <label className="flex items-center group cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={eventForm.featured}
                          onChange={(e) => setEventForm(prev => ({ ...prev, featured: e.target.checked }))}
                          className="w-4 h-4 rounded border-white/10 bg-black/20 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 transition-colors"
                        />
                        <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Featured Event</span>
                      </label>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center group cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={eventForm.visible}
                          onChange={(e) => setEventForm(prev => ({ ...prev, visible: e.target.checked }))}
                          className="w-4 h-4 rounded border-white/10 bg-black/20 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 transition-colors"
                        />
                        <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Publicly Visible</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Media & Identification */}
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Media & Identification</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="pt-4 border-t border-white/5">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <Upload size={14} className="text-purple-400" /> Banner & Motion Assets
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {/* Main Image */}
                        <div className="group relative">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Event Image *</label>
                          <ImageUpload
                            onImageSelect={(url: string) => setEventForm(prev => ({ ...prev, image: url }))}
                            currentImage={eventForm.image}
                            bucket="event-images"
                            folder="events"
                            cropAspect={49/59.4}
                            enableCropper={true}
                            maxImageBytes={20 * 1024 * 1024}
                            fileTypeLabel="Poster (49:59.4)"
                            className="w-full aspect-[49/59.4] rounded-2xl overflow-hidden border border-white/5 group-hover:border-purple-500/30 transition-all"
                          />
                          <p className="text-[9px] text-gray-600 mt-2 uppercase tracking-tighter">Primary card image (49:59.4 ratio)</p>
                        </div>

                        {/* Motion Poster */}
                        <div className="group relative">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Motion Poster (Video)</label>
                          <div className="rounded-2xl overflow-hidden border border-white/5 group-hover:border-purple-500/30 transition-all bg-black/20 aspect-[49/59.4]">
                            <VideoUpload
                              onVideoSelect={(url) => setEventForm(prev => ({ ...prev, motion_poster_url: url }))}
                              currentVideo={eventForm.motion_poster_url || ''}
                              bucket="event-images"
                              folder="events/motion-posters"
                              maxSizeMB={50}
                            />
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer group/check">
                              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${ (eventForm as any).motion_poster_autoplay ? 'bg-emerald-500' : 'bg-white/10 group-hover/check:bg-white/20'}`}>
                                <div className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform ${ (eventForm as any).motion_poster_autoplay ? 'translate-x-4' : ''}`} />
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={(eventForm as any).motion_poster_autoplay || false}
                                onChange={(e) => setEventForm(prev => ({ ...prev, motion_poster_autoplay: e.target.checked }))}
                              />
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Auto-play</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Contact Staff */}
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-4">
                  <div className="flex flex-col gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-500 rounded-full" />
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Additional Contact Staff (Visible to Students)</h4>
                    </div>
                    <p className="text-[10px] text-gray-500">These staff details will be displayed on the event card so students can contact them for queries.</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-1" />
                    <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      {draftCoordinators.length} Staff
                    </span>
                  </div>

                  <div className="space-y-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                    {draftCoordinators.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-black/40 border border-white/5 rounded-xl group/staff animate-in fade-in slide-in-from-right-2 duration-300">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <input
                            className="bg-transparent border-none p-0 text-sm text-white font-bold focus:ring-0 placeholder-gray-700"
                            value={c.name}
                            onChange={(e)=>setDraftCoordinators(prev=>prev.map((row,i)=> i===idx? { ...row, name: e.target.value }: row))}
                            placeholder="Staff Name"
                          />
                          <input
                            className="bg-transparent border-none p-0 text-sm text-gray-400 font-mono focus:ring-0 placeholder-gray-700"
                            value={c.phone || ''}
                            onChange={(e)=>setDraftCoordinators(prev=>prev.map((row,i)=> i===idx? { ...row, phone: e.target.value }: row))}
                            placeholder="Phone"
                          />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/staff:opacity-100 transition-opacity">
                          <button type="button" onClick={()=>moveDraftCoordinator(idx,-1)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"><ArrowUp size={14} /></button>
                          <button type="button" onClick={()=>moveDraftCoordinator(idx,1)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"><ArrowDown size={14} /></button>
                          <button type="button" onClick={()=>setDraftCoordinators(prev=>prev.filter((_,i)=>i!==idx))} className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                    
                    {draftCoordinators.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-xl">
                        <p className="text-xs text-gray-600 italic">No additional staff added yet</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5 grid grid-cols-12 gap-3">
                    <div className="col-span-5 relative">
                      <UserPlus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none" value={newCoordinator.name} onChange={(e)=>setNewCoordinator(prev=>({...prev,name:e.target.value}))} placeholder="Staff Name" />
                    </div>
                    <input className="col-span-5 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white font-mono focus:ring-1 focus:ring-purple-500 focus:outline-none" value={newCoordinator.phone} onChange={(e)=>setNewCoordinator(prev=>({...prev,phone:e.target.value}))} placeholder="Phone" />
                    <button
                      type="button"
                      onClick={()=>{
                        const nameT = newCoordinator.name.trim();
                        const phoneT = newCoordinator.phone.trim();
                        const isPlaceholder = (v: string) => v === '' || v === '0' || v === '-' || v === '—';
                        if (isPlaceholder(nameT) && !phoneT) return;
                        setDraftCoordinators(prev=>[...prev, { name: isPlaceholder(nameT) ? '—' : nameT, phone: phoneT || null }]);
                        setNewCoordinator({ name: '', phone: '' });
                      }}
                      className="col-span-2 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-500 transition-all uppercase tracking-tighter"
                    >Add</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-8 max-w-4xl mx-auto">
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingEvent(false);
                  resetEventForm();
                  setFormStep(1);
                }}
                className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all text-sm uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              {formStep > 1 && (
                <button
                  type="button"
                  onClick={() => setFormStep(prev => Math.max(prev - 1, 1))}
                  className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}

              {formStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full sm:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transform active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddEvent()}
                  disabled={savingAdd}
                  className="w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transform active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {savingAdd ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {savingAdd ? 'Launching…' : 'Launch Event'}
                </button>
              )}
            </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map((event: any) => (
          <div key={event.id} className="rico-glass-card rounded-[2.5rem] overflow-hidden group hover:border-purple-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-900/20 tilt-3d relative">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 via-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={(() => {
                    const sanitized = sanitizeUrl?.(event.image) || event.image;
                    return sanitized;
                  })()}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0f0f1a] to-transparent opacity-90" />
                
                {/* Last-10s full-card countdown overlay */}
                {(() => {
                  const secs = getSecondsToOpen(event);
                  const openAt = (event as any).registration_opens_at ? new Date((event as any).registration_opens_at as string).getTime() : null;
                  const isTimerOpenWithGrace = openAt != null ? Date.now() + 1000 >= openAt : false;
                  const show = !isTimerOpenWithGrace && !event.registration_open && (event as any).registration_timer_enabled && typeof secs === 'number' && secs > 0 && secs <= 10;
                  if (!show) return null;
                  return (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div
                        className="font-black select-none countdown-drama"
                        title={getOpensAtTooltip(event)}
                        style={{
                          fontSize: 'clamp(48px, 16vw, 140px)',
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

                <div className="absolute top-4 right-4 flex flex-wrap justify-end gap-2">
                  <div className="bg-black/60 backdrop-blur-md text-[10px] font-bold text-white px-2.5 py-1 rounded-full border border-white/10 uppercase tracking-widest flex items-center" title={`Default registration mode: ${(event as any).registration_default_mode || 'individual'}`}>
                    {(event as any).registration_default_mode === 'team' ? 'Mode: Team' : 'Mode: Individual'}
                  </div>
                  {event.featured && (
                    <span className="bg-amber-500 text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center shadow-lg shadow-amber-500/20">
                      <Star size={10} className="mr-1 fill-current" />
                      Featured
                    </span>
                  )}
                  {!event.visible && (
                    <span className="bg-red-500/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-500/50">
                      Hidden
                    </span>
                  )}
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] mb-1 block">{event.category}</span>
                    <h3 className="font-bold text-xl text-white tracking-tight group-hover:text-purple-300 transition-colors line-clamp-1">{event.title}</h3>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 min-h-[2.5rem]">{event.description}</p>
                
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-y border-white/5 py-4">
                  {String(event.date || '').trim() && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar size={12} className="text-purple-500/60" />
                      <span className="text-[10px] font-medium tracking-wide uppercase truncate">{event.date}</span>
                    </div>
                  )}
                  {String(event.time || '').trim() && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock size={12} className="text-purple-500/60" />
                      <span className="text-[10px] font-medium tracking-wide uppercase truncate">{event.time}</span>
                    </div>
                  )}
                  {String(event.venue || '').trim() && (
                    <div className="flex items-center gap-2 text-gray-500 col-span-2">
                      <MapPin size={12} className="text-purple-500/60 shrink-0" />
                      <span className="text-[10px] font-medium tracking-wide uppercase truncate">{event.venue}</span>
                    </div>
                  )}
                  {(event.max_participants || (event as any).participants) && (
                    <div className="flex items-center gap-2 text-gray-500 col-span-2">
                      <Users size={12} className="text-purple-500/60 shrink-0" />
                      <span className="text-[10px] font-medium tracking-wide uppercase truncate">
                        {event.max_participants
                          ? `${event.current_registrations ?? 0} / ${event.max_participants} Participants`
                          : `${String((event as any).participants).trim()} Participants`}
                      </span>
                    </div>
                  )}
                  {event.rules && computeRulesCount(event.rules) > 0 && (
                    <div className="flex items-center gap-2 text-gray-500 col-span-2">
                      <FileText size={12} className="text-purple-400/60 shrink-0" />
                      <span className="text-[10px] font-medium tracking-wide uppercase truncate">
                        {computeRulesCount(event.rules)} Rule{computeRulesCount(event.rules) !== 1 ? 's' : ''} Defined
                      </span>
                    </div>
                  )}
                </div>

                {/* Registration Progress Bar */}
                {event.max_participants && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-gray-500">Registrations</span>
                      <span className="text-purple-400">{Math.round(((event.current_registrations || 0) / event.max_participants) * 100)}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                        style={{ 
                          width: `${Math.min(100, ((event.current_registrations || 0) / event.max_participants) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(event.id)}
                        className={`p-2 rounded-xl transition-all shadow-lg ${
                          event.featured ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : 'bg-white/5 text-gray-500 border border-white/5 hover:text-white hover:bg-white/10'
                        }`}
                        title={event.featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <Star size={14} className={event.featured ? 'fill-current' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(event.id)}
                        className={`p-2 rounded-xl transition-all shadow-lg ${
                          event.visible !== false ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/20 text-red-500 border border-red-500/20'
                        }`}
                        title={event.visible !== false ? 'Hide from public' : 'Show to public'}
                      >
                        {event.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRegistration(event.id)}
                        className={`p-2 rounded-xl transition-all shadow-lg ${
                          event.registration_open ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-white/5 text-gray-500 border border-white/5 hover:text-white hover:bg-white/10'
                        }`}
                        title={event.registration_open ? 'Close registration' : 'Open registration'}
                      >
                        {event.registration_open ? <UserPlus size={14} /> : <UserMinus size={14} />}
                      </button>
                    </div>

                    <div className="flex gap-2">
                       <button
                        type="button"
                        onClick={() => handleManualNotify(event)}
                        className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-all shadow-lg"
                        title="Send Notification"
                      >
                        <Bell size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditingEvent(event)}
                        className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all shadow-lg"
                        title="Edit event"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all shadow-lg"
                        title="Delete event"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveWinnersFor((cur) => cur === event.id ? null : event.id)}
                    className={`w-full py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group/btn ${activeWinnersFor === event.id ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400'}`}
                  >
                    <Star size={12} className={activeWinnersFor === event.id ? 'text-amber-500 fill-current' : 'group-hover/btn:text-amber-500 transition-colors'} />
                    {activeWinnersFor === event.id ? 'Close Winners' : 'Manage Winners'}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] ${activeWinnersFor === event.id ? 'bg-amber-500/30' : 'bg-white/10'}`}>
                      {((_eventWinners || []) as any[]).filter((w:any) => w.event_id === event.id).length}
                    </span>
                  </button>

                  {/* Inline winners editor - Animated Reveal */}
                  {activeWinnersFor === event.id && (
                    <div className="animate-in slide-in-from-top-4 duration-500">
                      <div className="bg-black/40 rounded-2xl border border-white/5 p-4 shadow-inner">
                        <EventWinnersEditor eventId={event.id} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
                    <label className="flex items-center gap-2 cursor-pointer group/live px-2">
                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${ event.registration_open ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10 group-hover/live:bg-white/20'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform ${ event.registration_open ? 'translate-x-4' : ''}`} />
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={!!event.registration_open}
                          onChange={(e)=>handleSetRegistrationOpen(event.id, e.target.checked)}
                        />
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Live</span>
                    </label>

                    {event.registration_open ? (
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                        Live Now
                      </span>
                    ) : (event as any).registration_timer_enabled && (event as any).registration_opens_at ? (
                      <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 flex items-center gap-1.5">
                        <Clock size={10} />
                        {getCountdown(event) === 'now' ? 'Opening now…' : `${getCountdown(event)}`}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        Closed
                      </span>
                    )}
                  </div>
                </div>
              </div>
          </div>
        ))}
      </div>

      {/* No Events Message */}
      {events.length === 0 && (
        <div className="text-center py-20 bg-[#181824]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-50" />
          <div className="relative">
            <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
              <Calendar size={40} className="text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Empty Event Horizon</h3>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">No festival events have been charted yet. Start by creating your first flagship event.</p>
            <button
              type="button"
              onClick={() => {
                setIsAddingEvent(true);
                resetEventForm();
              }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transform active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center mx-auto gap-2"
            >
              <Plus size={18} /> Add First Event
            </button>
          </div>
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

      {/* Edit Event Modal (Global) */}
      {editingEvent && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl transition-all duration-300">
          <div className="bg-[#0f0f1a] w-full max-w-7xl h-[100dvh] sm:h-[90vh] sm:rounded-3xl shadow-2xl border border-white/10 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Left Panel: Media Preview (Desktop) */}
            <div className="hidden md:flex flex-col w-1/3 lg:w-[400px] bg-white/5 border-r border-white/10 p-6 overflow-y-auto custom-scrollbar relative group">
              <h3 className="text-lg font-bold text-white mb-4">Media & Preview</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Event Poster</label>
                  <div className="relative rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/40 aspect-[49/59.4] group-hover:border-purple-500/50 transition-colors">
                     <ImageUpload
                      onImageSelect={(url) => setEventForm(prev => ({ ...prev, image: url }))}
                      currentImage={eventForm.image}
                      bucket="event-images"
                      folder="events"
                      cropAspect={49/59.4}
                      enableCropper={true}
                      maxImageBytes={20 * 1024 * 1024}
                      fileTypeLabel="Poster (49:59.4)"
                      className="w-full h-full"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Recommended: 49:59.4 Aspect Ratio</p>
                </div>

                <div>
                   <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Motion Poster</label>
                   <div className="rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/40">
                      <VideoUpload
                        onVideoSelect={(url) => setEventForm(prev => ({ ...prev, motion_poster_url: url }))}
                        currentVideo={eventForm.motion_poster_url || ''}
                        bucket="event-images"
                        folder="events/motion-posters"
                        maxSizeMB={50}
                      />
                   </div>
                   <div className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(eventForm as any).motion_poster_autoplay || false}
                        onChange={(e) => setEventForm(prev => ({ ...prev, motion_poster_autoplay: e.target.checked }))}
                        className="rounded border-gray-600 bg-transparent text-purple-500 focus:ring-purple-500/50"
                      />
                      <span className="text-xs text-gray-400">Autoplay on Card</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Form Fields */}
            <div className="flex-1 flex flex-col bg-[#1a1a2e]/50 backdrop-blur-3xl h-full min-h-0">
               {/* Header */}
               <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f0f1a]/50 backdrop-blur-md z-10 shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-white">Edit Event</h2>
                    {eventForm.title && <p className="text-sm text-purple-400 truncate max-w-[200px] sm:max-w-md">{eventForm.title}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                        onClick={() => { setEditingEvent(null); resetEventForm(); }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Close"
                      >
                        <X size={24} />
                      </button>
                  </div>
               </div>

               {/* Scrollable Content */}
               <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 custom-scrollbar">
                  
                  {/* Basic Info Section */}
                  <div className="space-y-4">
                     <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} /> Basic Details
                     </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-xs font-medium text-gray-400">Title</label>
                           <input
                              type="text"
                              value={eventForm.title}
                              onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                              placeholder="Event Name"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-medium text-gray-400">Category</label>
                           <select
                              value={eventForm.category}
                              onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-gray-300 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 [&>option]:bg-[#1a1a2e]"
                           >
                              <option value="">Select...</option>
                              {eventCategories.map((category: any) => (
                                <option key={category.id} value={category.name}>{category.name}</option>
                              ))}
                           </select>
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400">Description</label>
                        <textarea
                           value={eventForm.description}
                           onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                           rows={4}
                           className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none"
                           placeholder="Describe the event..."
                        />
                     </div>
                  </div>

                  {/* Schedule & Venue */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                     <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Calendar size={14} /> Schedule & Venue
                     </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                           <label className="text-xs font-medium text-gray-400">Date</label>
                           <input
                              type="date"
                              value={eventForm.date}
                              onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500/50"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-medium text-gray-400">Time</label>
                           <input
                              type="text"
                              value={eventForm.time}
                              onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                              placeholder="10:00 AM"
                           />
                        </div>
                         <div className="space-y-1">
                           <label className="text-xs font-medium text-gray-400">Venue</label>
                           <input
                              type="text"
                              value={eventForm.venue}
                              onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                              placeholder="Auditorium"
                           />
                        </div>
                     </div>
                  </div>

                  {/* Mobile Media Grid (Visible only on small screens) */}
                  <div className="md:hidden space-y-4 pt-4 border-t border-white/5">
                     <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Media</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <ImageUpload
                           onImageSelect={(url) => setEventForm(prev => ({ ...prev, image: url }))}
                           currentImage={eventForm.image}
                           bucket="event-images"
                           folder="events"
                           cropAspect={49/59.4}
                           enableCropper={true}
                           fileTypeLabel="Poster"
                           className="w-full aspect-[49/59.4]"
                        />
                        <VideoUpload
                           onVideoSelect={(url) => setEventForm(prev => ({ ...prev, motion_poster_url: url }))}
                           currentVideo={eventForm.motion_poster_url || ''}
                           bucket="event-images"
                           folder="events/motion-posters"
                           maxSizeMB={50}
                        />
                     </div>
                  </div>

                  {/* Registration Logic */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Users size={14} /> Registration Configuration
                     </h3>

                     {/* Mode Selector */}
                     <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400 block">Default Mode</label>
                                <div className="flex items-center bg-black/30 p-1 rounded-lg border border-white/5">
                                    <button
                                        onClick={() => setEventForm(prev => ({ ...prev, registration_default_mode: 'individual' } as any))}
                                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                                            (eventForm as any).registration_default_mode === 'individual' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                    >Individual</button>
                                    <button
                                        onClick={() => setEventForm(prev => ({ ...prev, registration_default_mode: 'team' } as any))}
                                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                                            (eventForm as any).registration_default_mode === 'team' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                    >Team</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                 <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${ (eventForm as any).registration_mode_locked ? 'bg-purple-600' : 'bg-white/10 group-hover:bg-white/20'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${ (eventForm as any).registration_mode_locked ? 'translate-x-4' : ''}`} />
                                    </div>
                                    <input type="checkbox" className="hidden" checked={(eventForm as any).registration_mode_locked ?? false} onChange={(e) => setEventForm(prev => ({ ...prev, registration_mode_locked: e.target.checked } as any))} />
                                    <span className="text-xs text-gray-400 group-hover:text-gray-300">Lock Mode</span>
                                 </label>
                            </div>
                        </div>

                        {/* Team Settings */}
                        {(eventForm as any).registration_default_mode === 'team' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5 animate-in slide-in-from-top-2">
                                <label className="flex items-center gap-2 p-3 bg-black/20 rounded-lg border border-white/5 cursor-pointer">
                                    <input 
                                       type="checkbox" 
                                       checked={!!((eventForm as any).team_required_size)}
                                       onChange={(e) => {
                                          if (e.target.checked) {
                                            setEventForm(prev => ({ ...prev, team_required_size: 2, team_max_members: undefined } as any));
                                          } else {
                                            setEventForm(prev => ({ ...prev, team_required_size: undefined } as any));
                                          }
                                       }}
                                       className="rounded border-gray-600 bg-transparent text-purple-500"
                                    />
                                    <span className="text-xs text-gray-300">Require Exact Team Size</span>
                                </label>
                                {(eventForm as any).team_required_size ? (
                                    <div className="space-y-1">
                                       <label className="text-xs text-gray-400">Exact Size</label>
                                       <input type="number" min={2} max={50} value={(eventForm as any).team_required_size} onChange={e => setEventForm(prev => ({ ...prev, team_required_size: parseInt(e.target.value) } as any))} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm" />
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="space-y-1 flex-1">
                                            <label className="text-xs text-gray-400">Min Members</label>
                                            <input type="number" min={2} value={(eventForm as any).team_min_members || 2} onChange={e => setEventForm(prev => ({ ...prev, team_min_members: parseInt(e.target.value) } as any))} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm" />
                                        </div>
                                         <div className="space-y-1 flex-1">
                                            <label className="text-xs text-gray-400">Max Members</label>
                                            <input type="number" max={50} value={(eventForm as any).team_max_members || 50} onChange={e => setEventForm(prev => ({ ...prev, team_max_members: parseInt(e.target.value) } as any))} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                     </div>

                     {/* Participants Types */}
                     <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 block">Allowed Batches</label>
                        {Array.isArray((siteSettings as any)?.registration_participant_types) && (siteSettings as any).registration_participant_types.length > 0 ? (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {((siteSettings as any).registration_participant_types as string[]).map((t: string) => {
                                 const isPlaceholder = t.toLowerCase().includes('select') || t.trim().startsWith('.');
                                 const selected = (eventForm.registration_participant_types || []).includes(t);
                                 const limitVal = ((eventForm as any).registration_participant_quotas?.[t] ?? '') as any;
                                 
                                 return (
                                    <div key={t} className={`flex items-center justify-between p-2 rounded-lg border ${selected ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'} transition-all`}>
                                       <label className={`flex items-center gap-2 flex-1 cursor-pointer ${isPlaceholder ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                          <input type="checkbox" checked={selected} disabled={isPlaceholder} onChange={(e) => {
                                             const checked = e.target.checked;
                                              setEventForm(prev => {
                                                const cur = new Set(prev.registration_participant_types || []);
                                                const quotas = { ...(((prev as any).registration_participant_quotas || {}) as Record<string, number>) };
                                                if (checked) cur.add(t); else { cur.delete(t); if (quotas[t] !== undefined) delete quotas[t]; }
                                                return { ...prev, registration_participant_types: Array.from(cur), registration_participant_quotas: quotas } as any;
                                              });
                                          }} className="rounded border-gray-600 bg-transparent text-purple-500" />
                                          <span className="text-sm text-gray-200 truncate">{t}</span>
                                       </label>
                                       {selected && (
                                          <input 
                                             type="number" 
                                             placeholder="∞" 
                                             value={limitVal} 
                                             onChange={(e) => {
                                                const raw = e.target.value;
                                                setEventForm(prev => {
                                                    const base = ((prev as any).registration_participant_quotas || {}) as Record<string, number>;
                                                    const quotas = { ...base };
                                                    if (raw === '') delete quotas[t]; else quotas[t] = Math.max(0, parseInt(raw || '0')) || 0;
                                                    return { ...prev, registration_participant_quotas: quotas } as any;
                                                });
                                             }}
                                             className="w-16 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-purple-500/50"
                                          />
                                       )}
                                    </div>
                                 );
                              })}
                           </div>
                        ) : (
                           <p className="text-xs text-gray-500 italic">No types defined in Settings.</p>
                        )}
                     </div>
                  </div>

                  {/* Rules Section */}
                   <div className="space-y-4 pt-4 border-t border-white/5">
                     <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                           <FileText size={14} /> Rules & Regulations
                        </h3>
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-gray-400">Structured Mode</span>
                           <input type="checkbox" checked={rulesModeStructured} onChange={(e) => setRulesModeStructured(e.target.checked)} className="toggle-checkbox" />
                        </div>
                     </div>

                     {!rulesModeStructured ? (
                        <div className="space-y-2">
                           {eventForm.rules.map((rule, idx) => (
                              <div key={idx} className="flex gap-2 group">
                                 <input
                                    type="text"
                                    value={rule}
                                    onChange={(e) => updateRule(idx, e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                    placeholder={`Rule ${idx + 1}`}
                                 />
                                 <button onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-300 opacity-50 group-hover:opacity-100 transition-opacity p-2"><Trash2 size={16} /></button>
                              </div>
                           ))}
                           <button onClick={addRule} className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 mt-2">
                              <Plus size={14} /> Add Rule
                           </button>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {rulesSections.map((sec, idx) => (
                              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                                 <div className="flex justify-between items-start">
                                    <input value={sec.heading || ''} onChange={e => updateSectionField(idx, 'heading', e.target.value)} placeholder="Section Heading" className="bg-transparent text-sm font-bold text-white placeholder-gray-500 focus:outline-none w-full border-b border-transparent focus:border-purple-500/30 pb-1" />
                                    <button onClick={() => removeSection(idx)} className="text-red-400 hover:text-red-300 p-1"><X size={14} /></button>
                                 </div>
                                 {(sec.blocks || []).map((b, bIdx) => (
                                    <div key={bIdx} className="pl-3 border-l-2 border-white/10 space-y-2">
                                       <div className="flex items-center gap-2">
                                          <select value={b.style} onChange={e => updateBlockField(idx, bIdx, { style: e.target.value as any })} className="bg-black/20 text-xs text-gray-400 border-none rounded">
                                             <option value="number">1. 2. 3.</option>
                                             <option value="bullet">• • •</option>
                                          </select>
                                          <input value={b.title || ''} onChange={e => updateBlockField(idx, bIdx, { title: e.target.value })} placeholder="Block Title (Opt)" className="bg-transparent text-xs text-gray-300 focus:outline-none flex-1" />
                                          <button onClick={() => removeBlock(idx, bIdx)} className="text-red-400/50 hover:text-red-400"><X size={12} /></button>
                                       </div>
                                       {b.items.map((item, pIdx) => (
                                          <div key={pIdx} className="flex gap-2">
                                             <input value={item} onChange={e => updateItem(idx, bIdx, pIdx, e.target.value)} className="flex-1 bg-white/5 rounded px-2 py-1 text-xs text-white border border-transparent focus:border-purple-500/30 focus:outline-none" />
                                             <button onClick={() => removeItem(idx, bIdx, pIdx)} className="text-gray-500 hover:text-red-400"><X size={12} /></button>
                                          </div>
                                       ))}
                                       <button onClick={() => addItem(idx, bIdx)} className="text-[10px] text-purple-400 hover:text-purple-300 ml-1">+ Point</button>
                                    </div>
                                 ))}
                                 <button onClick={() => addBlock(idx)} className="text-xs text-gray-400 hover:text-white border border-dashed border-gray-600 rounded px-2 py-1">+ Block</button>
                              </div>
                           ))}
                           <button onClick={addSection} className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-xs text-gray-400 hover:text-white hover:border-gray-400 transition-all">+ New Section</button>
                        </div>
                     )}
                     
                     <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                         <label className="text-xs font-medium text-blue-300 block mb-1">Rules PDF Link (Optional)</label>
                         <input
                           type="url"
                           value={eventForm.rules_link || ''}
                           onChange={(e) => setEventForm(prev => ({ ...prev, rules_link: e.target.value }))}
                           className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                           placeholder="https://drive.google.com/..."
                         />
                     </div>
                   </div>

                   {/* Coordinators Section */}
                   <div className="space-y-4 pt-4 border-t border-white/5">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                           <Users size={14} /> Coordinators
                      </h3>
                      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                           {coordinatorsFor(editingEvent).map((c) => (
                              <div key={c.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-2 border-b border-white/5 last:border-0 items-center hover:bg-white/5 transition-colors">
                                 <input value={c.name} onChange={e => updateCoordinatorField(c.id, 'name', e.target.value)} className="bg-transparent text-sm text-white focus:outline-none border-b border-transparent focus:border-purple-500/50" />
                                 <input value={c.phone || ''} onChange={e => updateCoordinatorField(c.id, 'phone', e.target.value)} className="bg-transparent text-sm text-gray-400 focus:outline-none border-b border-transparent focus:border-purple-500/50" />
                                 <div className="flex gap-1">
                                    <button onClick={() => removeCoordinator(c.id)} className="p-1 text-red-400 hover:bg-red-400/10 rounded"><Trash2 size={14} /></button>
                                 </div>
                              </div>
                           ))}
                           {coordinatorsFor(editingEvent).length === 0 && (
                              <div className="p-4 text-center text-xs text-gray-500">No coordinators assigned.</div>
                           )}
                        </div>
                        <div className="p-2 bg-black/20 flex gap-2">
                           <input value={newCoordinator.name} onChange={e => setNewCoordinator(prev => ({...prev, name: e.target.value}))} placeholder="New Name" className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none" />
                           <input value={newCoordinator.phone} onChange={e => setNewCoordinator(prev => ({...prev, phone: e.target.value}))} placeholder="Phone" className="w-24 sm:w-32 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none" />
                           <button onClick={() => addCoordinator(editingEvent)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors">Add</button>
                        </div>
                      </div>
                   </div>

               </div>
               
               {/* Footer Actions */}
               <div className="p-4 sm:p-6 border-t border-white/10 bg-[#0f0f1a]/80 backdrop-blur-xl z-20 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                     <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={!!eventForm.registration_timer_enabled} onChange={e => setEventForm(prev => ({...prev, registration_timer_enabled: e.target.checked}))} className="rounded border-gray-600 bg-transparent text-purple-500" />
                        Enable Timer
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={eventForm.visible} onChange={e => setEventForm(prev => ({...prev, visible: e.target.checked}))} className="rounded border-gray-600 bg-transparent text-purple-500" />
                        Visible
                     </label>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                     <button
                        onClick={() => { setEditingEvent(null); resetEventForm(); }}
                        className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all font-medium text-sm"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={() => handleUpdateEvent(editingEvent)}
                        disabled={savingUpdate}
                        className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                     >
                        {savingUpdate ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {savingUpdate ? 'Saving Changes...' : 'Save Changes'}
                     </button>
                  </div>
               </div>

            </div>
          </div>
        </div>
      , document.body)}
      {/* Manual Notification Modal */}
      {manualNotifyEvent && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0f0f1a] w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl shadow-purple-900/20 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b border-white/5 bg-white/5 backdrop-blur-md flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] mb-1 block">Manual Push</span>
                <h3 className="text-xl font-bold text-white tracking-tight">Broadcast Update</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{manualNotifyEvent.title}</p>
              </div>
              <button 
                onClick={() => setManualNotifyEvent(null)} 
                className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              {/* Step 1: Type */}
              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Notification Type</label>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setManualNotifyType('rules'); setManualNotifyMessage('Please check the website for updated rules.'); }}
                        className={`flex-1 py-4 px-4 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-2 ${manualNotifyType === 'rules' ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/10' : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10 hover:text-gray-300'}`}
                    >
                        <FileText size={20} className={manualNotifyType === 'rules' ? 'text-purple-400' : 'text-gray-600'} />
                        Rules Update
                    </button>
                    <button 
                        onClick={() => { setManualNotifyType('schedule'); setManualNotifyMessage('Please note the latest details.'); }}
                        className={`flex-1 py-4 px-4 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-2 ${manualNotifyType === 'schedule' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10' : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10 hover:text-gray-300'}`}
                    >
                        <Calendar size={20} className={manualNotifyType === 'schedule' ? 'text-indigo-400' : 'text-gray-600'} />
                        Schedule
                    </button>
                </div>
              </div>

              {/* Step 2: Message */}
              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Custom Message</label>
                <textarea
                    value={manualNotifyMessage}
                    onChange={e => setManualNotifyMessage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none"
                    rows={4}
                    placeholder="Add a friendly note for participants..."
                />
              </div>

              {/* Step 3: Rule Selection (Only for Rules type) */}
              {manualNotifyType === 'rules' && (
                <div className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Select Changed Rules</label>
                    <div className="text-[10px] text-purple-300/60 mb-4 bg-purple-500/5 p-3 rounded-xl border border-purple-500/10 leading-relaxed uppercase tracking-tighter">
                        Check the rules that are <strong>NEW</strong> or <strong>CHANGED</strong>. These will be highlighted in yellow in the email.
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                        {manualNotifyEvent.rules && manualNotifyEvent.rules.length > 0 ? (
                            manualNotifyEvent.rules.map((rule: string, idx: number) => {
                                const isStruct = rule.startsWith('__SR__');
                                const display = isStruct ? rule.substring(0, 50) + '...' : rule;
                                
                                return (
                                    <label key={idx} className="flex items-start gap-4 p-4 hover:bg-white/5 cursor-pointer transition-all group">
                                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${manualNotifyHighlights.has(rule) ? 'bg-purple-600 border-purple-500' : 'border-white/20 group-hover:border-white/40'}`}>
                                           {manualNotifyHighlights.has(rule) && <Plus size={12} className="text-white rotate-45" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={manualNotifyHighlights.has(rule)}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setManualNotifyHighlights(prev => {
                                                    const next = new Set(prev);
                                                    if (checked) next.add(rule); else next.delete(rule);
                                                    return next;
                                                });
                                            }}
                                        />
                                        <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors leading-relaxed" dangerouslySetInnerHTML={{ __html: display }} />
                                    </label>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center text-gray-600 italic text-sm">No rules found for this event.</div>
                        )}
                    </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-white/5 bg-white/5 backdrop-blur-md flex flex-col sm:flex-row items-center justify-end gap-4">
              <button 
                  onClick={() => setManualNotifyEvent(null)}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
              >
                  Cancel
              </button>
              <button
                  onClick={sendManualNotification}
                  disabled={sendingManualNotify}
                  className="w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transform active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                  {sendingManualNotify ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                  {sendingManualNotify ? 'Broadcasting...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
};