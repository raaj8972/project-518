import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Mail, Phone, Building, CheckCircle, Users, Plus, Trash2, Zap, Terminal, Shield, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ImageUpload } from './ImageUpload';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventId: number;
  // Optional preview overrides (used by admin preview to show draft site settings/events)
  previewOverrides?: {
    siteSettings?: any;
    events?: any[];
    addRegistration?: (data: any) => Promise<void> | void;
  };
}

interface TeamMember {
  name: string;
  email: string;
  phone: string;
}

interface RegistrationData {
  participant_type: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  is_team_registration: boolean;
  team_name: string;
  team_members: TeamMember[];
  total_members: number;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  eventTitle,
  eventId,
  previewOverrides
}) => {
  const dataCtx = useData() as any;
  // Allow preview overrides to replace context values when provided
  const addRegistration = (previewOverrides?.addRegistration) ?? dataCtx.addRegistration;
  const events = (previewOverrides?.events) ?? dataCtx.events;
  const setSuppressPublicNotifications = dataCtx.setSuppressPublicNotifications;
  const siteSettings = (previewOverrides?.siteSettings) ?? dataCtx.siteSettings;
  // Photo requirement is configured per-event; photo can also be optionally enabled via custom label
  const [photoRequired, setPhotoRequired] = useState<boolean>(false);
  const [photoEnabled, setPhotoEnabled] = useState<boolean>(false);
  type ErrorsMap = Record<string, string | undefined>;
  const [formData, setFormData] = useState<RegistrationData>({
    participant_type: '1st Year',
    full_name: '',
    email: '',
    phone: '',
    college: '',
    is_team_registration: false,
    team_name: '',
    team_members: [{ name: '', email: '', phone: '' }],
    total_members: 1
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [errors, setErrors] = useState<ErrorsMap>({});
  const [glitchActive, setGlitchActive] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  // Quota UI helpers
  const [quotaFullMap, setQuotaFullMap] = useState<Record<string, boolean>>({});
  const [quotaBlocked, setQuotaBlocked] = useState<{ title?: string; message: string } | null>(null);


  // Determine per-event team member requirements. Returns { required, max }
  // If required is set, teams MUST have exactly that many members
  // If not required, teams can have 2 to max members
  const teamLimits = React.useMemo(() => {
    try {
      const ev = events.find((e: any) => e.id === eventId) as any;
      const requiredSize = Number(ev?.team_required_size);
      const maxSize = Number(ev?.team_max_members);
      
      // If exact size is required, return that as both required and max
      if (!Number.isNaN(requiredSize) && requiredSize >= 2) {
        return { required: requiredSize, max: requiredSize };
      }
      
      // Otherwise, flexible team size with max limit
      const limit = !Number.isNaN(maxSize) && maxSize > 0 ? maxSize : 50;
      return { required: null, max: limit };
    } catch {}
    return { required: null, max: 50 }; // default: flexible 2-50
  }, [events, eventId]);


  // Precompute spark vectors when success state appears
  const sparkVectors = useMemo(() => {
    if (!isSubmitted) return [] as Array<{ tx: number; ty: number; delay: number }>;
    return Array.from({ length: 10 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 28;
      return { tx: Math.cos(angle) * radius, ty: Math.sin(angle) * radius, delay: Math.random() * 0.15 };
    });
  }, [isSubmitted]);

  const participantTypes = React.useMemo(() => {
    try {
      // Get global participant types order from site settings
      const globalTypes = (siteSettings as any)?.registration_participant_types;
      
      // Check if this event has specific participant types enabled
      const ev = events.find((e: any) => e.id === eventId) as any;
      const eventEnabledTypes = ev?.registration_participant_types;
      
      // If event has specific types, filter the global list to only show those
      // This preserves the ORDER from Registration Modal Settings
      if (Array.isArray(eventEnabledTypes) && eventEnabledTypes.length && Array.isArray(globalTypes) && globalTypes.length) {
        const enabledSet = new Set(eventEnabledTypes);
        return globalTypes.filter((t: string) => enabledSet.has(t));
      }
      
      // Fall back to global types if no per-event selection
      if (Array.isArray(globalTypes) && globalTypes.length) return globalTypes;
    } catch {}
    
    // Built-in default fallback
    return [
      '1st Year',
      '2nd Year', 
      '3rd Year',
      '4th Year',
      'Intern',
      'PG (Post Graduate)'
    ];
  }, [siteSettings, events, eventId]);

  // Form field visibility/required configuration (site-level defaults can override)
  const fieldConfigMap = useMemo(() => {
    const siteFields = (siteSettings as any)?.registration_form_fields;
    const defaults: Record<string, any> = {
      participant_type: { key: 'participant_type', label: 'Participant Type', type: 'select', visible: true, required: true },
      full_name: { key: 'full_name', label: 'Full Name', type: 'text', visible: true, required: true },
      email: { key: 'email', label: 'Email Address', type: 'email', visible: true, required: true },
      phone: { key: 'phone', label: 'Phone Number', type: 'tel', visible: true, required: true },
      college: { key: 'college', label: 'Institution Name', type: 'text', visible: true, required: false },
      photo: { key: 'photo', label: 'Participant Photo', type: 'photo', visible: Boolean((siteSettings as any)?.registration_photo_default_label), required: Boolean((siteSettings as any)?.registration_photo_default_required) }
    };
    const map: Record<string, any> = { ...defaults };
    if (Array.isArray(siteFields)) {
      siteFields.forEach((f: any) => {
        if (f && f.key) {
          map[f.key] = { ...map[f.key], ...f };
        }
      });
    }

    // Site-wide Institution visibility toggle: owner can hide the field entirely for viewers
    try {
      const vis = (siteSettings as any)?.registration_institution_visible;
      if (vis === false) {
        map.college.visible = false;
        map.college.required = false;
      } else {
        // Respect optional flag from site settings (default false)
        const optional = (siteSettings as any)?.registration_institution_optional === true;
        if (optional) map.college.required = false;
      }
    } catch {}

    // If this modal is opened for a specific event, allow event-level overrides stored on the event
    try {
      const ev = events.find((e: any) => e.id === eventId) as any;
      const evFields = ev?.registration_form_fields;
      if (Array.isArray(evFields)) {
        evFields.forEach((f: any) => {
          if (f && f.key) {
            map[f.key] = { ...map[f.key], ...f };
          }
        });
      }
    } catch {}

    return map;
  }, [siteSettings, events, eventId]);

  // Check if registration mode is locked for this event
  const isModeLocked = useMemo(() => {
    try {
      const ev = events.find((e: any) => e.id === eventId) as any;
      return Boolean(ev?.registration_mode_locked);
    } catch {
      return false;
    }
  }, [events, eventId]);

  // Initialize team/individual mode when modal opens based on event-level default, then site settings, then 'individual'
  useEffect(() => {
    if (!isOpen) return;
    try {
      const ev = events.find((e: any) => e.id === eventId) as any;
      const site = (siteSettings as any) || {};
      const evMode = ev?.registration_default_mode;
      const siteMode = site.registration_default_mode;
      const mode = evMode || siteMode || 'individual';
      setFormData(prev => ({
        ...prev,
        is_team_registration: mode === 'team',
        total_members: mode === 'team' ? Math.max(2, prev.total_members) : 1,
        participant_type: participantTypes && participantTypes.length ? participantTypes[0] : prev.participant_type
      }));
    } catch {}
  }, [isOpen, events, eventId, siteSettings, participantTypes]);

  // Glitch effect trigger and derive per-event photo requirement from events data
  // CRITICAL: Reset submission state when modal opens or event changes
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false); // Reset to allow new submission
      setQuotaBlocked(null); // Clear any previous quota/duplicate errors
    }
  }, [isOpen, eventId]); // Reset when modal opens OR event changes

  useEffect(() => {
    if (isOpen) {
      // Suppress public notifications while registration modal is open
      setSuppressPublicNotifications?.(true);
      try {
  const ev = events.find((e: any) => e.id === eventId) as any;
        const site = (siteSettings as any) || {};
        // Event-level value takes precedence; fallback to siteSettings defaults
        const required = Boolean(ev ? (ev.registration_photo_required ?? site.registration_photo_default_required) : site.registration_photo_default_required);
        setPhotoRequired(required);
        const hasLabel = Boolean(ev ? (ev.registration_photo_label ?? site.registration_photo_default_label) : site.registration_photo_default_label);
        // Show photo UI when required or when a label is present (custom label)
        setPhotoEnabled(Boolean(required || hasLabel));
        if (!required && !hasLabel) {
          // Clear any selected photo and related validation when feature is off
          setPhotoUrl('');
          setErrors(prev => {
            const { photo, ...rest } = prev;
            return rest as any;
          });
        }
      } catch {}
      const glitchTimer = setInterval(() => {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 200);
      }, 12000);
      return () => {
        clearInterval(glitchTimer);
        // On modal close, allow notifications to appear again
        setSuppressPublicNotifications?.(false);
      };
    }
  }, [isOpen, events, eventId]);

  const validateForm = (): boolean => {
    const newErrors: ErrorsMap = {};
    // Validate only fields that are visible
    if (fieldConfigMap.full_name?.visible) {
      if (fieldConfigMap.full_name?.required && !formData.full_name.trim()) {
        newErrors.full_name = 'Full name is required';
      }
    }

    if (fieldConfigMap.email?.visible) {
      if (!formData.email.trim()) {
        if (fieldConfigMap.email?.required) newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (fieldConfigMap.phone?.visible) {
      if (!formData.phone.trim()) {
        if (fieldConfigMap.phone?.required) newErrors.phone = 'Phone number is required';
      } else if (!/^\+?[\d\s\-()]{10,}$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    // Optional/Required photo per-event
    if (photoRequired && !photoUrl) {
      newErrors['photo'] = 'Participant photo is required for this event';
    }

    // Validate placeholder selection for Participant Type
    if (participantTypes && participantTypes.length > 0) {
      const first = participantTypes[0];
      // Heuristic: if the first item contains "select" (case-insensitive) or starts with ".", treat as placeholder
      const isPlaceholder = first.toLowerCase().includes('select') || first.trim().startsWith('.');
      if (isPlaceholder && formData.participant_type === first) {
        newErrors.participant_type = 'Please select a valid option';
      }
    }

    // Institution name validation (if visible)
    if (fieldConfigMap.college?.visible) {
      if (fieldConfigMap.college?.required && !formData.college.trim()) {
        newErrors.college = 'Institution name is required';
      }
    }

    if (formData.is_team_registration) {
      // Team identifier is optional now; do not require team_name here.
      if (formData.total_members < 2) {
        newErrors.total_members = 'Team must have at least 2 members';
      }
      if (formData.total_members > teamLimits.max) {
        const msg = teamLimits.required 
          ? `Teams must have exactly ${teamLimits.required} members for this event`
          : `Team cannot exceed ${teamLimits.max} members for this event`;
        newErrors.total_members = msg;
      }
      
      // If exact size is required, enforce it
      if (teamLimits.required && formData.total_members !== teamLimits.required) {
        newErrors.total_members = `Teams must have exactly ${teamLimits.required} members for this event`;
      }

      formData.team_members.forEach((member, index) => {
        if (!member.name.trim()) {
          newErrors[`team_member_${index}_name`] = 'Member name is required';
        }
        if (!member.phone.trim()) {
          newErrors[`team_member_${index}_phone`] = 'Member phone is required';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Compute which participant types are full for this event (approved-only), based on per-event quotas if set or fallback to site quotas
  useEffect(() => {
    let cancelled = false;
    const ev = (() => { try { return events.find((e: any) => e.id === eventId) as any; } catch { return undefined; } })();
    const eventQuotas = ev?.registration_participant_quotas as Record<string, number> | undefined;
    const siteQuotas = (siteSettings as any)?.registration_participant_quotas as Record<string, number> | undefined;
    const quotas = eventQuotas || siteQuotas;
    if (!isOpen || !quotas) { setQuotaFullMap({}); return; }
    const run = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const results: Record<string, boolean> = {};
        await Promise.all((participantTypes || []).map(async (t) => {
          const maxForType = typeof quotas[t] === 'number' ? quotas[t] : undefined;
          if (maxForType === undefined) { results[t] = false; return; }
          if (maxForType <= 0) { results[t] = true; return; }
          try {
            const { count, error } = await supabase
              .from('registrations')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', eventId)
              .eq('participant_type', t)
              .eq('status', 'approved');
            if (!error && typeof count === 'number' && count >= maxForType) results[t] = true;
            else results[t] = false;
          } catch { results[t] = false; }
        }));
        if (!cancelled) setQuotaFullMap(results);
      } catch (e) {
        console.warn('[RegistrationModal] quota pre-check failed', e);
        if (!cancelled) setQuotaFullMap({});
      } finally {
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isOpen, eventId, participantTypes, siteSettings, events]);

  // If the current selected type becomes full, switch to the first available non-full type
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (quotaFullMap[formData.participant_type]) {
        const firstOpen = (participantTypes || []).find(t => !quotaFullMap[t]);
        if (firstOpen && firstOpen !== formData.participant_type) {
          setFormData(prev => ({ ...prev, participant_type: firstOpen }));
        }
      }
    } catch {}
  }, [quotaFullMap, isOpen]);

  const allTypesFull = useMemo(() => {
    const pts = participantTypes || [];
    if (!pts.length) return false;
    // If there's only a single participant type, don't show the global
    // "All types full" overlay. We'll instead surface a per-type warning
    // and block on submit. This avoids confusion when events intentionally
    // expose just one type which happens to be full.
    if (pts.length <= 1) return false;
    // Show only if quotas are configured at event or site level
    try {
      const ev = events.find((e: any) => e.id === eventId) as any;
      const hasQuotas = Boolean(ev?.registration_participant_quotas) || Boolean((siteSettings as any)?.registration_participant_quotas);
      if (!hasQuotas) return false;
    } catch { return false; }
    return pts.every(t => Boolean(quotaFullMap[t]));
  }, [participantTypes, quotaFullMap, events, eventId, siteSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CRITICAL FIX: Disable button IMMEDIATELY to prevent double-click duplicates
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    if (!validateForm()) {
      setIsSubmitting(false); // Re-enable if validation fails
      return;
    }

    // Check for duplicate registration (same email for same event)
    // Check for duplicate registration (same email OR phone for same event)
    try {
      const { supabase } = await import('../lib/supabase');
      // Using .or() with filter by event_id requires careful grouping to avoid (event_id AND email) OR phone
      // Supabase JS .or() applies to the rows that match previous filters if chained correctly, 
      // but to be safe and explicit with the precedence:
      // We want: event_id = X AND (email = Y OR phone = Z) AND status IN (...)
      
      const { data: existingRegistrations, error: duplicateCheckError } = await supabase
        .from('registrations')
        .select('id, status, full_name, email, phone')
        .eq('event_id', eventId)
        .or(`email.eq.${formData.email.toLowerCase().trim()},phone.eq.${formData.phone.trim()}`)
        // We only care if the previous attempt was approved or pending (if rejected, they can try again?)
        // Usually rejected means rejected, but maybe they want to fix it. 
        // Let's assume 'rejected' allows re-registration unless we want to strict block.
        // For now, blocking pending/approved is the standard "duplicate" prevention.
        .in('status', ['pending', 'approved']);
      
      if (duplicateCheckError) {
        throw duplicateCheckError; // Fail closed if check errors
      }

      if (existingRegistrations && existingRegistrations.length > 0) {
        const existing = existingRegistrations[0];
        const statusText = existing.status === 'approved' ? 'approved' : 'pending approval';
        
        let msg = '';
        if (existing.email.toLowerCase() === formData.email.toLowerCase().trim()) {
           msg = `The email "${formData.email}" has already been registered for this event (Status: ${statusText}).`;
        } else {
           msg = `The phone number "${formData.phone}" has already been registered for this event (Status: ${statusText}).`;
        }
        
        setQuotaBlocked({ 
          title: 'DUPLICATE REGISTRATION', 
          message: `${msg} You can only register once per event. Please contact organizers if this is an error.` 
        });
        setIsSubmitting(false);
        return;
      }
    } catch (e) {
      console.error('[RegistrationModal] duplicate check failed', e);
      // STRICT: If we can't verify uniqueness, do we block?
      // "make sure that no duplicate restration done" -> implies fail-safe.
      // However, network errors shouldn't permanently block.
      // Let's show a generic error to try again.
      setErrors({ submit: 'Unable to verify registration status. Please check your connection and try again.' });
      setIsSubmitting(false);
      return;
    }

      // Enforce participant-type quotas if configured - use server-side RPC for speed
      try {
        const ev = (() => { try { return events.find((e: any) => e.id === eventId) as any; } catch { return undefined; } })();
        const quotas = (ev?.registration_participant_quotas as Record<string, number> | undefined) 
          || ((siteSettings as any)?.registration_participant_quotas as Record<string, number> | undefined);
        const pType = formData.participant_type;
        const maxForType = quotas && typeof quotas[pType] === 'number' ? quotas[pType] : undefined;
        if (typeof maxForType === 'number') {
          // 0 means closed
          if (maxForType <= 0) {
            setQuotaBlocked({ title: 'REGISTRATIONS CLOSED', message: `${pType} is currently closed for this event.` });
            setIsSubmitting(false);
            return;
          }

          // If our pre-check already marked this type as full, block immediately
          if (quotaFullMap[pType]) {
            setQuotaBlocked({ title: 'REGISTRATIONS FULL', message: `Registration is closed for ${pType} in this event.` });
            setIsSubmitting(false);
            return;
          }
          
          // OPTIMIZED: Only use server-side authoritative check (fast, single query)
          try {
            const { supabase } = await import('../lib/supabase');
            const { data: rows } = await supabase.rpc('check_registration_quota', { e_id: eventId, p_type: pType });
            const row = Array.isArray(rows) ? rows[0] : undefined;
            if (row && row.is_full) {
              setQuotaBlocked({ title: 'REGISTRATIONS FULL', message: `Registration is closed for ${pType}. Limit reached (${row.max ?? 'N/A'}).` });
              setIsSubmitting(false);
              return;
            }
          } catch (e) {
            // If server check fails, allow through (fail open for better UX)
            console.warn('[RegistrationModal] Server quota check failed, allowing registration', e);
          }
        }
      } catch {}

    try {
      // Generate sequential registration ID from server (RICO-<n>) with fallback
      let regId = '';
      try {
        // Prefer server-generated sequential ID to avoid collisions across clients
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase.rpc('next_registration_id');
        if (!error && data) {
          regId = String(data);
        }
      } catch {}
      if (!regId) {
        // Fallback client-side unique ID (non-sequential) if RPC not available yet
        regId = `RICO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }
      setRegistrationId(regId);

      // Prepare registration data for Supabase
      const registrationData = {
  id: regId,
        event_id: eventId,
        event_title: eventTitle,
        participant_type: formData.participant_type,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        college: formData.college,
        registration_date: new Date().toISOString(),
        status: 'pending' as const,
        is_team_registration: formData.is_team_registration,
        team_name: formData.is_team_registration ? formData.team_name : null,
        team_members: formData.is_team_registration ? formData.team_members : null,
        total_members: formData.is_team_registration ? formData.total_members : 1,
        photo_url: photoUrl || null
      };

      console.log('Submitting registration data:', registrationData);

      // Submit to Supabase
      await addRegistration(registrationData);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Registration submission error:', err);
      let message = 'Failed to submit registration. Please try again.';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      } else if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        message = (e.message as string) 
          || ((e.error as Record<string, unknown>)?.message as string)
          || (e.details as string)
          || (e.hint as string)
          || (e.code as string)
          || message;
      }
      setErrors({ submit: `Failed to submit registration: ${message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RegistrationData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addTeamMember = () => {
    // Check total_members (leader + team array) against limit, not array length
    if (formData.total_members < teamLimits.max) {
      setFormData(prev => ({
        ...prev,
        team_members: [...prev.team_members, { name: '', email: '', phone: '' }],
        total_members: prev.total_members + 1
      }));
    }
  };

  const removeTeamMember = (index: number) => {
    if (formData.team_members.length > 1) {
      setFormData(prev => ({
        ...prev,
        team_members: prev.team_members.filter((_, i) => i !== index),
        total_members: prev.total_members - 1
      }));
    }
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      team_members: prev.team_members.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
    
    // Clear related errors
    if (errors[`team_member_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`team_member_${index}_${field}`]: undefined }));
    }
  };

  const resetForm = () => {
    setFormData({
      participant_type: '1st Year',
      full_name: '',
      email: '',
      phone: '',
      college: '',
      is_team_registration: false,
      team_name: '',
      team_members: [{ name: '', email: '', phone: '' }],
      total_members: 1
    });
    setErrors({});
    setIsSubmitted(false);
    setRegistrationId('');
  };

  const handleClose = () => {
    resetForm();
    // After closing, re-enable notifications overlay
    setSuppressPublicNotifications?.(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="cyberpunk-modal fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="cyberpunk-card w-full max-w-[95vw] sm:max-w-[500px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-hidden rounded-lg flex flex-col relative">
        
        {/* Cyber Smoke Effect Layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="smoke-blob smoke-1" />
          <div className="smoke-blob smoke-2" />
          <div className="smoke-blob smoke-3" />
        </div>
        <style>{`
          @keyframes smoke-rise {
            0% { transform: translateY(20%) scale(1); opacity: 0; }
            20% { opacity: 0.8; }
            50% { opacity: 0.6; transform: translateY(-40%) scale(1.4); }
            100% { transform: translateY(-100%) scale(1.8); opacity: 0; }
          }
          .smoke-blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(45px);
            animation: smoke-rise 10s infinite ease-in-out;
            bottom: -100px;
            mix-blend-mode: screen;
            will-change: transform, opacity; /* Hardware acceleration hint */
          }
          
          /* Mobile optimization: Reduce expensive blur radius & animation load */
          @media (max-width: 640px) {
            .smoke-blob {
              filter: blur(25px); /* Cheaper blur for mobile GPU */
              opacity: 0.5; /* Slightly subtler on small screens */
            }
          }

          /* Accessibility: Respect simplified motion preferences */
          @media (prefers-reduced-motion: reduce) {
            .smoke-blob {
              animation: none;
              opacity: 0.4;
              transform: translateY(-20%) scale(1.2); /* Static state */
            }
          }

          .smoke-1 {
            width: 350px; height: 350px;
            background: radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 70%); /* Purple */
            left: -10%;
            animation-duration: 12s;
            animation-delay: 0s;
          }
          .smoke-2 {
            width: 450px; height: 450px;
            background: radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%); /* Cyan */
            right: -10%;
            animation-duration: 15s;
            animation-delay: -5s;
          }
          .smoke-3 {
            width: 300px; height: 300px;
            background: radial-gradient(circle, rgba(236,72,153,0.5) 0%, transparent 70%); /* Pink */
            left: 30%;
            animation-duration: 14s;
            animation-delay: -7s;
          }
          /* Ensure form content sits above smoke and has its own stacking context */
          .cyberpunk-header, .cyberpunk-success-container, form {
            position: relative;
            z-index: 10; 
          }
        `}</style>
        
        {/* Header */}
        <div className={`cyberpunk-header p-4 sm:p-6 border-b border-cyan-500/30 flex-shrink-0 ${glitchActive ? 'glitch-active' : ''}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center mb-2">
                <Terminal className="w-4 h-4 text-cyan-400 mr-3" />
                <h2 className="text-base sm:text-lg md:text-xl font-bold font-mono leading-tight">REGISTRATION</h2>
              </div>
              <p className="text-cyan-300 font-mono text-xs sm:text-sm">EVENT: {eventTitle}</p>
              <p className="text-gray-400 text-xs mt-1">Initialize registration protocol. All fields marked with * are required.</p>
            </div>
            <button
              onClick={handleClose}
              className="cyberpunk-btn cyberpunk-btn-danger p-2 flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Success State */}
        {isSubmitted ? (
          <div className="p-4 sm:p-6 text-center flex-1 overflow-y-auto">
            <div className="cyberpunk-success-container">
              <div className="relative w-20 h-20 mx-auto mb-6 success-anim-in">
                <div className="absolute inset-0 success-ring" />
                <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.45)]">
                  <CheckCircle className="w-10 h-10 text-black" />
                </div>
                {sparkVectors.map((v, i) => (
                  <div
                    key={i}
                    className="success-spark"
                    style={{
                      // @ts-expect-error CSS custom props
                      '--tx': `${v.tx}px`,
                      '--ty': `${v.ty}px`,
                      animationDelay: `${v.delay}s`
                    }}
                  />
                ))}
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold cyberpunk-title mb-4">REGISTRATION SUCCESSFUL!</h3>
              <p className="text-cyan-300 mb-4 font-mono text-sm">
                PROTOCOL EXECUTED SUCCESSFULLY FOR <strong className="text-green-400">{eventTitle}</strong>
              </p>
              <div className="cyberpunk-card bg-gray-900/50 p-4 mb-4 border border-green-500/30">
                <div className="grid sm:grid-cols-2 gap-4 text-left font-mono text-sm">
                  <div>
                    <span className="text-cyan-400">REGISTRATION_ID:</span>
                    <div className="text-green-400 font-bold">{registrationId}</div>
                  </div>
                  <div>
                    <span className="text-cyan-400">STATUS:</span>
                    <div className="text-yellow-400 font-bold">PENDING_APPROVAL</div>
                  </div>
                  {formData.is_team_registration && (
                    <>
                      <div>
                        <span className="text-cyan-400">TEAM_NAME:</span>
                        <div className="text-purple-400 font-bold">{formData.team_name}</div>
                      </div>
                      <div>
                        <span className="text-cyan-400">TEAM_SIZE:</span>
                        <div className="text-blue-400 font-bold">{formData.total_members} MEMBERS</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="cyberpunk-btn cyberpunk-btn-primary text-sm px-6 py-3"
              >
                <span className="relative z-10 flex items-center">
                  <Shield className="mr-2" size={20} />
                  CLOSE TERMINAL
                </span>
              </button>
            </div>
          </div>
        ) : quotaBlocked ? (
          <div className="p-4 sm:p-6 text-center flex-1 overflow-y-auto">
            <div className="cyberpunk-success-container">
              <div className="relative w-20 h-20 mx-auto mb-6 success-anim-in">
                <div className="absolute inset-0 success-ring" />
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(234,179,8,0.45)]">
                  <AlertTriangle className="w-10 h-10 text-black" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold cyberpunk-title mb-4">{quotaBlocked.title || 'REGISTRATIONS LIMITED'}</h3>
              <p className="text-cyan-300 mb-6 font-mono text-sm max-w-md mx-auto">{quotaBlocked.message}</p>
              <button
                onClick={handleClose}
                className="cyberpunk-btn cyberpunk-btn-primary text-sm px-6 py-3"
              >
                <span className="relative z-10 flex items-center">
                  <Shield className="mr-2" size={20} />
                  CLOSE
                </span>
              </button>
            </div>
          </div>
        ) : allTypesFull ? (
          <div className="p-4 sm:p-6 text-center flex-1 overflow-y-auto">
            <div className="cyberpunk-success-container">
              <div className="relative w-20 h-20 mx-auto mb-6 success-anim-in">
                <div className="absolute inset-0 success-ring" />
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(234,179,8,0.45)]">
                  <AlertTriangle className="w-10 h-10 text-black" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold cyberpunk-title mb-4">REGISTRATIONS FULL</h3>
              <p className="text-cyan-300 mb-6 font-mono text-sm max-w-md mx-auto">All participant types are full for this event. Please check back later.</p>
              <button
                onClick={handleClose}
                className="cyberpunk-btn cyberpunk-btn-primary text-sm px-6 py-3"
              >
                <span className="relative z-10 flex items-center">
                  <Shield className="mr-2" size={20} />
                  CLOSE
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* Error Display */}
              {errors.submit && (
                <div className="cyberpunk-alert">
                  <span className="text-red-400 text-sm">{errors.submit}</span>
                </div>
              )}

              {/* Registration Type Toggle - Only show when mode is not locked */}
              {!isModeLocked && (
                <div className="cyberpunk-section">
                  <h3 className="text-sm font-bold text-cyan-400 mb-2 font-mono">REGISTRATION_TYPE</h3>
                  <div className="cyberpunk-card w-full p-3 bg-gray-900/30">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <label className="cyberpunk-radio-label">
                        <input
                          type="radio"
                          name="registrationType"
                          checked={!formData.is_team_registration}
                          onChange={() => {
                            handleInputChange('is_team_registration', false);
                            handleInputChange('total_members', 1);
                          }}
                          className="cyberpunk-radio"
                        />
                        <span className="font-mono text-xs sm:text-sm">INDIVIDUAL_MODE</span>
                      </label>
                      <label className="cyberpunk-radio-label">
                        <input
                          type="radio"
                          name="registrationType"
                          checked={formData.is_team_registration}
                          onChange={() => {
                            handleInputChange('is_team_registration', true);
                            handleInputChange('total_members', formData.team_members.length);
                          }}
                          className="cyberpunk-radio"
                        />
                        <span className="font-mono text-xs sm:text-sm">TEAM_MODE</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Name (if team registration) */}
              {formData.is_team_registration && (
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    TEAM_IDENTIFIER (optional)
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.team_name}
                      onChange={(e) => handleInputChange('team_name', e.target.value)}
                      placeholder="Enter team name"
                      className={`cyberpunk-input pl-12 ${errors.team_name ? 'error' : ''}`}
                    />
                  </div>
                  {errors.team_name && (
                    <p className="cyberpunk-error">{errors.team_name}</p>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Participant Type */}
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    {formData.is_team_registration ? 'LEADER_' : ''}PARTICIPANT_TYPE *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <select
                      value={formData.participant_type}
                      onChange={(e) => handleInputChange('participant_type', e.target.value)}
                      className={`cyberpunk-select pl-12 ${errors.participant_type ? 'border-red-500' : ''}`}
                    >
                      {(participantTypes || []).map((type, idx) => {
                        const isFull = Boolean(quotaFullMap[type]);
                        // Check if this is the first item and looks like a placeholder
                        const isPlaceholder = idx === 0 && (type.toLowerCase().includes('select') || type.trim().startsWith('.'));
                        return (
                          <option key={type} value={type} disabled={isFull || isPlaceholder} title={isFull ? 'Full for this event' : ''}>
                            {isFull ? `${type} - FULL` : type}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {errors.participant_type && (
                    <p className="cyberpunk-error">{errors.participant_type}</p>
                  )}
                  {(() => {
                    try {
                      const pType = formData.participant_type;
                      if (pType && quotaFullMap[pType]) {
                        return (
                          <p className="mt-1 text-xs text-amber-400">
                            The selected type is full for this event. Please choose another participant type.
                          </p>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                </div>

                {/* Full Name */}
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    {formData.is_team_registration ? 'LEADER_' : ''}FULL_NAME *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter full name"
                      className={`cyberpunk-input pl-12 ${errors.full_name ? 'error' : ''}`}
                    />
                  </div>
                  {errors.full_name && (
                    <p className="cyberpunk-error">{errors.full_name}</p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Email */}
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    {formData.is_team_registration ? 'LEADER_' : ''}EMAIL_ADDRESS *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="user@domain.com"
                      className={`cyberpunk-input pl-12 ${errors.email ? 'error' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="cyberpunk-error">{errors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    {formData.is_team_registration ? 'LEADER_' : ''}PHONE_NUMBER *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Contact number"
                      className={`cyberpunk-input pl-12 ${errors.phone ? 'error' : ''}`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="cyberpunk-error">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Participant Photo (shown when required OR when a custom label exists). Required validation applies only when required. */}
              {photoEnabled && (
                <div className="cyberpunk-section">
                  {(() => {
                    const ev = events.find((e: any) => e.id === eventId) as any;
                    const site = (siteSettings as any) || {};
                    const custom = ev ? (ev.registration_photo_label ?? site.registration_photo_default_label) : site.registration_photo_default_label;
                    const labelText = custom ? String(custom).trim() : 'PARTICIPANT_PHOTO';
                    return (
                      <label className="cyberpunk-label flex items-center">
                        <ImageIcon className="w-5 h-5 text-cyan-400 mr-2" /> {labelText} {photoRequired ? '*' : ''}
                      </label>
                    );
                  })()}
                  <div className="bg-gray-900/30 p-3 rounded border border-cyan-500/20">
                    <div className="space-y-2">
                      <ImageUpload
                        onImageSelect={(url) => setPhotoUrl(url)}
                        currentImage={photoUrl}
                        bucket="registration-photos"
                        folder={`registrations/${eventId}`}
                        acceptedTypes="image/*"
                        fileTypeLabel="PNG/JPG/WebP up to 60KB"
                        enableCropper={false}
                        autoSave
                        hideControls
                        maxImageBytes={60 * 1024}
                      />
                      {photoUrl && (
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-400">Preview loaded. Tap the image to change.</div>
                          <button
                            type="button"
                            onClick={() => {
                              // Clear current selection to allow choosing a different photo
                              setPhotoUrl('');
                            }}
                            className="cyberpunk-btn cyberpunk-btn-secondary px-3 py-1 text-xs"
                          >
                            CHANGE PHOTO
                          </button>
                        </div>
                      )}
                    </div>
                    {errors['photo'] && <p className="cyberpunk-error mt-2">{errors['photo']}</p>}
                    <p className="text-xs text-gray-400 mt-2">Upload a clear headshot (max 60KB).</p>
                  </div>
                </div>
              )}

              {/* College/Institution (visibility controlled by Site Settings) */}
              {fieldConfigMap.college?.visible && (
                <div className="cyberpunk-section">
                <label className="cyberpunk-label">
                  {(() => {
                    const site = (siteSettings as any) || {};
                    const optional = site.registration_institution_optional === true;
                    return `INSTITUTION_NAME ${optional ? '(OPTIONAL)' : ''}`;
                  })()}
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => handleInputChange('college', e.target.value)}
                    placeholder={(() => {
                      try {
                        const site = (siteSettings as any) || {};
                        return (site.registration_field_placeholders?.college) || 'Your college or institution';
                      } catch { return 'Your college or institution'; }
                    })()}
                    className={`cyberpunk-input pl-12`}
                  />
                </div>
              </div>
              )}

              {/* Team Members (if team registration) */}
              {formData.is_team_registration && (
                <div className="cyberpunk-section">
                  <div className="flex justify-between items-center mb-4">
                    <label className="cyberpunk-label">
                      TEAM_MEMBERS * (TOTAL: {formData.total_members}{teamLimits.required ? ` / REQUIRED ${teamLimits.required}` : teamLimits.max ? ` / MAX ${teamLimits.max}` : ''})
                    </label>
                    <button
                      type="button"
                      onClick={addTeamMember}
                      disabled={formData.total_members >= teamLimits.max}
                      className="cyberpunk-btn cyberpunk-btn-secondary text-xs sm:text-sm"
                    >
                      <span className="relative z-10 flex items-center">
                        <Plus size={16} className="mr-2" />
                        ADD_MEMBER
                      </span>
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto cyberpunk-scrollbar">
                    {formData.team_members.map((member, index) => (
                      <div key={index} className="cyberpunk-card bg-gray-900/30 p-3">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-mono text-cyan-400 text-sm">MEMBER_{index + 1}</h4>
                          {formData.team_members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTeamMember(index)}
                              className="cyberpunk-btn cyberpunk-btn-danger p-1 text-xs"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                              placeholder="Member name"
                              className={`cyberpunk-input text-sm ${errors[`team_member_${index}_name`] ? 'error' : ''}`}
                            />
                            {errors[`team_member_${index}_name`] && (
                              <p className="cyberpunk-error text-xs">{errors[`team_member_${index}_name`]}</p>
                            )}
                          </div>
                          
                          <div>
                            <input
                              type="tel"
                              value={member.phone}
                              onChange={(e) => updateTeamMember(index, 'phone', e.target.value)}
                              placeholder="Member phone"
                              className={`cyberpunk-input text-sm ${errors[`team_member_${index}_phone`] ? 'error' : ''}`}
                            />
                            {errors[`team_member_${index}_phone`] && (
                              <p className="cyberpunk-error text-xs">{errors[`team_member_${index}_phone`]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {errors.total_members && (
                    <p className="cyberpunk-error">{errors.total_members}</p>
                  )}
                  {!errors.total_members && formData.total_members >= teamLimits.max && !teamLimits.required && (
                    <p className="text-xs text-gray-400 mt-1">Team member limit reached for this event.</p>
                  )}
                  {!errors.total_members && teamLimits.required && formData.total_members < teamLimits.required && (
                    <p className="text-xs text-gray-400 mt-1">Add {teamLimits.required - formData.total_members} more member(s) to meet the required team size.</p>
                  )}
                </div>
              )}

              {/* Motivation removed from form */}

              {/* Submit Button */}
              <div className="pt-4 border-t border-cyan-500/30">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`cyberpunk-btn cyberpunk-btn-primary w-full text-sm py-3 ${
                    isSubmitting ? 'submitting cursor-not-allowed' : ''
                  }`}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {isSubmitting ? (
                      <>
                        <div className="cyberpunk-spinner mr-3"></div>
                        <span>EXECUTING...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2" size={20} />
                        <span>EXECUTE {formData.is_team_registration ? 'TEAM_' : ''}REGISTRATION</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style>{`
        .cyberpunk-modal {
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          backdrop-filter: blur(11px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .cyberpunk-card {
          background: rgba(10, 10, 30, 0.95);
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          backdrop-filter: blur(15px);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .cyberpunk-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
          animation: borderGlow 3s ease-in-out infinite;
        }

        @keyframes borderGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .cyberpunk-header {
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1));
          border-bottom: 1px solid rgba(0, 255, 255, 0.3);
        }

        .cyberpunk-title {
          background: linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .glitch-active {
          animation: glitch 0.3s ease-in-out;
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .cyberpunk-section {
          margin-bottom: 1.5rem;
        }

        .cyberpunk-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #00ffff;
          margin-bottom: 0.5rem;
          font-family: 'Orbitron', monospace;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .cyberpunk-input,
        .cyberpunk-select,
        .cyberpunk-textarea {
          width: 100%;
          padding-top: 10px;        /* do not override left padding from Tailwind class */
          padding-bottom: 10px;
          padding-right: 14px;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          color: #ffffff;
          font-family: 'Orbitron', monospace;
          transition: all 0.3s ease;
          font-size: 0.8rem;
          line-height: 1.25rem;
          min-height: 44px; /* ensure enough height so icon and text never overlap */
          display: inline-flex;
          align-items: center; /* vertically center placeholder/value */
        }

        /* Normalize native select look and keep enough right padding for caret */
        .cyberpunk-select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          padding-right: 2.25rem; /* space for system arrow */
          background-image: none;
        }
        
        @media (min-width: 640px) {
          .cyberpunk-input,
          .cyberpunk-select,
          .cyberpunk-textarea {
            padding-top: 12px;
            padding-bottom: 12px;
            padding-right: 16px;
            font-size: 0.9rem;
            min-height: 48px;
          }
        }

        .cyberpunk-input:focus,
        .cyberpunk-select:focus,
        .cyberpunk-textarea:focus {
          outline: none;
          border-color: rgba(0, 255, 255, 0.8);
          box-shadow: 
            0 0 15px rgba(0, 255, 255, 0.3),
            inset 0 0 15px rgba(0, 255, 255, 0.1);
        }

        .cyberpunk-input::placeholder,
        .cyberpunk-textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
        }

        /* Snappier spinner for submit feedback */
        .cyberpunk-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(0,255,255,0.25);
          border-top-color: rgba(0,255,255,0.9);
          border-radius: 50%;
          animation: spin .6s linear infinite;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg);} }

        /* Success completion animations (mobile-friendly) */
        .success-anim-in { animation: successIn 420ms cubic-bezier(.2,.9,.2,1) both; }
        @keyframes successIn { from { transform: scale(.9); opacity: 0; filter: blur(2px);} to { transform: scale(1); opacity: 1; filter: blur(0);} }
        .success-ring { position: absolute; inset: -24px; border-radius: 9999px; box-shadow: 0 0 0 0 rgba(34,197,94,0.5); animation: ringPulse 900ms ease-out 1; }
        @keyframes ringPulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5);} 100% { box-shadow: 0 0 0 28px rgba(34,197,94,0);} }
        .success-spark { position: absolute; left: 50%; top: 50%; width: 3px; height: 3px; margin-left: -1.5px; margin-top: -1.5px; background: linear-gradient(90deg, #22c55e, #0e7490); border-radius: 50%; filter: drop-shadow(0 0 8px rgba(34,197,94,0.7)); animation: spark 600ms ease-out forwards; }
        @keyframes spark { 0% { transform: translate(0,0) scale(1); opacity: 1; } 80% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0.15); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .success-anim-in, .success-ring, .success-spark { animation: none !important; }
        }

        .cyberpunk-input.error,
        .cyberpunk-select.error,
        .cyberpunk-textarea.error {
          border-color: rgba(255, 0, 100, 0.8);
          box-shadow: 
            0 0 15px rgba(255, 0, 100, 0.3),
            inset 0 0 15px rgba(255, 0, 100, 0.1);
        }

        .cyberpunk-error {
          color: #ff0064;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          font-family: 'Orbitron', monospace;
        }

        .cyberpunk-alert {
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }

        .cyberpunk-radio-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          color: #00ffff;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .cyberpunk-radio-label:hover {
          color: #ff00ff;
        }

        .cyberpunk-radio {
          margin-right: 0.75rem;
          accent-color: #00ffff;
        }

        .cyberpunk-btn {
          position: relative;
          padding: 8px 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 2px solid;
          background: transparent;
          overflow: hidden;
          transition: all 0.3s ease;
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 100%, 8px 100%);
          font-family: 'Orbitron', monospace;
          font-size: 0.7rem;
        }
        
        @media (min-width: 640px) {
          .cyberpunk-btn {
            padding: 12px 24px;
            clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 100%, 15px 100%);
            font-size: 0.8rem;
          }
        }

        .cyberpunk-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .cyberpunk-btn:hover::before {
          left: 100%;
        }

        .cyberpunk-btn-primary {
          border-color: #00ffff;
          color: #00ffff;
          box-shadow: 
            0 0 15px rgba(0, 255, 255, 0.2),
            inset 0 0 15px rgba(0, 255, 255, 0.05);
        }

        .cyberpunk-btn-primary:hover {
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 
            0 0 25px rgba(0, 255, 255, 0.4),
            inset 0 0 25px rgba(0, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        /* Animated submitting state for primary button */
        .cyberpunk-btn-primary.submitting {
          background-image: linear-gradient(120deg, rgba(14,116,144,0.18) 25%, rgba(91,33,182,0.18) 50%, rgba(14,116,144,0.18) 75%);
          background-size: 200% 100%;
          animation: btnShimmer 1.1s linear infinite;
        }
        .cyberpunk-btn-primary.submitting::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 30%;
          background: linear-gradient(90deg, #0e7490, #5b21b6, #0e7490);
          box-shadow: 0 0 10px rgba(14,116,144,0.6), 0 0 16px rgba(91,33,182,0.45);
          animation: btnLoadingBar 1.2s ease-in-out infinite;
        }
        @keyframes btnShimmer {
          0% { background-position-x: 200%; }
          100% { background-position-x: -200%; }
        }
        @keyframes btnLoadingBar {
          0% { transform: translateX(-30%); }
          100% { transform: translateX(130%); }
        }

        .cyberpunk-btn-secondary {
          border-color: #ff00ff;
          color: #ff00ff;
          box-shadow: 
            0 0 15px rgba(255, 0, 255, 0.2),
            inset 0 0 15px rgba(255, 0, 255, 0.05);
        }

        .cyberpunk-btn-secondary:hover {
          background: rgba(255, 0, 255, 0.1);
          box-shadow: 
            0 0 25px rgba(255, 0, 255, 0.4),
            inset 0 0 25px rgba(255, 0, 255, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-btn-danger {
          border-color: #ff0064;
          color: #ff0064;
          box-shadow: 
            0 0 15px rgba(255, 0, 100, 0.2),
            inset 0 0 15px rgba(255, 0, 100, 0.05);
        }

        .cyberpunk-btn-danger:hover {
          background: rgba(255, 0, 100, 0.1);
          box-shadow: 
            0 0 25px rgba(255, 0, 100, 0.4),
            inset 0 0 25px rgba(255, 0, 100, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid #00ffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .cyberpunk-success-container {
          animation: successPulse 2s ease-in-out;
        }

        @keyframes successPulse {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .pulse-ring {
          position: relative;
        }

        .pulse-ring::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: pulseRing 2s ease-out infinite;
        }

        @keyframes pulseRing {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        .cyberpunk-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #00ffff #1a1a2e;
        }

        .cyberpunk-scrollbar::-webkit-scrollbar {
          width: 5px;
        }

        .cyberpunk-scrollbar::-webkit-scrollbar-track {
          background: #1a1a2e;
          border-radius: 4px;
        }

        .cyberpunk-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #ff00ff, #00ffff);
          border-radius: 6px;
        }

        .cyberpunk-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #00ffff, #ff00ff);
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .cyberpunk-btn {
            padding: 8px 16px;
            font-size: 0.7rem;
          }
          
          .cyberpunk-input,
          .cyberpunk-select,
          .cyberpunk-textarea {
            font-size: 0.75rem;
            padding-top: 8px;
            padding-bottom: 8px;
            padding-right: 12px;
            min-height: 42px;
          }
          
          .cyberpunk-label {
            font-size: 0.7rem;
          }
          
          .cyberpunk-section {
            margin-bottom: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .cyberpunk-modal {
            padding: 0.5rem;
          }
          
          .cyberpunk-card {
            border-radius: 4px;
          }
          
          .cyberpunk-btn {
            padding: 6px 12px;
            font-size: 0.65rem;
            clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 100%, 5px 100%);
          }
        }
      `}</style>
    </div>
  );
};