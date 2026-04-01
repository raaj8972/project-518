import React, { createContext, useContext, useEffect } from 'react';
import { useData } from './DataContext';

type Theme = 'cyberpunk' | 'bollywood';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'cyberpunk',
  setTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'bollywood') {
      document.body.classList.add('theme-bollywood');
      document.body.classList.remove('theme-cyberpunk');
    } else {
      document.body.classList.add('theme-cyberpunk');
      document.body.classList.remove('theme-bollywood');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
