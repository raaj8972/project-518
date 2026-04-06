import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useData } from './DataContext';

type Theme = 'cyberpunk' | 'bollywood' | 'vaporwave';

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

  // Parse the active theme from the batch_options JSON blob or default to cyberpunk
  const theme: Theme = (siteSettings?.batch_options as any)?.active_theme || 'cyberpunk';

  const setTheme = async (newTheme: Theme) => {
    const currentOptions = siteSettings?.batch_options && typeof siteSettings.batch_options === 'object' 
      ? siteSettings.batch_options 
      : {};
      
    await updateSiteSettings({
      batch_options: { ...currentOptions, active_theme: newTheme }
    });
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.remove('theme-cyberpunk', 'theme-bollywood', 'theme-vaporwave');
    document.body.classList.add(`theme-${theme}`);
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
