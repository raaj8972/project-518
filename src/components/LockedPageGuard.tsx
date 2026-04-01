import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import ComingSoon from '../pages/ComingSoon';

import { AlertTriangle } from 'lucide-react';

interface LockedPageGuardProps {
  pageKey: string;
  children: React.ReactNode;
}

export const LockedPageGuard: React.FC<LockedPageGuardProps> = ({ pageKey, children }) => {
  const { siteSettings, isAdmin } = useData();
  const [now, setNow] = useState(Date.now());
  
  // Poll current time every second so the guard auto-unlocks when timer expires
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  
  const isExplicitlyLocked = siteSettings?.locked_pages?.[pageKey] === true;
  const timerValue = siteSettings?.locked_pages_until?.[pageKey];
  const timerExpired = timerValue ? new Date(timerValue).getTime() <= now : false;
  
  // The page is locked ONLY if:
  //   1. locked_pages[pageKey] is true AND
  //   2. Either there is no timer, or the timer hasn't expired
  const isLocked = isExplicitlyLocked && !timerExpired;
  const canBypass = isAdmin();

  if (isLocked && !canBypass) {
    // Render the ComingSoon component acting as a maintenance page
    return (
      <ComingSoon 
        isMaintenance
        previewSettings={{
          coming_soon_enabled: true,
          coming_soon_until: timerValue,
          coming_soon_title: "Under Maintenance",
          coming_soon_message: "This page is currently being updated. Please check back later.",
          coming_soon_ended_text: "System Re-Initialized",
        }} 
      />
    );
  }

  // Not locked or user is an admin
  return (
    <>
      {isExplicitlyLocked && canBypass && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-500/90 text-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg backdrop-blur-sm shadow-yellow-500/20 border border-yellow-400">
          <AlertTriangle className="w-4 h-4" />
          Page is Locked (Admin Bypass Active)
        </div>
      )}
      {children}
    </>
  );
};

export default LockedPageGuard;
