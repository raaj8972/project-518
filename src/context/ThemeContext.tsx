import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { useData } from './DataContext';
import { SITE_THEMES, isSiteTheme, resolveSiteTheme, type SiteTheme } from '../utils/siteTheme';

type Theme = SiteTheme;

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// [DEDUPE] Use window bridge for singleton Context
const PrimaryThemeContext = ((typeof window !== 'undefined') 
  ? ((window as any).__THEME_CONTEXT__ || ((window as any).__THEME_CONTEXT__ = ThemeContext))
  : ThemeContext) as React.Context<ThemeContextType | undefined>;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { siteSettings, updateSiteSettings } = useData();

  const preview = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('theme') : null;
  const theme: Theme = isSiteTheme(preview) ? preview : resolveSiteTheme(siteSettings?.batch_options as any);

  const setTheme = useCallback(async (newTheme: Theme) => {
    const currentOptions = siteSettings?.batch_options && typeof siteSettings.batch_options === 'object' 
      ? siteSettings.batch_options 
      : {};
      
    await updateSiteSettings({
      batch_options: { ...currentOptions, active_theme: newTheme, theme_version: 2 }
    });
  }, [siteSettings?.batch_options, updateSiteSettings]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.remove(...SITE_THEMES.map(name => `theme-${name}`));
    document.body.classList.add(`theme-${theme}`);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'spiderman' ? '#07120c' : '#0a0a0a');
  }, [theme]);

  return (
    <PrimaryThemeContext.Provider value={value}>
      {children}
    </PrimaryThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(PrimaryThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
