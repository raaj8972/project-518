import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, SUPABASE_HOST } from '../lib/supabase';
import { dualRead, dualUpsert, dualInsert, dualUpdate, dualDelete, invalidateTableCache } from '../lib/dualDb';
import { useAuth } from './AuthContext';
import { getPublicSecuritySettings } from '../services/publicSecuritySettings';
import { persistRoadmap } from '../utils/persistRoadmap';
import { preloadBrandAssets } from '../utils/preloadBrand';
import { rolloverPartnerPlacements } from '../utils/homepageContent';
import { BRAND_YEAR } from '../constants/brand';
import { 
  SiteSettings, HeroMedia, AboutSettings, HomeboundSettings, 
  HomepageSettings, FormSettings, SocialMediaSettings, SecuritySettings, PageKey, RoadmapMilestone,
  Audition, Membership
} from '../types/data';

interface CoreContextType {
  loading: boolean;
  isLoaded: boolean;
  setLoading: (loading: boolean) => void;
  connectionStatus: 'ok' | 'degraded' | 'offline';
  lastError: string | null;
  latencyMs: number | null;
  supabaseHost: string;
  realtimeStatus: Record<string, string>;
  showConnectionBanner: boolean;
  
  // Settings & Hero
  siteSettings: SiteSettings | null;
  heroMedia: Partial<Record<PageKey, HeroMedia | null>>;
  aboutSettings: AboutSettings | null;
  homeboundSettings: HomeboundSettings | null;
  homepageSettings: HomepageSettings | null;
  formSettings: FormSettings | null;
  socialMediaSettings: SocialMediaSettings | null;
  securitySettings: SecuritySettings | null;
  
  refreshAll: (silent?: boolean) => Promise<void>;
  refreshTrigger: number;
  pingNow: () => Promise<void>;
  fetchHeroMedia: (pageKey: PageKey) => Promise<HeroMedia | null>;
  updateHeroMedia: (pageKey: PageKey, patch: Partial<HeroMedia>) => Promise<void>;
  resubscribeRealtime: () => void;

  // Management methods for settings
  updateAboutSettings: (patch: Partial<AboutSettings>) => Promise<void>;
  updateHomeboundSettings: (patch: Partial<HomeboundSettings>) => Promise<void>;
  updateHomepageSettings: (patch: Partial<HomepageSettings>) => Promise<void>;
  updateSiteSettings: (patch: Partial<SiteSettings>) => Promise<void>;
  updateFormSettings: (patch: Partial<FormSettings>) => Promise<void>;
  updateSocialMediaSettings: (patch: Partial<SocialMediaSettings>) => Promise<void>;
  updateSecuritySettings: (patch: Partial<SecuritySettings>) => Promise<void>;

  // Roadmap Management
  addRoadmapMilestone: (m: Partial<RoadmapMilestone>) => Promise<void>;
  updateRoadmapMilestone: (id: number, m: Partial<RoadmapMilestone>) => Promise<void>;
  deleteRoadmapMilestone: (id: number) => Promise<void>;
  toggleRoadmapMilestoneEnabled: (id: number) => Promise<void>;

  // Public Submissions
  addAudition: (audition: Partial<Audition>) => Promise<void>;
  addMembership: (membership: Partial<Membership>) => Promise<void>;
  toggleSponsorshipPackageEnabled: (id: number) => Promise<void>;
}

const CoreContext = createContext<CoreContextType | undefined>(undefined);

// [DEDUPE] Use window bridge for singleton Context
const PrimaryCoreDataContext = ((typeof window !== 'undefined') 
  ? ((window as any).__CORE_DATA_CONTEXT__ || ((window as any).__CORE_DATA_CONTEXT__ = CoreContext))
  : CoreContext) as React.Context<CoreContextType | undefined>;

export const useCoreData = () => {
  const context = useContext(PrimaryCoreDataContext);
  if (context === undefined) {
    throw new Error('useCoreData must be used within a CoreDataProvider');
  }
  return context;
};

/** Optional reader for shared layout components that may render outside CoreDataProvider in tests. */
export const useOptionalCoreData = () => useContext(PrimaryCoreDataContext);

export function CoreDataProvider({ children, pathname = '/' }: { children: ReactNode; pathname?: string }) {
  const { user } = useAuth();


  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'ok' | 'degraded' | 'offline'>('ok');
  const [lastError, setLastError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [realtimeStatus] = useState<Record<string, string>>({});
  const [showConnectionBanner] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Settings state
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [heroMedia, setHeroMedia] = useState<Partial<Record<PageKey, HeroMedia | null>>>({});
  const [aboutSettings, setAboutSettings] = useState<AboutSettings | null>(null);
  const [homeboundSettings, setHomeboundSettings] = useState<HomeboundSettings | null>(null);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [socialMediaSettings, setSocialMediaSettings] = useState<SocialMediaSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);

  useEffect(() => {
    if (isLoaded && homepageSettings) preloadBrandAssets(homepageSettings);
  }, [homepageSettings, isLoaded]);

  const pingNow = useCallback(async () => {
    const start = Date.now();
    try {
      // Ping Firestore
      await dualRead({ table: 'site_settings', limit: 1, maybeSingle: true });
      setLatencyMs(Date.now() - start);
      setConnectionStatus('ok');
    } catch (err: any) {
      setConnectionStatus('offline');
      setLastError(err.message);
    }
  }, []);

  const fetchHeroMedia = useCallback(async (pageKey: PageKey): Promise<HeroMedia | null> => {
    const { data } = await dualRead({
      table: 'hero_media',
      eq: ['page_key', pageKey],
      maybeSingle: true
    });

    if (data) {
      setHeroMedia(prev => ({ ...prev, [pageKey]: data }));
      return data;
    }
    return null;
  }, []);

  const updateHeroMedia = async (pageKey: PageKey, patch: Partial<HeroMedia>) => {
    const { data: existing } = await dualRead({ table: 'hero_media', eq: ['page_key', pageKey], maybeSingle: true });
    await dualUpsert('hero_media', { ...(existing?.id ? { id: existing.id } : {}), page_key: pageKey, ...patch });
    await fetchHeroMedia(pageKey);
  };

  const resubscribeRealtime = useCallback(() => {
    // Logic for resubscribing to channels
    console.log('[CoreContext] Resubscribing to realtime channels...');
  }, []);

  const updateAboutSettings = async (patch: Partial<AboutSettings>) => {
    await dualUpsert('about_settings', { id: 1, ...patch });
    await refreshAll(true);
  };
  
  const updateHomeboundSettings = async (patch: Partial<HomeboundSettings>) => {
    const saved = await dualUpsert('homebound_settings', { id: 1, ...patch });
    if (!saved) throw new Error('The Homebound settings were not saved. Please refresh and try again.');
    setHomeboundSettings(saved);
    await refreshAll(true);
  };

  const updateHomepageSettings = async (patch: Partial<HomepageSettings>) => {
    // Artist staff save only this JSON column through a narrowly scoped RPC.
    if (Object.keys(patch).length === 1 && 'artist_stage_settings' in patch) {
      const {error}=await supabase.rpc('save_artist_stage_settings',{p_settings:patch.artist_stage_settings});
      if(error)throw new Error(error.message);
      invalidateTableCache('homepage_settings');
      await refreshAll(true);
      return;
    }
    const nextPatch = { ...patch };
    const previousYear = Number(homepageSettings?.brand_year) || Number(BRAND_YEAR);
    const nextYear = Number(patch.brand_year);
    if (Number.isInteger(nextYear) && nextYear > previousYear) {
      // Save the new brand year and its archived placements in the same row write.
      const latest = await dualRead({ table: 'homepage_settings', eq: ['id', 1], maybeSingle: true, forceRefresh: true });
      const liveYear = Number(latest.data?.brand_year) || previousYear;
      if (nextYear > liveYear) {
        nextPatch.sponsor_logos = rolloverPartnerPlacements(patch.sponsor_logos ?? latest.data?.sponsor_logos ?? homepageSettings?.sponsor_logos, liveYear, nextYear) as unknown as HomepageSettings['sponsor_logos'];
      }
    }
    const sponsorFields = ['sponsor_logos', 'featured_partners_enabled'];
    if (Object.keys(nextPatch).length && Object.keys(nextPatch).every(key => sponsorFields.includes(key))) {
      await dualUpdate('homepage_settings', 1, nextPatch);
    } else await dualUpsert('homepage_settings', { id: 1, ...nextPatch });
    await refreshAll(true);
  };

  const updateSiteSettings = async (patch: Partial<SiteSettings>) => {
    await dualUpsert('site_settings', { id: 1, ...patch });
    // Targeted refresh of just site_settings instead of refreshAll(true)
    const { data } = await dualRead({ 
      table: 'site_settings', 
      eq: ['id', 1], 
      maybeSingle: true,
      forceRefresh: true 
    });
    if (data) setSiteSettings(data);
  };

  const updateFormSettings = async (patch: Partial<FormSettings>) => {
    await dualUpsert('form_settings', { id: 1, ...patch });
    await refreshAll(true);
  };

  const updateSocialMediaSettings = async (patch: Partial<SocialMediaSettings>) => {
    await dualUpsert('social_media_settings', { id: 1, ...patch });
    await refreshAll(true);
  };

  const updateSecuritySettings = async (patch: Partial<SecuritySettings>) => {
    await dualUpsert('security_settings', { id: 1, ...patch });
    await refreshAll(true);
  };

  const addRoadmapMilestone = async (m: Partial<RoadmapMilestone>) => {
    await persistRoadmap(payload=>dualInsert('roadmap_milestones',payload),m);
    setRefreshTrigger(p => p + 1);
  };

  const updateRoadmapMilestone = async (id: number, patch: Partial<RoadmapMilestone>) => {
    await persistRoadmap(payload=>dualUpdate('roadmap_milestones',id,payload),patch);
    setRefreshTrigger(p => p + 1);
  };

  const deleteRoadmapMilestone = async (id: number) => {
    await dualDelete('roadmap_milestones', id);
    setRefreshTrigger(p => p + 1);
  };

  const toggleRoadmapMilestoneEnabled = async (id: number) => {
    const { data: current } = await dualRead({ table: 'roadmap_milestones', eq: ['id', id], maybeSingle: true });
    if (current) {
      await dualUpdate('roadmap_milestones', id, { enabled: !current.enabled });
      setRefreshTrigger(p => p + 1);
    }
  };

  const addAudition = async (audition: Partial<Audition>) => {
    // Public applicants can insert, but cannot read private applications back.
    const { error } = await supabase.from('auditions').insert({
      id: audition.id, participant_type: audition.participant_type, full_name: audition.full_name,
      email: audition.email, phone: audition.phone, instrument_role: audition.instrument_role,
      experience_motivation: audition.experience_motivation || '', portfolio_link: audition.portfolio_link || null,
      status: 'pending',
    });
    if (error) throw error;
    setRefreshTrigger(p => p + 1);
  };

  const addMembership = async (membership: Partial<Membership>) => {
    await dualUpsert('memberships', membership);
    setRefreshTrigger(p => p + 1);
  };

  const toggleSponsorshipPackageEnabled = async (id: number) => {
    const { data: current } = await dualRead({ table: 'sponsorship_packages', eq: ['id', id], maybeSingle: true });
    if (current) {
      await dualUpdate('sponsorship_packages', id, { enabled: !current.enabled });
      setRefreshTrigger(p => p + 1);
    }
  };

  const refreshAll = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setRefreshTrigger(previous => previous + 1); }
    setLastError(null);
    const read = async (table: string, apply: (data: any) => void) => {
      try {
        const { data } = await dualRead({ table, eq: ['id', 1], maybeSingle: true });
        apply(data);
      } catch (error: any) {
        setLastError(error.message || 'Some settings could not be loaded');
      }
    };
    // Only branding/site access are prerequisites for the first usable screen.
    const essential = Promise.all([
      read('site_settings', setSiteSettings),
      read('homepage_settings', setHomepageSettings),
    ]).finally(() => { setLoading(false); setIsLoaded(true); });
    const admin = pathname.startsWith('/admin');
    const optional: Promise<unknown>[] = [read('social_media_settings', setSocialMediaSettings)];
    if (admin || pathname === '/' || pathname === '/health') optional.push(read('about_settings', setAboutSettings));
    if (admin || pathname === '/' || ['/events', '/dashboard', '/rico-family', '/home-bound'].some(p => pathname.startsWith(p))) optional.push(read('form_settings', setFormSettings));
    if (admin || pathname.startsWith('/home-bound')) optional.push(read('homebound_settings', setHomeboundSettings));
    optional.push(getPublicSecuritySettings().then(setSecuritySettings).catch((error: any) => setLastError(error.message)));
    await Promise.all([essential, ...optional]);
  }, [pathname]);

  useEffect(() => {
    void refreshAll(true);
  }, [refreshAll, user?.id]);

  useEffect(() => {
    if (!pathname.startsWith('/home-bound') && !pathname.startsWith('/admin')) return;
    const channel = supabase.channel('homebound-page-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homebound_settings', filter: 'id=eq.1' }, payload => {
        invalidateTableCache('homebound_settings');
        setHomeboundSettings(payload.eventType === 'DELETE' ? null : payload.new as HomeboundSettings);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pathname]);

  // Real-time subscription for site_settings & homepage_settings
  useEffect(() => {
    const siteChannel = supabase
      .channel('site_settings_changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'site_settings',
        filter: 'id=eq.1'
      }, (payload) => {
        console.log('[CoreContext] site_settings real-time update:', payload.new);
        setSiteSettings(payload.new as SiteSettings);
      })
      .subscribe();

    const homeChannel = supabase
      .channel('homepage_settings_changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'homepage_settings',
        filter: 'id=eq.1'
      }, (payload) => {
        console.log('[CoreContext] homepage_settings real-time update:', payload.new);
        setHomepageSettings(payload.new as HomepageSettings);
      })
      .subscribe();

    const aboutChannel = supabase.channel('homepage-about-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'about_settings', filter: 'id=eq.1' }, payload => { invalidateTableCache('about_settings'); setAboutSettings(payload.eventType === 'DELETE' ? null : payload.new as AboutSettings); }).subscribe();

    const socialChannel=supabase.channel('homepage-social-changes').on('postgres_changes',{event:'*',schema:'public',table:'social_media_settings',filter:'id=eq.1'},payload=>{invalidateTableCache('social_media_settings');setSocialMediaSettings(payload.eventType==='DELETE'?null:payload.new as SocialMediaSettings);}).subscribe();

    return () => {
      supabase.removeChannel(socialChannel);
      supabase.removeChannel(aboutChannel);
      supabase.removeChannel(siteChannel);
      supabase.removeChannel(homeChannel);
    };
  }, []);

  const value: CoreContextType = {
    loading,
    isLoaded,
    setLoading,
    connectionStatus,
    lastError,
    latencyMs,
    supabaseHost: SUPABASE_HOST || '',
    realtimeStatus,
    showConnectionBanner,
    refreshTrigger,
    siteSettings,
    heroMedia,
    aboutSettings,
    homeboundSettings,
    homepageSettings,
    formSettings,
    socialMediaSettings,
    securitySettings,
    refreshAll,
    pingNow,
    fetchHeroMedia,
    updateHeroMedia,
    resubscribeRealtime,
    updateAboutSettings,
    updateHomeboundSettings,
    updateHomepageSettings,
    updateSiteSettings,
    updateFormSettings,
    updateSocialMediaSettings,
    updateSecuritySettings,
    addRoadmapMilestone,
    updateRoadmapMilestone,
    deleteRoadmapMilestone,
    toggleRoadmapMilestoneEnabled,
    addAudition,
    addMembership,
    toggleSponsorshipPackageEnabled
  };

  return (
    <PrimaryCoreDataContext.Provider value={value}>
      {children}
    </PrimaryCoreDataContext.Provider>
  );
};
