import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, SUPABASE_HOST } from '../lib/supabase';
import { dualRead, dualUpsert } from '../lib/dualDb';
import { useAuth } from './AuthContext';
import { 
  SiteSettings, HeroMedia, AboutSettings, HomeboundSettings, 
  HomepageSettings, FormSettings, SocialMediaSettings, SecuritySettings, PageKey, RoadmapMilestone,
  Audition, Membership
} from '../types/data';

interface CoreContextType {
  loading: boolean;
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

export const useCoreData = () => {
  const context = useContext(CoreContext);
  if (context === undefined) {
    throw new Error('useCoreData must be used within a CoreDataProvider');
  }
  return context;
};

export const CoreDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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
  const [homeboundSettings, setHomeboundSettings] = useState<AboutSettings | any>(null);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [socialMediaSettings, setSocialMediaSettings] = useState<SocialMediaSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);

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
    await dualUpsert('hero_media', { page_key: pageKey, ...patch });
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
    await dualUpsert('homebound_settings', { id: 1, ...patch });
    await refreshAll(true);
  };

  const updateHomepageSettings = async (patch: Partial<HomepageSettings>) => {
    await dualUpsert('homepage_settings', { id: 1, ...patch });
    await refreshAll(true);
  };

  const updateSiteSettings = async (patch: Partial<SiteSettings>) => {
    await dualUpsert('site_settings', { id: 1, ...patch });
    await refreshAll(true);
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
    const { error } = await supabase.from('roadmap_milestones').insert(m);
    if (error) throw new Error(`[Roadmap] insert failed: ${error.message}`);
    setRefreshTrigger(p => p + 1);
  };

  const updateRoadmapMilestone = async (id: number, patch: Partial<RoadmapMilestone>) => {
    const { error } = await supabase.from('roadmap_milestones').update(patch).eq('id', id);
    if (error) throw new Error(`[Roadmap] update failed: ${error.message}`);
    setRefreshTrigger(p => p + 1);
  };

  const deleteRoadmapMilestone = async (id: number) => {
    const { error } = await supabase.from('roadmap_milestones').delete().eq('id', id);
    if (error) throw new Error(`[Roadmap] delete failed: ${error.message}`);
    setRefreshTrigger(p => p + 1);
  };

  const toggleRoadmapMilestoneEnabled = async (id: number) => {
    const { data: current } = await supabase.from('roadmap_milestones').select('enabled').eq('id', id).maybeSingle();
    if (current) {
      const { error } = await supabase.from('roadmap_milestones').update({ enabled: !current.enabled }).eq('id', id);
      if (error) throw new Error(`[Roadmap] toggle failed: ${error.message}`);
      setRefreshTrigger(p => p + 1);
    }
  };

  const addAudition = async (audition: Partial<Audition>) => {
    await dualUpsert('auditions', audition);
    setRefreshTrigger(p => p + 1);
  };

  const addMembership = async (membership: Partial<Membership>) => {
    await dualUpsert('memberships', membership);
    setRefreshTrigger(p => p + 1);
  };

  const toggleSponsorshipPackageEnabled = async (id: number) => {
    const { data: current } = await dualRead({ table: 'sponsorship_packages', eq: ['id', id], maybeSingle: true });
    if (current) {
      await dualUpsert('sponsorship_packages', { id, enabled: !current.enabled });
      setRefreshTrigger(p => p + 1);
    }
  };

  const refreshAll = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      // Increment trigger to signal all sub-contexts to re-fetch
      setRefreshTrigger(prev => prev + 1);
      
      // Fetch core-specific data using dualRead for Firestore prioritization
      const [siteRes, aboutRes, homeboundRes, homepageRes, formRes, socialRes, securityRes] = await Promise.all([
        dualRead({ table: 'site_settings', eq: ['id', 1], maybeSingle: true }),
        dualRead({ table: 'about_settings', eq: ['id', 1], maybeSingle: true }),
        dualRead({ table: 'homebound_settings', eq: ['id', 1], maybeSingle: true }),
        dualRead({ table: 'homepage_settings', eq: ['id', 1], maybeSingle: true }),
        dualRead({ table: 'form_settings', eq: ['id', 1], maybeSingle: true }),
        dualRead({ table: 'social_media_settings', eq: ['id', 1], maybeSingle: true }),
        dualRead({ table: 'security_settings', eq: ['id', 1], maybeSingle: true })
      ]);

      setSiteSettings(siteRes.data);
      setAboutSettings(aboutRes.data);
      setHomeboundSettings(homeboundRes.data);
      setHomepageSettings(homepageRes.data);
      setFormSettings(formRes.data);
      setSocialMediaSettings(socialRes.data as any);
      setSecuritySettings(securityRes.data);

    } catch (err: any) {
      setLastError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll, user?.id]);

  const value: CoreContextType = {
    loading,
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

  return <CoreContext.Provider value={value}>{children}</CoreContext.Provider>;
};
