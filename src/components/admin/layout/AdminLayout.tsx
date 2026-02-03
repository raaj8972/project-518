import React from 'react';
import { 
  LogOut, 
  Menu, 
  X, 
  Shield, 
  Home, 
  Search,
  ChevronRight,
  Bell
} from 'lucide-react';
import { HealthBadge } from '../HealthBadge';
import { BRAND_NAME_WITH_YEAR } from '../../../constants/brand';

export type TabType = 'overview' | 'homepage' | 'hero-media' | 'homebound' | 'about' | 'events' | 'schedule' | 'gallery' | 'sponsors' | 'registrations' | 'reg-photos' | 'categories' | 'social' | 'faculty' | 'core-team' | 'sports-team' | 'band' | 'guest-artists' | 'chief-guests' | 'auditions' | 'memberships' | 'form-settings' | 'registration-modal' | 'roadmap' | 'security' | 'biometric-login' | 'site-settings' | 'admin-users' | 'notifications' | 'owner-approvals' | 'coordinator-passwords' | 'security-passes' | 'council-access' | 'audit-logs';

interface AdminLayoutProps {
  user: any;
  isOwner: boolean;
  isAdmin: boolean;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  visibleTabs: any[];
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  badges?: Record<string, number>;
  children: React.ReactNode;
  autoLogoutEnabled: boolean;
  setAutoLogoutEnabled: (enabled: boolean) => void;
  isTOTPEnabled: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  user,
  isOwner,
  activeTab,
  setActiveTab,
  visibleTabs,
  isSidebarOpen,
  setIsSidebarOpen,
  onLogout,
  onNavigateHome,
  badges = {},
  children,
  autoLogoutEnabled,
  setAutoLogoutEnabled,
  isTOTPEnabled
}) => {

  const [searchQuery, setSearchQuery] = React.useState('');

  // Group tabs
  const groups: Record<string, any[]> = {};
  const filteredTabs = visibleTabs.filter(tab => 
    tab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.group?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  filteredTabs.forEach(tab => {
     const g = tab.group || 'Other';
     if (!groups[g]) groups[g] = [];
     groups[g].push(tab);
  });
  const groupOrder = ['Dashboard', 'Security & System', 'Content', 'Events & Schedule', 'Registrations', 'People', 'Other'];

  return (
    <div className="min-h-screen bg-[#0f0f13] text-gray-200 flex font-sans selection:bg-purple-500/30">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Glassmorphic */}
      <aside 
        className={`
          fixed lg:sticky top-0 h-[100dvh] z-50 w-72 flex-shrink-0 
          bg-[#181824]/80 backdrop-blur-xl border-r border-white/5
          transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center px-6 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <span className="font-bold text-black text-lg">R</span>
              </div>
              <div>
                <h1 className="font-bold text-white text-sm tracking-wide leading-tight">ADMIN OS</h1>
                <p className="text-[10px] text-gray-500 font-medium tracking-wider">v2.0 NEXT GEN</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden ml-auto p-1 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile Snippet */}
          <div className="p-4 mx-4 mt-4 mb-2 rounded-xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isOwner ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-700 text-gray-300'}`}>
              {user?.email?.[0].toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.email?.split('@')[0]}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isOwner ? 'bg-indigo-400 animate-pulse' : 'bg-green-400'}`}></span>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{isOwner ? 'Owner' : 'Admin'}</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 mb-2">
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to..." 
                className="w-full bg-black/20 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:bg-black/40 focus:border-indigo-500/50 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {groupOrder.map(groupName => {
              const items = groups[groupName];
              if (!items || items.length === 0) return null;

              return (
                <div key={groupName} className="space-y-1">
                  <h3 className="px-3 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    {groupName}
                    <div className="h-px flex-1 bg-white/5"></div>
                  </h3>
                  {items.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const badgeCount = badges[tab.id];

                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          if (window.innerWidth < 1024) setIsSidebarOpen(false);
                          setSearchQuery(''); // Clear search on selection
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative
                          ${isActive 
                            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white shadow-inner border border-white/5' 
                            : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'}
                        `}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full blur-[2px] opacity-80" />
                        )}
                        <Icon size={18} className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400 filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'group-hover:text-white'}`} />
                        <span className="flex-1 text-left truncate">{tab.name}</span>
                        
                        {badgeCount !== undefined && badgeCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                            {badgeCount}
                          </span>
                        )}
                        {tab.id === 'security' && isTOTPEnabled && (
                           <Shield size={12} className="text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            
            {Object.keys(groups).length === 0 && searchQuery && (
              <div className="text-center py-8 text-gray-500 text-xs">
                No matching tabs found
              </div>
            )}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/5 bg-black/20">
             <div className="flex items-center gap-2">
                <button 
                  onClick={onNavigateHome}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs text-gray-400 hover:text-white group"
                >
                  <Home size={14} className="group-hover:scale-110 transition-transform" />
                  <span>Site</span>
                </button>
                <button 
                  onClick={onLogout}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all text-xs text-rose-400 hover:text-rose-300 group"
                >
                  <LogOut size={14} className="group-hover:scale-110 transition-transform" />
                  <span>Logout</span>
                </button>
             </div>
             <div className="mt-3 flex items-center justify-between text-[10px] text-gray-600">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-400 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={autoLogoutEnabled} 
                    onChange={(e) => setAutoLogoutEnabled(e.target.checked)}
                    className="rounded border-gray-700 bg-transparent text-indigo-500 focus:ring-offset-black focus:ring-indigo-500/50" 
                  />
                  Auto-logout
                </label>
                <div className="flex items-center gap-2">
                   <HealthBadge />
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0f0f13] relative overflow-hidden">
        {/* Ambient Back Glows */}
        <div className="absolute top-0 left-0 w-full h-96 bg-indigo-900/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-full h-96 bg-purple-900/5 blur-[100px] pointer-events-none" />

        {/* Top Header (Mobile Only / Minimal on Desktop) */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-[#0f0f13]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 lg:hidden">
           <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 -ml-2 text-gray-400 hover:text-white active:scale-95 transition-transform"
             >
               <Menu size={24} />
             </button>
             <span className="font-bold text-white tracking-wide">RICO ADMIN</span>
           </div>
           <div className="flex items-center gap-2">
             <HealthBadge />
           </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {/* Breadcrumb-ish Header for Desktop */}
          <div className="hidden lg:flex items-center justify-between px-8 py-6 pb-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                 <span>Admin</span>
                 <ChevronRight size={10} />
                 <span className="text-indigo-400">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/-/g, ' ')}</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                 {visibleTabs.find(t => t.id === activeTab)?.name || 'Dashboard'}
                 {visibleTabs.find(t => t.id === activeTab)?.id === 'security' && isTOTPEnabled && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider">SECURE</span>
                 )}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
               <button className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors relative">
                 <Bell size={18} />
                 <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-[#0f0f13]"></span>
               </button>
            </div>
          </div>

          <main className="p-4 sm:p-6 lg:p-8 pt-4 max-w-[1920px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </main>

          <footer className="px-8 py-6 border-t border-white/5 text-center text-xs text-gray-600 mt-auto">
             <p>{BRAND_NAME_WITH_YEAR} • Rico Events Admin OS v2.0</p>
          </footer>
        </div>
      </div>
    </div>
  );
};
