import { useLayoutEffect } from 'react';
import '../../../styles/DashboardTheme.css';

/** The management workspace always opens in light mode, including portalled dialogs. */
export function AdminLightAppearance() {
  useLayoutEffect(() => {
    const previous = document.body.dataset.dashboardTheme;
    document.body.dataset.dashboardTheme = 'light';
    document.body.dataset.adminWorkspace = 'light';
    return () => {
      if (previous) document.body.dataset.dashboardTheme = previous;
      else delete document.body.dataset.dashboardTheme;
      delete document.body.dataset.adminWorkspace;
    };
  }, []);
  return null;
}
