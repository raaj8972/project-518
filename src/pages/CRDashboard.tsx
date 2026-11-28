import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  CreditCard,
  Inbox,
  Loader2,
  LogOut,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Square,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as supabaseModule from '../lib/supabase';
const { supabase } = supabaseModule;
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { BrandMark } from '../components/BrandMark';
import { CRIqmgModal, type CRIqmgSubmitPayload } from '../components/cr/CRIqmgModal';
import '../styles/CRPortal.css';

export type IQMGStatus = 'pending' | 'verified' | 'correction_required';

export interface CRStudentProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  college: string | null;
  batch: string | null;
  participant_type?: string | null;
  is_approved: boolean | null;
  avatar_url: string | null;
  created_at?: string | null;
  iqmg_number?: string | null;
  iqmg_status?: IQMGStatus | null;
  iqmg_note?: string | null;
}

interface IQMGIdentityEntry {
  iqmg_number: string | null;
  status: IQMGStatus | null;
  note: string | null;
}

type ApprovalTab = 'pending' | 'approved' | 'all';
type SortMode = 'name' | 'newest';

interface CRSession {
  batch: string;
  authenticated?: boolean;
  expiresAt?: string;
}

function getInitials(name: string | null | undefined): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'S';
  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

function normalizeIqmgSearch(value: string | null | undefined): string {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeIqmgStatus(value: unknown): IQMGStatus | null {
  return value === 'pending' || value === 'verified' || value === 'correction_required' ? value : null;
}

function formatJoinedDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(parsed);
}

function formatSyncTime(value: Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(value);
}

function toPhoneHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length >= 6 ? `tel:${cleaned}` : null;
}

function isMissingBatchRpcError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = String((err as { code?: unknown }).code || '');
  const message = String((err as { message?: unknown }).message || '');
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    /could not find the function|does not exist/i.test(message)
  );
}

function isSessionRejectedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = Number((err as { status?: unknown }).status || 0);
  const code = String((err as { code?: unknown }).code || '');
  const message = String((err as { message?: unknown }).message || '');
  return (
    status === 401 ||
    status === 403 ||
    code === 'PGRST301' ||
    /invalid cr credentials|valid cr session|jwt|not authenticated|session.*expired/i.test(message)
  );
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message;
  }
  return fallback;
}

function toCRStudentProfile(raw: unknown): CRStudentProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id) return null;
  return {
    id: record.id,
    full_name: typeof record.full_name === 'string' ? record.full_name : null,
    username: typeof record.username === 'string' ? record.username : null,
    phone: typeof record.phone === 'string' ? record.phone : null,
    college: typeof record.college === 'string' ? record.college : null,
    batch: typeof record.batch === 'string' ? record.batch : null,
    participant_type: typeof record.participant_type === 'string' ? record.participant_type : null,
    is_approved: typeof record.is_approved === 'boolean' ? record.is_approved : Boolean(record.is_approved),
    avatar_url: typeof record.avatar_url === 'string' ? record.avatar_url : null,
    created_at: typeof record.created_at === 'string' ? record.created_at : null,
    iqmg_number: typeof record.iqmg_number === 'string' && record.iqmg_number.trim() ? record.iqmg_number.trim() : null,
    iqmg_status: normalizeIqmgStatus(record.iqmg_status),
  };
}

const StudentAvatar: React.FC<{ name: string | null; avatarUrl: string | null; isApproved: boolean }> = ({
  name,
  avatarUrl,
  isApproved,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  const trimmedUrl = (avatarUrl || '').trim();
  const initials = getInitials(name);

  return (
    <div className={`cr-avatar${isApproved ? ' is-approved' : ''}`} aria-hidden="true">
      {trimmedUrl && !failed ? (
        <img
          src={trimmedUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export const CRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<CRSession | null>(null);
  const [profiles, setProfiles] = useState<CRStudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [liveSyncActive, setLiveSyncActive] = useState(false);
  const [activeTab, setActiveTab] = useState<ApprovalTab>('pending');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [iqmgTarget, setIqmgTarget] = useState<CRStudentProfile | null>(null);
  const [iqmgSaving, setIqmgSaving] = useState(false);
  const [iqmgModalError, setIqmgModalError] = useState<string | null>(null);

  const knownIdsRef = useRef<Set<string> | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const iqmgByUserRef = useRef<Map<string, IQMGIdentityEntry>>(new Map());
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const syncQueuedRef = useRef(false);
  const lastSyncMsRef = useRef<number>(0);
  const batchRef = useRef<string | null>(null);
  batchRef.current = session?.batch ?? null;

  const searchInputId = useId();
  const sortSelectId = useId();
  const pendingTabId = useId();
  const approvedTabId = useId();
  const allTabId = useId();

  const redirectExpiredSession = useCallback((message = 'Session expired. Please login again.') => {
    accessTokenRef.current = null;
    sessionStorage.removeItem('cr_session');
    toast.error(message);
    navigate('/cr/login');
  }, [navigate]);

  // Verify stored CR session and active Supabase CR JWT
  useEffect(() => {
    let active = true;
    const stored = sessionStorage.getItem('cr_session');
    if (!stored) {
      navigate('/cr/login');
      return;
    }

    try {
      const data = JSON.parse(stored) as CRSession;
      if (!data?.batch || (data.expiresAt && new Date(data.expiresAt) < new Date())) {
        redirectExpiredSession('Session expired. Please login again.');
        return;
      }

      void supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
        if (!active) return;
        if (
          !activeSession ||
          activeSession.user.app_metadata?.role !== 'cr' ||
          activeSession.user.app_metadata.cr_batch !== data.batch
        ) {
          accessTokenRef.current = null;
          sessionStorage.removeItem('cr_session');
          navigate('/cr/login');
          return;
        }
        accessTokenRef.current = activeSession.access_token || null;
        setSession(data);
      });

      const subscriptionResult = supabase.auth.onAuthStateChange?.((event, activeSession) => {
        if (!active) return;
        if (
          event === 'SIGNED_OUT' ||
          !activeSession ||
          activeSession.user.app_metadata?.role !== 'cr' ||
          activeSession.user.app_metadata.cr_batch !== data.batch
        ) {
          accessTokenRef.current = null;
          sessionStorage.removeItem('cr_session');
          navigate('/cr/login');
          return;
        }
        accessTokenRef.current = activeSession.access_token || null;
      });

      return () => {
        active = false;
        subscriptionResult?.data?.subscription?.unsubscribe();
      };
    } catch {
      accessTokenRef.current = null;
      sessionStorage.removeItem('cr_session');
      navigate('/cr/login');
    }
    return () => {
      active = false;
    };
  }, [navigate, redirectExpiredSession]);

  // Fetch student IQMG numbers for this CR's batch via the batch-scoped server endpoint
  const fetchBatchIqmg = useCallback(
    async (targetBatch: string, userIds?: string[]) => {
      const token = accessTokenRef.current;
      if (!token) return;

      const endpoint =
        userIds && userIds.length > 0
          ? `/api/cr-batch-iqmg?userIds=${encodeURIComponent(userIds.join(','))}`
          : '/api/cr-batch-iqmg';

      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (batchRef.current !== targetBatch) return;

        if (response.status === 401) {
          redirectExpiredSession('Your CR session is no longer active. Please sign in again.');
          return;
        }
        if (!response.ok) return;

        const payload = (await response.json()) as {
          batch?: unknown;
          identities?: Record<string, { iqmg_number?: unknown; status?: unknown; note?: unknown }>;
        };
        if (batchRef.current !== targetBatch) return;
        if (typeof payload?.batch === 'string' && payload.batch !== targetBatch) return;
        if (!payload?.identities || typeof payload.identities !== 'object') return;

        const nextMap = userIds ? new Map(iqmgByUserRef.current) : new Map<string, IQMGIdentityEntry>();
        if (userIds) {
          for (const id of userIds) {
            const raw = payload.identities[id];
            if (!raw) {
              nextMap.delete(id);
            } else {
              nextMap.set(id, {
                iqmg_number: typeof raw.iqmg_number === 'string' && raw.iqmg_number.trim() ? raw.iqmg_number.trim() : null,
                status: normalizeIqmgStatus(raw.status),
                note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : null,
              });
            }
          }
        } else {
          for (const [userId, raw] of Object.entries(payload.identities)) {
            if (!userId || !raw) continue;
            nextMap.set(userId, {
              iqmg_number: typeof raw.iqmg_number === 'string' && raw.iqmg_number.trim() ? raw.iqmg_number.trim() : null,
              status: normalizeIqmgStatus(raw.status),
              note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : null,
            });
          }
        }
        iqmgByUserRef.current = nextMap;

        setProfiles(prev => {
          if (!prev.length) return prev;
          let changed = false;
          const next = prev.map(item => {
            const entry = nextMap.get(item.id);
            const nextNum = entry ? entry.iqmg_number : null;
            const nextStatus = entry ? entry.status : null;
            const nextNote = entry ? entry.note : null;
            if (!userIds && !entry && item.iqmg_number == null && item.iqmg_status == null && item.iqmg_note == null) {
              return item;
            }
            if (!entry && userIds && !userIds.includes(item.id)) {
              return item;
            }
            if (
              (item.iqmg_number ?? null) === nextNum &&
              (item.iqmg_status ?? null) === nextStatus &&
              (item.iqmg_note ?? null) === nextNote
            ) {
              return item;
            }
            changed = true;
            return {
              ...item,
              iqmg_number: nextNum,
              iqmg_status: nextStatus,
              iqmg_note: nextNote,
            };
          });
          return changed ? next : prev;
        });
      } catch {
        // Ignore transient network errors for IQMG enrichment so verification actions keep working
      }
    },
    [redirectExpiredSession]
  );

  // Fetch all student profiles belonging to this CR's batch (supports silent background sync)
  const fetchProfiles = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const targetBatch = session?.batch;
      if (!targetBatch) return;

      if (syncInFlightRef.current) {
        syncQueuedRef.current = true;
        return syncInFlightRef.current;
      }

      const runSync = async () => {
        if (!silent) {
          setLoading(true);
          setFetchError(null);
        }
        try {
          const iqmgTask = fetchBatchIqmg(targetBatch);
          const allProfiles: CRStudentProfile[] = [];
          const pageSize = 500;
          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, full_name, username, phone, college, batch, participant_type, is_approved, avatar_url, created_at')
              .eq('batch', targetBatch)
              .order('full_name', { ascending: true })
              .order('id', { ascending: true })
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            const rows = (data || []) as CRStudentProfile[];
            allProfiles.push(...rows);
            if (rows.length < pageSize) break;
          }

          if (batchRef.current !== targetBatch) return;

          if (allProfiles.length > 0) {
            await iqmgTask;
          }
          if (batchRef.current !== targetBatch) return;

          const scopedProfiles = allProfiles
            .filter(item => item.batch === targetBatch)
            .map(item => {
              const entry = iqmgByUserRef.current.get(item.id);
              if (!entry) return item;
              return {
                ...item,
                iqmg_number: entry.iqmg_number,
                iqmg_status: entry.status,
                iqmg_note: entry.note,
              };
            });
          const validIds = new Set(scopedProfiles.map(item => item.id));
          if (silent && knownIdsRef.current) {
            let addedCount = 0;
            validIds.forEach(id => {
              if (!knownIdsRef.current!.has(id)) addedCount += 1;
            });
            if (addedCount > 0) {
              toast.success(`${addedCount} new ${addedCount === 1 ? 'student' : 'students'} synced.`);
            }
          }
          knownIdsRef.current = validIds;
          lastSyncMsRef.current = Date.now();

          setProfiles(scopedProfiles);
          setFetchError(null);
          setLastSyncedAt(new Date());
          setSelectedIds(prev => {
            if (!prev.size) return prev;
            const next = new Set<string>();
            prev.forEach(id => {
              if (validIds.has(id)) next.add(id);
            });
            return next;
          });
        } catch (err: unknown) {
          if (isSessionRejectedError(err)) {
            redirectExpiredSession('Your CR session is no longer active. Please sign in again.');
            return;
          }
          if (!silent) {
            const message = errorMessage(err, 'Could not load student profiles.');
            setFetchError(message);
            toast.error('Error fetching student profiles: ' + message);
          }
        } finally {
          if (!silent) setLoading(false);
        }
      };

      const task = runSync().finally(() => {
        if (syncInFlightRef.current === task) {
          syncInFlightRef.current = null;
        }
        if (syncQueuedRef.current && batchRef.current === targetBatch) {
          syncQueuedRef.current = false;
          void fetchProfiles({ silent: true });
        }
      });

      syncInFlightRef.current = task;
      return task;
    },
    [session?.batch, fetchBatchIqmg, redirectExpiredSession]
  );

  // Initial load + batch-scoped Realtime subscription (patches state directly with zero extra SELECTs)
  useEffect(() => {
    const batchName = session?.batch;
    if (!batchName) return;

    knownIdsRef.current = null;
    iqmgByUserRef.current = new Map();
    lastSyncMsRef.current = 0;
    setProfiles([]);
    setSelectedIds(new Set());
    void fetchProfiles({ silent: false });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleSilentSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void fetchProfiles({ silent: true });
      }, 300);
    };

    const pendingIqmgIds = new Set<string>();
    let iqmgTimer: ReturnType<typeof setTimeout> | null = null;
    const queueIncrementalIqmg = (userId: string) => {
      if (!accessTokenRef.current) return;
      pendingIqmgIds.add(userId);
      if (iqmgTimer) clearTimeout(iqmgTimer);
      iqmgTimer = setTimeout(() => {
        const ids = Array.from(pendingIqmgIds);
        pendingIqmgIds.clear();
        for (let i = 0; i < ids.length; i += 100) {
          void fetchBatchIqmg(batchName, ids.slice(i, i + 100));
        }
      }, 800);
    };

    const removeProfileLocally = (profileId: string) => {
      knownIdsRef.current?.delete(profileId);
      pendingIqmgIds.delete(profileId);
      iqmgByUserRef.current.delete(profileId);
      setProfiles(prev => prev.filter(item => item.id !== profileId));
      setSelectedIds(prev => {
        if (!prev.has(profileId)) return prev;
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
      lastSyncMsRef.current = Date.now();
      setLastSyncedAt(new Date());
    };

    const realtimeSupported =
      typeof supabaseModule.isRealtimeSupported === 'function' ? supabaseModule.isRealtimeSupported() : true;
    const channel =
      realtimeSupported && typeof supabase.channel === 'function'
        ? supabase
            .channel(`cr-batch-${batchName}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'profiles', filter: `batch=eq.${batchName}` },
              payload => {
                if (batchRef.current !== batchName) return;
                const eventType = (payload as { eventType?: string })?.eventType;
                if (eventType === 'DELETE') {
                  const deletedId = (payload as { old?: { id?: unknown } })?.old?.id;
                  if (typeof deletedId === 'string' && deletedId) {
                    removeProfileLocally(deletedId);
                  }
                  return;
                }

                const incoming = toCRStudentProfile((payload as { new?: unknown })?.new);
                if (!incoming) {
                  if (eventType) scheduleSilentSync();
                  return;
                }

                // Defense in depth: ignore records outside this CR's batch and remove if moved out
                if (incoming.batch !== batchName) {
                  if (knownIdsRef.current?.has(incoming.id)) {
                    removeProfileLocally(incoming.id);
                  }
                  return;
                }

                const known = knownIdsRef.current;
                const wasKnown = known ? known.has(incoming.id) : false;
                if (known) known.add(incoming.id);

                const storedIqmg = iqmgByUserRef.current.get(incoming.id);
                const resolvedIqmgNumber = incoming.iqmg_number ?? storedIqmg?.iqmg_number ?? null;

                setProfiles(prev => {
                  const index = prev.findIndex(item => item.id === incoming.id);
                  if (index >= 0) {
                    const updated = [...prev];
                    updated[index] = {
                      ...incoming,
                      iqmg_number: incoming.iqmg_number ?? prev[index].iqmg_number ?? storedIqmg?.iqmg_number ?? null,
                      iqmg_status: incoming.iqmg_status ?? prev[index].iqmg_status ?? storedIqmg?.status ?? null,
                      iqmg_note: incoming.iqmg_note ?? prev[index].iqmg_note ?? storedIqmg?.note ?? null,
                    };
                    return updated;
                  }
                  return [
                    ...prev,
                    {
                      ...incoming,
                      iqmg_number: resolvedIqmgNumber,
                      iqmg_status: incoming.iqmg_status ?? storedIqmg?.status ?? null,
                      iqmg_note: incoming.iqmg_note ?? storedIqmg?.note ?? null,
                    },
                  ];
                });
                lastSyncMsRef.current = Date.now();
                setLastSyncedAt(new Date());
                if (known && !wasKnown) {
                  toast.success('1 new student synced.');
                }
                if (!wasKnown || !resolvedIqmgNumber) {
                  queueIncrementalIqmg(incoming.id);
                }
              }
            )
            .subscribe(status => {
              setLiveSyncActive(status === 'SUBSCRIBED');
            })
        : null;

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (iqmgTimer) clearTimeout(iqmgTimer);
      setLiveSyncActive(false);
      if (channel && typeof supabase.removeChannel === 'function') {
        void supabase.removeChannel(channel);
      }
    };
  }, [session?.batch, fetchProfiles, fetchBatchIqmg]);

  // Cooldown-gated visibility/focus sync, plus fallback polling only while Realtime is inactive
  useEffect(() => {
    if (!session?.batch) return;

    const maybeSilentSync = (cooldownMs: number) => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastSyncMsRef.current < cooldownMs) return;
      void fetchProfiles({ silent: true });
    };

    const handleVisible = () => maybeSilentSync(liveSyncActive ? 60000 : 20000);
    const handleFocus = () => maybeSilentSync(liveSyncActive ? 60000 : 20000);

    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleFocus);

    const pollInterval = liveSyncActive
      ? null
      : setInterval(() => {
          maybeSilentSync(25000);
        }, 30000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session?.batch, fetchProfiles, liveSyncActive]);

  // Execute batch approval using cr_approve_batch_profiles, falling back to per-student RPC if unavailable
  const executeBatchApproval = useCallback(
    async (studentIds: string[], approve: boolean): Promise<{ succeededIds: string[]; failedCount: number }> => {
      const { error } = await supabase.rpc('cr_approve_batch_profiles', {
        p_student_ids: studentIds,
        p_is_approved: approve,
      });
      if (!error) {
        return { succeededIds: studentIds, failedCount: 0 };
      }
      if (!isMissingBatchRpcError(error)) {
        throw error;
      }

      const batchName = session?.batch || '';
      const succeededIds: string[] = [];
      let failedCount = 0;
      let sessionError: unknown = null;
      const concurrency = 5;

      for (let i = 0; i < studentIds.length; i += concurrency) {
        const chunk = studentIds.slice(i, i + concurrency);
        const results = await Promise.allSettled(
          chunk.map(async id => {
            const { error: singleError } = await supabase.rpc('approve_student_profile', {
              p_student_id: id,
              p_batch: batchName,
              p_password: '',
              p_is_approved: approve,
            });
            if (singleError) throw singleError;
            return id;
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            succeededIds.push(result.value);
          } else {
            failedCount += 1;
            if (!sessionError && isSessionRejectedError(result.reason)) {
              sessionError = result.reason;
            }
          }
        }
        if (sessionError) throw sessionError;
      }

      return { succeededIds, failedCount };
    },
    [session?.batch]
  );

  // Single profile approval / revocation
  const handleToggleApproval = async (profileId: string, currentStatus: boolean) => {
    if (bulkBusy || busyIds.has(profileId)) return;
    setBusyIds(prev => new Set(prev).add(profileId));
    const nextStatus = !currentStatus;
    try {
      const { error } = await supabase.rpc('approve_student_profile', {
        p_student_id: profileId,
        p_batch: session?.batch || '',
        p_password: '',
        p_is_approved: nextStatus,
      });
      if (error) throw error;
      toast.success(currentStatus ? 'Approval revoked.' : 'Student profile approved.');
      setProfiles(prev => prev.map(p => (p.id === profileId ? { ...p, is_approved: nextStatus } : p)));
      setSelectedIds(prev => {
        if (!prev.has(profileId)) return prev;
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    } catch (err: unknown) {
      if (isSessionRejectedError(err)) {
        redirectExpiredSession('Your CR session expired or was revoked. Please sign in again.');
        return;
      }
      toast.error('Failed to update approval status: ' + errorMessage(err, 'Try again.'));
    } finally {
      setBusyIds(prev => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  };

  const handleOpenIqmgModal = (student: CRStudentProfile) => {
    if (bulkBusy || iqmgSaving) return;
    setIqmgModalError(null);
    setIqmgTarget(student);
  };

  const handleSaveIqmg = async (payload: CRIqmgSubmitPayload) => {
    if (!iqmgTarget || !session?.batch || iqmgSaving) return;

    let token = accessTokenRef.current;
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || null;
      accessTokenRef.current = token;
    }
    if (!token) {
      setIqmgTarget(null);
      redirectExpiredSession('Your CR session is no longer active. Please sign in again.');
      return;
    }

    setIqmgSaving(true);
    setIqmgModalError(null);
    try {
      const response = await fetch('/api/cr-manage-iqmg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: iqmgTarget.id,
          batch: session.batch,
          action: payload.action,
          iqmgNumber: payload.iqmgNumber,
          note: payload.note,
        }),
      });

      if (response.status === 401) {
        setIqmgTarget(null);
        redirectExpiredSession('Your CR session is no longer active. Please sign in again.');
        return;
      }

      const result = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        iqmg_number?: unknown;
        status?: unknown;
        note?: unknown;
      };

      if (!response.ok) {
        setIqmgModalError(typeof result?.error === 'string' && result.error ? result.error : 'Unable to save IQMG update.');
        return;
      }

      const nextNumber = typeof result.iqmg_number === 'string' && result.iqmg_number.trim()
        ? result.iqmg_number.trim()
        : null;
      const nextStatus = normalizeIqmgStatus(result.status);
      const nextNote = typeof result.note === 'string' && result.note.trim() ? result.note.trim() : null;

      iqmgByUserRef.current.set(iqmgTarget.id, {
        iqmg_number: nextNumber,
        status: nextStatus,
        note: nextNote,
      });

      const targetId = iqmgTarget.id;
      const targetName = iqmgTarget.full_name?.trim() || 'student';
      setProfiles(prev =>
        prev.map(item =>
          item.id === targetId
            ? {
                ...item,
                iqmg_number: nextNumber,
                iqmg_status: nextStatus,
                iqmg_note: nextNote,
              }
            : item
        )
      );
      setIqmgTarget(null);
      toast.success(
        payload.action === 'update'
          ? `Updated IQMG number for ${targetName}.`
          : `Correction popup sent to ${targetName}.`
      );
    } catch (err: unknown) {
      setIqmgModalError(errorMessage(err, 'Unable to update IQMG right now.'));
    } finally {
      setIqmgSaving(false);
    }
  };

  // Bulk approve or revoke a list of student IDs
  const handleBatchAction = async (targetIds: string[], approve: boolean) => {
    if (!targetIds.length || bulkBusy) return;
    setBulkBusy(true);
    try {
      const { succeededIds, failedCount } = await executeBatchApproval(targetIds, approve);
      if (succeededIds.length > 0) {
        const updatedSet = new Set(succeededIds);
        setProfiles(prev => prev.map(p => (updatedSet.has(p.id) ? { ...p, is_approved: approve } : p)));
        setSelectedIds(prev => {
          const next = new Set(prev);
          succeededIds.forEach(id => next.delete(id));
          return next;
        });
      }
      setConfirmBulkOpen(false);
      if (failedCount > 0 && succeededIds.length > 0) {
        toast.error(`Updated ${succeededIds.length} profiles; ${failedCount} could not be updated.`);
      } else if (failedCount > 0) {
        toast.error('Bulk update failed. Please try again.');
      } else {
        toast.success(
          approve
            ? `Approved ${succeededIds.length} student ${succeededIds.length === 1 ? 'profile' : 'profiles'}.`
            : `Revoked approval for ${succeededIds.length} student ${succeededIds.length === 1 ? 'profile' : 'profiles'}.`
        );
      }
    } catch (err: unknown) {
      if (isSessionRejectedError(err)) {
        redirectExpiredSession('Your CR session expired or was revoked. Please sign in again.');
        return;
      }
      toast.error('Bulk approval failed: ' + errorMessage(err, 'Try again.'));
    } finally {
      setBulkBusy(false);
    }
  };

  const handleSignOut = () => {
    accessTokenRef.current = null;
    iqmgByUserRef.current = new Map();
    sessionStorage.removeItem('cr_session');
    toast.success('Signed out.');
    void supabase.auth.signOut().finally(() => navigate('/cr/login'));
  };

  const toggleSelectId = (profileId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const filteredProfiles = useMemo(() => {
    const base = profiles.filter(p => {
      if (activeTab === 'pending') return !p.is_approved;
      if (activeTab === 'approved') return Boolean(p.is_approved);
      return true;
    });

    const q = searchQuery.trim().toLowerCase();
    const normalizedQ = normalizeIqmgSearch(searchQuery);
    const matched = !q
      ? base
      : base.filter(
          p =>
            p.full_name?.toLowerCase().includes(q) ||
            p.username?.toLowerCase().includes(q) ||
            p.phone?.toLowerCase().includes(q) ||
            p.college?.toLowerCase().includes(q) ||
            p.iqmg_number?.toLowerCase().includes(q) ||
            (normalizedQ.length >= 3 && normalizeIqmgSearch(p.iqmg_number).includes(normalizedQ))
        );

    const sorted = [...matched];
    if (sortMode === 'newest') {
      sorted.sort((a, b) => {
        const aTime = a.created_at ? Date.parse(a.created_at) : 0;
        const bTime = b.created_at ? Date.parse(b.created_at) : 0;
        if (bTime !== aTime) return bTime - aTime;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });
    } else {
      sorted.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    }
    return sorted;
  }, [profiles, activeTab, searchQuery, sortMode]);

  const pendingCount = useMemo(() => profiles.filter(p => !p.is_approved).length, [profiles]);
  const approvedCount = useMemo(() => profiles.filter(p => Boolean(p.is_approved)).length, [profiles]);

  const shownPendingIds = useMemo(
    () => filteredProfiles.filter(p => !p.is_approved).map(p => p.id),
    [filteredProfiles]
  );

  const selectedPendingIds = useMemo(() => {
    const byId = new Map(profiles.map(p => [p.id, p]));
    return [...selectedIds].filter(id => {
      const p = byId.get(id);
      return p && !p.is_approved;
    });
  }, [profiles, selectedIds]);

  const selectedApprovedIds = useMemo(() => {
    const byId = new Map(profiles.map(p => [p.id, p]));
    return [...selectedIds].filter(id => {
      const p = byId.get(id);
      return p && Boolean(p.is_approved);
    });
  }, [profiles, selectedIds]);

  const allFilteredSelected =
    filteredProfiles.length > 0 && filteredProfiles.every(p => selectedIds.has(p.id));

  const handleToggleSelectShown = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProfiles.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProfiles.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const activeTabId =
    activeTab === 'pending' ? pendingTabId : activeTab === 'approved' ? approvedTabId : allTabId;
  const syncLabel = formatSyncTime(lastSyncedAt);

  return (
    <div className={`cr-dashboard${selectedIds.size > 0 ? ' has-selection-dock' : ''}`}>
      <a className="cr-skip" href="#cr-main">
        Skip to student directory
      </a>

      <div className="cr-backdrop" aria-hidden="true" />

      <header className="cr-topbar">
        <div className="cr-topbar-inner">
          <div className="cr-brand">
            <BrandMark allowCachedWhileLoading width={36} height={36} alt="" />
            <div className="cr-brand-copy">
              <p className="cr-kicker">
                <span aria-hidden="true" />
                {BRAND_NAME} {BRAND_YEAR} · CR Portal
              </p>
              <p className="cr-brand-sub">
                {session?.batch ? `Batch ${session.batch}` : 'Class Representative Desk'}
              </p>
            </div>
          </div>

          <div className="cr-topbar-actions">
            {syncLabel && (
              <span
                className={`cr-sync-badge${liveSyncActive ? ' is-live' : ''}`}
                aria-label={`${liveSyncActive ? 'Live sync active' : 'Auto-sync active'}, last synced at ${syncLabel}`}
              >
                <span className="cr-sync-dot" aria-hidden="true" />
                <span>{liveSyncActive ? 'Live' : 'Auto-sync'} · {syncLabel}</span>
              </span>
            )}
            <button type="button" onClick={handleSignOut} className="cr-signout-btn">
              <LogOut size={15} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main id="cr-main" className="cr-main">
        <section className="cr-masthead" aria-labelledby="cr-desk-heading">
          <div className="cr-masthead-bg" aria-hidden="true" />
          <div className="cr-masthead-grid">
            <div className="cr-masthead-copy">
              <div className="cr-batch-pill">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>Batch-scoped verification</span>
              </div>
              <h1 id="cr-desk-heading">
                {session?.batch ? `${session.batch} Verification Desk` : 'Batch Verification Desk'}
              </h1>
              <p className="cr-masthead-lead">
                Verify incoming registrations for your batch so approved students unlock event passes and team invites.
              </p>
            </div>
          </div>
        </section>

        <section className="cr-controls-panel" aria-label="Directory controls">
          <div className="cr-toolbar">
            <div className="cr-tabs" role="tablist" aria-label="Student approval status">
              <button
                id={pendingTabId}
                type="button"
                role="tab"
                aria-selected={activeTab === 'pending'}
                className="cr-tab"
                onClick={() => {
                  setActiveTab('pending');
                  setConfirmBulkOpen(false);
                }}
              >
                Pending ({pendingCount})
              </button>
              <button
                id={approvedTabId}
                type="button"
                role="tab"
                aria-selected={activeTab === 'approved'}
                className="cr-tab"
                onClick={() => {
                  setActiveTab('approved');
                  setConfirmBulkOpen(false);
                }}
              >
                Approved ({approvedCount})
              </button>
              <button
                id={allTabId}
                type="button"
                role="tab"
                aria-selected={activeTab === 'all'}
                className="cr-tab"
                onClick={() => {
                  setActiveTab('all');
                  setConfirmBulkOpen(false);
                }}
              >
                All ({profiles.length})
              </button>
            </div>

            <div className="cr-toolbar-actions">
              {filteredProfiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectShown}
                  disabled={loading || bulkBusy}
                  className="cr-icon-btn"
                >
                  {allFilteredSelected ? (
                    <CheckSquare size={15} aria-hidden="true" />
                  ) : (
                    <Square size={15} aria-hidden="true" />
                  )}
                  <span>{allFilteredSelected ? 'Clear shown' : 'Select shown'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => void fetchProfiles()}
                disabled={loading || bulkBusy}
                className="cr-icon-btn"
              >
                <RefreshCw size={15} className={loading ? 'cr-spin' : ''} aria-hidden="true" />
                <span>Refresh</span>
              </button>
              {shownPendingIds.length > 0 && !confirmBulkOpen && (
                <button
                  type="button"
                  onClick={() => setConfirmBulkOpen(true)}
                  disabled={bulkBusy || loading}
                  className="cr-bulk-btn"
                >
                  <UserCheck size={15} aria-hidden="true" />
                  <span>Approve all shown ({shownPendingIds.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="cr-filter-row">
            <div className="cr-search-box" role="search">
              <Search size={16} aria-hidden="true" />
              <label htmlFor={searchInputId} className="cr-sr-only">
                Search {activeTab} students
              </label>
              <input
                id={searchInputId}
                type="search"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search name, IQMG, phone, college…"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="cr-search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="cr-sort-field">
              <label htmlFor={sortSelectId}>
                <ArrowUpDown size={14} aria-hidden="true" />
                <span>Sort</span>
              </label>
              <div className="cr-sort-select-wrap">
                <select
                  id={sortSelectId}
                  value={sortMode}
                  onChange={event => setSortMode(event.target.value as SortMode)}
                >
                  <option value="name">Name (A–Z)</option>
                  <option value="newest">Newest signups</option>
                </select>
                <ChevronDown size={15} className="cr-sort-chevron" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        {confirmBulkOpen && shownPendingIds.length > 0 && (
          <div className="cr-confirm-bar" role="region" aria-label="Confirm bulk approval">
            <p>
              Approve all <strong>{shownPendingIds.length}</strong> pending student{' '}
              {shownPendingIds.length === 1 ? 'profile' : 'profiles'} currently shown?
            </p>
            <div className="cr-confirm-actions">
              <button
                type="button"
                className="cr-confirm-btn"
                disabled={bulkBusy}
                onClick={() => void handleBatchAction(shownPendingIds, true)}
              >
                {bulkBusy ? 'Approving…' : 'Confirm approve all'}
              </button>
              <button
                type="button"
                className="cr-icon-btn"
                disabled={bulkBusy}
                onClick={() => setConfirmBulkOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="cr-sr-only" role="status" aria-live="polite">
          {loading
            ? 'Loading student profiles'
            : `Showing ${filteredProfiles.length} ${activeTab === 'all' ? '' : activeTab + ' '}student profiles`}
        </p>

        <section
          className="cr-directory-panel"
          role="tabpanel"
          aria-labelledby={activeTabId}
          tabIndex={filteredProfiles.length === 0 ? 0 : undefined}
        >
          {loading ? (
            <div className="cr-empty-card" role="status">
              <Loader2 size={28} className="cr-spin" aria-hidden="true" />
              <p>Loading student profiles…</p>
              <small>Fetching batch directory from {BRAND_NAME}.</small>
            </div>
          ) : fetchError ? (
            <div className="cr-empty-card is-error" role="alert">
              <AlertTriangle size={28} aria-hidden="true" />
              <p>Could not load batch students</p>
              <small>{fetchError}</small>
              <button type="button" className="cr-retry-btn" onClick={() => void fetchProfiles()}>
                <RefreshCw size={15} aria-hidden="true" />
                <span>Try again</span>
              </button>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="cr-empty-card">
              <Inbox size={28} aria-hidden="true" />
              <p>
                {searchQuery
                  ? `No ${activeTab === 'all' ? '' : activeTab + ' '}students match “${searchQuery.trim()}”.`
                  : activeTab === 'pending'
                    ? 'All batch students are verified.'
                    : `No ${activeTab} students in this batch yet.`}
              </p>
              <small>
                {searchQuery
                  ? 'Try clearing your search or switching tabs.'
                  : 'New registrations for this batch appear here automatically.'}
              </small>
            </div>
          ) : (
            <ul className="cr-list">
              {filteredProfiles.map((p, idx) => {
                const isApproved = Boolean(p.is_approved);
                const isBusy = busyIds.has(p.id) || bulkBusy;
                const isSelected = selectedIds.has(p.id);
                const displayName = p.full_name?.trim() || 'Unnamed student';
                const cleanUsername = p.username?.trim();
                const cleanIqmg = p.iqmg_number?.trim();
                const phoneHref = toPhoneHref(p.phone);
                const joinedLabel = formatJoinedDate(p.created_at);

                return (
                  <li
                    key={p.id}
                    className={`cr-student-card${isApproved ? ' is-approved' : ''}${isSelected ? ' is-selected' : ''}`}
                  >
                    <div className="cr-card-top">
                      <label className="cr-card-select">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={bulkBusy}
                          onChange={() => toggleSelectId(p.id)}
                          aria-label={`Select ${displayName}`}
                        />
                        <span className="cr-checkbox-box" aria-hidden="true">
                          {isSelected && <Check size={13} />}
                        </span>
                      </label>

                      <span className="cr-serial" aria-hidden="true">
                        #{idx + 1}
                      </span>

                      <StudentAvatar
                        name={displayName}
                        avatarUrl={p.avatar_url}
                        isApproved={isApproved}
                      />

                      <div className="cr-student-identity">
                        <div className="cr-name-row">
                          <h2>{displayName}</h2>
                          <span className={`cr-status-pill ${isApproved ? 'is-approved' : 'is-pending'}`}>
                            {isApproved ? (
                              <CheckCircle2 size={12} aria-hidden="true" />
                            ) : (
                              <Clock size={12} aria-hidden="true" />
                            )}
                            <span>{isApproved ? 'Verified' : 'Pending'}</span>
                          </span>
                        </div>
                        {cleanUsername && <p className="cr-username">@{cleanUsername}</p>}
                      </div>
                    </div>

                    <div className="cr-student-meta">
                      {cleanIqmg ? (
                        <span
                          className="cr-meta-chip is-iqmg"
                          title={
                            p.iqmg_status === 'verified'
                              ? 'College IQMG verified against official roster'
                              : 'College IQMG number submitted by student'
                          }
                        >
                          <CreditCard size={13} aria-hidden="true" />
                          <span>
                            {/^iqmg/i.test(cleanIqmg) ? (
                              <span className="cr-iqmg-value">{cleanIqmg}</span>
                            ) : (
                              <>
                                IQMG <span className="cr-iqmg-value">{cleanIqmg}</span>
                              </>
                            )}
                          </span>
                          {p.iqmg_status === 'verified' && (
                            <span className="cr-iqmg-tag">
                              <BadgeCheck size={11} aria-hidden="true" />
                              <span>Roster</span>
                            </span>
                          )}
                        </span>
                      ) : (
                        <span
                          className={`cr-meta-chip ${
                            p.iqmg_status === 'correction_required' ? 'is-iqmg-warning' : 'is-iqmg-missing'
                          }`}
                        >
                          <CreditCard size={13} aria-hidden="true" />
                          <span>
                            {p.iqmg_status === 'correction_required' ? 'IQMG: Correction needed' : 'No IQMG'}
                          </span>
                        </span>
                      )}

                      {phoneHref ? (
                        <a href={phoneHref} className="cr-meta-chip is-link">
                          <Phone size={13} aria-hidden="true" />
                          <span>{p.phone}</span>
                        </a>
                      ) : (
                        <span className="cr-meta-chip">
                          <Phone size={13} aria-hidden="true" />
                          <span>{p.phone || 'No phone'}</span>
                        </span>
                      )}

                      <span className="cr-meta-chip">
                        <Building2 size={13} aria-hidden="true" />
                        <span>{p.college?.trim() || 'No institution'}</span>
                      </span>

                      {joinedLabel && (
                        <span className="cr-meta-chip">
                          <Calendar size={13} aria-hidden="true" />
                          <span>Joined {joinedLabel}</span>
                        </span>
                      )}
                    </div>

                    <div className="cr-card-actions">
                      <button
                        type="button"
                        onClick={() => handleOpenIqmgModal(p)}
                        disabled={isBusy}
                        aria-label={`Edit or correct IQMG for ${displayName}`}
                        className="cr-edit-iqmg-btn"
                      >
                        <Pencil size={14} aria-hidden="true" />
                        <span>Edit IQMG</span>
                      </button>
                      {isApproved ? (
                        <button
                          type="button"
                          onClick={() => void handleToggleApproval(p.id, true)}
                          disabled={isBusy}
                          className="cr-revoke-btn"
                        >
                          <UserX size={15} aria-hidden="true" />
                          <span>{busyIds.has(p.id) ? 'Updating…' : 'Revoke approval'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleToggleApproval(p.id, false)}
                          disabled={isBusy}
                          className="cr-approve-btn"
                        >
                          <UserCheck size={15} aria-hidden="true" />
                          <span>{busyIds.has(p.id) ? 'Approving…' : 'Approve profile'}</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {selectedIds.size > 0 && (
        <div className="cr-selection-dock" role="region" aria-label="Selected student actions">
          <div className="cr-selection-dock-inner">
            <span className="cr-selection-count">
              <strong>{selectedIds.size}</strong> selected
            </span>
            <div className="cr-selection-buttons">
              {selectedPendingIds.length > 0 && (
                <button
                  type="button"
                  className="cr-approve-btn"
                  disabled={bulkBusy}
                  onClick={() => void handleBatchAction(selectedPendingIds, true)}
                >
                  <UserCheck size={15} aria-hidden="true" />
                  <span>{bulkBusy ? 'Updating…' : `Approve selected (${selectedPendingIds.length})`}</span>
                </button>
              )}
              {selectedApprovedIds.length > 0 && (
                <button
                  type="button"
                  className="cr-revoke-btn"
                  disabled={bulkBusy}
                  onClick={() => void handleBatchAction(selectedApprovedIds, false)}
                >
                  <UserX size={15} aria-hidden="true" />
                  <span>{bulkBusy ? 'Updating…' : `Revoke selected (${selectedApprovedIds.length})`}</span>
                </button>
              )}
              <button
                type="button"
                className="cr-icon-btn"
                disabled={bulkBusy}
                onClick={() => setSelectedIds(new Set())}
              >
                <X size={15} aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <CRIqmgModal
        student={iqmgTarget}
        saving={iqmgSaving}
        serverError={iqmgModalError}
        onClose={() => {
          setIqmgModalError(null);
          setIqmgTarget(null);
        }}
        onSubmit={handleSaveIqmg}
      />

      <footer className="cr-footer">
        {BRAND_NAME} {BRAND_YEAR} · Class Representative Portal
      </footer>
    </div>
  );
};
