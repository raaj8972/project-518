import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, SUPABASE_HOST } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { 
  SiteSettings, HeroMedia, AboutSettings, HomeboundSettings, 
  HomepageSettings, FormSettings, SocialMediaSettings, SecuritySettings, PageKey, RoadmapMilestone
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
  const [homeboundSettings, setHomeboundSettings] = useState<HomeboundSettings | null>(null);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [socialMediaSettings, setSocialMediaSettings] = useState<SocialMediaSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);

  const pingNow = useCallback(async () => {
    const start = Date.now();
    try {
      const { error } = await supabase.from('site_settings').select('id').limit(1);
      if (error) throw error;
      setLatencyMs(Date.now() - start);
      setConnectionStatus('ok');
    } catch (err: any) {
      setConnectionStatus('offline');
      setLastError(err.message);
    }
  }, []);

  const fetchHeroMedia = useCallback(async (pageKey: PageKey): Promise<HeroMedia | null> => {
    const { data, error } = await supabase
      .from('hero_media')
      .select('*')
      .eq('page_key', pageKey)
      .maybeSingle();

    if (!error && data) {
      setHeroMedia(prev => ({ ...prev, [pageKey]: data }));
      return data;
    }
    return null;
  }, []);

  const updateHeroMedia = async (pageKey: PageKey, patch: Partial<HeroMedia>) => {
    const { error } = await supabase
      .from('hero_media')
      .upsert({ page_key: pageKey, ...patch }, { onConflict: 'page_key' });

    if (error) throw error;
    await fetchHeroMedia(pageKey);
  };

  const resubscribeRealtime = useCallback(() => {
    // Logic for resubscribing to channels
    console.log('[CoreContext] Resubscribing to realtime channels...');
  }, []);

  const updateAboutSettings = async (patch: Partial<AboutSettings>) => {
    const { error } = await supabase.from('about_settings').upsert({ id: 1, ...patch });
    if (error) throw error;
    await refreshAll(true);
  };
  
  const updateHomeboundSettings = async (patch: Partial<HomeboundSettings>) => {
    const { error } = await supabase.from('homebound_settings').upsert({ id: 1, ...patch });
    if (error) throw error;
    await refreshAll(true);
  };

  const updateHomepageSettings = async (patch: Partial<HomepageSettings>) => {
    const { error } = await supabase.from('homepage_settings').upsert({ id: 1, ...patch });
    if (error) throw error;
    await refreshAll(true);
  };

  const updateSiteSettings = async (patch: Partial<SiteSettings>) => {
    const { error } = await supabase.from('site_settings').upsert({ id: 1, ...patch });
    if (error) throw error;
    await refreshAll(true);
  };

  const updateFormSettings = async (patch: Partial<FormSettings>) => {
    const { error } = await supabase.from('form_settings').upsert({ id: 1, ...patch });
    if (error) throw error;
    await refreshAll(true);
  };

  const updateSocialMediaSettings = async (patch: Partial<SocialMediaSettings>) => {
    const { error } = await supabase.from('social_media_settings').upsert({ id: 1, ...patch });
    if (error) throw error;
    await refreshAll(true);
  };

  const updateSecuritySettings = async (patch: Partial<SecuritySettings>) => {
    const { error } = await supabase.from('security_settings').upsert({ id: 1, ...patch });
    if (error) throw error;
    await refreshAll(true);
  };

  const addRoadmapMilestone = async (m: Partial<RoadmapMilestone>) => {
    const { error } = await supabase.from('roadmap_milestones').insert(m);
    if (error) throw error;
    setRefreshTrigger(p => p + 1);
  };

  const updateRoadmapMilestone = async (id: number, patch: Partial<RoadmapMilestone>) => {
    const { error } = await supabase.from('roadmap_milestones').update(patch).eq('id', id);
    if (error) throw error;
    setRefreshTrigger(p => p + 1);
  };

  const deleteRoadmapMilestone = async (id: number) => {
    const { error } = await supabase.from('roadmap_milestones').delete().eq('id', id);
    if (error) throw error;
    setRefreshTrigger(p => p + 1);
  };

  const toggleRoadmapMilestoneEnabled = async (id: number) => {
    // We need to fetch current state first or just use RPC if available
    const { data: current } = await supabase.from('roadmap_milestones').select('enabled').eq('id', id).single();
    if (current) {
      const { error } = await supabase.from('roadmap_milestones').update({ enabled: !current.enabled }).eq('id', id);
      if (error) throw error;
      setRefreshTrigger(p => p + 1);
    }
  };

  const refreshAll = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      // Increment trigger to signal all sub-contexts to re-fetch
      setRefreshTrigger(prev => prev + 1);
      
      // Fetch core-specific data
      const [siteRes, aboutRes, homeboundRes, homepageRes, formRes, socialRes, securityRes] = await Promise.all([
        supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('about_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('homebound_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('homepage_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('form_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('social_media_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('security_settings').select('*').eq('id', 1).maybeSingle()
      ]);

      if (!siteRes.error) setSiteSettings(siteRes.data);
      if (!aboutRes.error) setAboutSettings(aboutRes.data);
      if (!homeboundRes.error) setHomeboundSettings(homeboundRes.data);
      if (!homepageRes.error) setHomepageSettings(homepageRes.data);
      if (!formRes.error) setFormSettings(formRes.data);
      if (!socialRes.error) {
        // Normalize social media settings if needed
        setSocialMediaSettings(socialRes.data as any);
      }
      if (!securityRes.error) setSecuritySettings(securityRes.data);

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
    toggleRoadmapMilestoneEnabled
  };

  return <CoreContext.Provider value={value}>{children}</CoreContext.Provider>;
};
