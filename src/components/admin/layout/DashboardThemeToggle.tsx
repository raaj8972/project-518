import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import '../../../styles/DashboardTheme.css';

type DashboardTheme = 'light' | 'dark';
export const DASHBOARD_THEME_KEY = 'ricorrenza-dashboard-appearance';
const storedTheme = (): DashboardTheme => {
  try { return localStorage.getItem(DASHBOARD_THEME_KEY) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
};

/** Personal dashboard preference; independent of the public website theme. */
export function DashboardThemeToggle() {
  const [theme, setTheme] = useState<DashboardTheme>(storedTheme);
  useEffect(() => {
    document.body.dataset.dashboardTheme = theme;
    try { localStorage.setItem(DASHBOARD_THEME_KEY, theme); } catch { /* Storage can be unavailable in private sessions. */ }
    return () => { delete document.body.dataset.dashboardTheme; };
  }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === DASHBOARD_THEME_KEY) setTheme(event.newValue === 'light' ? 'light' : 'dark');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return <div className="dashboard-theme-toggle" role="group" aria-label="Dashboard appearance">
    <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Sun size={15} /><span>Light</span></button>
    <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Moon size={15} /><span>Dark</span></button>
  </div>;
}
