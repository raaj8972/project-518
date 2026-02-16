import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  Menu, 
  X, 
  Shield, 
  Home, 
  Search,
  ChevronRight,
  Bell,
  Sparkles,
  Command,
} from 'lucide-react';
import { HealthBadge } from '../HealthBadge';
import { BRAND_NAME_WITH_YEAR } from '../../../constants/brand';
import { CommandPalette } from './CommandPalette';

export type TabType = 'overview' | 'homepage' | 'hero-media' | 'homebound' | 'about' | 'events' | 'schedule' | 'gallery' | 'face-indexing' | 'sponsors' | 'registrations' | 'registration-photos' | 'reg-photos' | 'categories' | 'social' | 'faculty' | 'core-team' | 'sports' | 'sports-team' | 'band' | 'artist' | 'guest-artists' | 'chief-guest' | 'chief-guests' | 'sponsorship-packages' | 'auditions' | 'memberships' | 'form-settings' | 'registration-modal' | 'roadmap' | 'security' | 'biometric-login' | 'site-settings' | 'admin-users' | 'notifications' | 'owner-approvals' | 'coordinator-passwords' | 'security-passes' | 'council-access' | 'audit-logs';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Keyboard Shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  const groupOrder = ['Dashboard', 'Content', 'Events & Schedule', 'Registrations', 'People', 'Security & System', 'Other'];

  return (
    <div className="h-screen bg-[#050508] text-gray-200 flex font-sans selection:bg-indigo-500/30 overflow-hidden superia-mesh-glow">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - SUPERIA Hyper-Glassmorphism */}
      <aside 
        className={`
          fixed lg:sticky top-0 h-[100dvh] z-50 w-72 flex-shrink-0 
          bg-white/[0.02] backdrop-blur-3xl border-r border-white/10
          transform transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          group/sidebar
        `}
      >
        <div className="h-full flex flex-col relative overflow-hidden">
          {/* Subtle Side Glow */}
          <div className="absolute top-0 -right-40 w-80 h-full bg-indigo-500/5 blur-[120px] pointer-events-none group-hover/sidebar:bg-indigo-500/10 transition-colors duration-1000" />

          {/* Sidebar Header */}
          <div className="h-20 flex items-center px-6 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 animate-superia-float relative overflow-hidden group/logo">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/logo:translate-y-0 transition-transform duration-500" />
                <span className="font-black text-white text-xl relative z-10 drop-shadow-lg text-center leading-none">R</span>
              </div>
              <div className="flex flex-col">
                <h1 className="font-black text-white text-base tracking-tighter leading-none flex items-center gap-1.5">
                  SUPERIA <Sparkles size={12} className="text-amber-400 fill-amber-400" />
                </h1>
                <p className="text-[10px] text-gray-500 font-black tracking-[0.2em] uppercase opacity-70">ADMIN OS v3.0</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden ml-auto p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/10 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile Snippet - V3 Enhanced */}
          <div className="p-4 mx-4 mt-8 mb-4 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/5 flex items-center gap-4 group/profile cursor-pointer hover:bg-white/[0.08] transition-all duration-500">
            <div className="relative">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shadow-2xl transition-transform duration-500 group-hover/profile:scale-110 ${isOwner ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {user?.email?.[0].toUpperCase() || 'A'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-[#050508] shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate tracking-tight">{user?.email?.split('@')[0]}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${isOwner ? 'bg-indigo-500/20 text-indigo-400' : 'bg-green-500/20 text-green-400'}`}>
                  {isOwner ? 'Owner' : 'Admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Search - V3 Superia Style */}
          <div className="px-4 mb-6">
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-500 transition-colors group-focus-within:text-white">
                <Command size={14} className="animate-pulse" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Command Search..." 
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-700 pointer-events-none group-focus-within:opacity-0 transition-opacity">K</div>
            </div>
          </div>

          {/* Navigation - V3 Grouped Layout */}
          <nav className="flex-1 overflow-y-auto px-4 pb-8 space-y-10 scrollbar-thin scrollbar-thumb-white/5 hover:scrollbar-thumb-white/10 scrollbar-track-transparent">
            {groupOrder.map(groupName => {
              const items = groups[groupName];
              if (!items || items.length === 0) return null;

              return (
                <div key={groupName} className="space-y-2">
                  <h3 className="px-4 mb-3 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-3">
                    {groupName}
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                  </h3>
                  <div className="space-y-1">
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
                            setSearchQuery(''); 
                          }}
                          className={`
                            w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-500 group relative overflow-hidden
                            ${isActive 
                              ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10' 
                              : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'}
                          `}
                        >
                          {/* Active Indicator Bar */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                          )}
                          
                          {/* Background Glow on Hover */}
                          <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/[0.03] group-hover:to-purple-500/[0.03] transition-all duration-700`} />

                          <Icon size={20} className={`flex-shrink-0 relative z-10 transition-all duration-500 ${isActive ? 'text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.6)] scale-110' : 'group-hover:text-indigo-300 group-hover:scale-110'}`} />
                          <span className={`flex-1 text-left truncate relative z-10 tracking-tight transition-colors ${isActive ? 'font-black' : 'group-hover:text-white'}`}>{tab.name}</span>
                          
                          {badgeCount !== undefined && badgeCount > 0 && (
                            <span className="relative z-10 px-2 py-0.5 rounded-lg bg-indigo-500 text-white text-[10px] font-black shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                              {badgeCount}
                            </span>
                          )}
                          {tab.id === 'security' && isTOTPEnabled && (
                             <Shield size={12} className="relative z-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {Object.keys(groups).length === 0 && searchQuery && (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                  <Search size={20} className="text-gray-600" />
                </div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No matching results</p>
              </div>
            )}
          </nav>

          {/* Sidebar Footer - SUPERIA Style */}
          <div className="p-6 border-t border-white/5 bg-white/[0.01] space-y-4">
             <div className="flex items-center gap-3">
                <button 
                  onClick={onNavigateHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all duration-300 text-xs font-black text-gray-400 hover:text-white group shadow-sm"
                >
                  <Home size={14} className="group-hover:scale-110 transition-transform" />
                  <span>WEBSITE</span>
                </button>
                <button 
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all duration-300 text-rose-400 group shadow-sm"
                >
                  <LogOut size={16} className="group-hover:scale-110 group-hover:-translate-x-0.5 transition-all" />
                </button>
             </div>
             
             <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group/label">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={autoLogoutEnabled} 
                      onChange={(e) => setAutoLogoutEnabled(e.target.checked)}
                    />
                    <div className="w-8 h-4 bg-white/10 rounded-full peer-checked:bg-indigo-500/40 transition-colors" />
                    <div className="absolute top-1 left-1 w-2 h-2 bg-gray-500 rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-indigo-400" />
                  </div>
                  <span className="text-[10px] font-black text-gray-500 group-hover/label:text-gray-400 transition-colors uppercase tracking-widest">Auto-logout</span>
                </label>
                <HealthBadge />
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area - V3 Enhanced */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full animate-superia-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full" style={{ animationDuration: '8s' }} />

        {/* Top Header - Mobile V3 */}
        <header className="h-16 flex items-center justify-between px-6 bg-[#050508]/80 backdrop-blur-3xl border-b border-white/5 sticky top-0 z-40 lg:hidden">
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 -ml-2 text-white bg-white/5 rounded-xl border border-white/10 shadow-lg"
             >
               <Menu size={20} />
             </button>
             <span className="font-black text-white tracking-tighter text-sm uppercase">SUPERIA <span className="text-gray-500">ADMIN</span></span>
           </div>
           <HealthBadge />
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          {/* V3 Desktop Header */}
          <div className="hidden lg:flex items-center justify-between px-10 py-8 pb-4">
            <div className="animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="flex items-center gap-3 text-[10px] font-black text-white/30 tracking-[0.2em] uppercase mb-2">
                 <span>System</span>
                 <ChevronRight size={10} className="text-indigo-500/50" />
                 <span className="text-indigo-400/80">{activeTab.replace(/-/g, ' ')}</span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-4">
                 {visibleTabs.find(t => t.id === activeTab)?.name || 'Dashboard'}
                 {visibleTabs.find(t => t.id === activeTab)?.id === 'security' && isTOTPEnabled && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                       <Shield size={12} className="text-emerald-400" />
                       <span className="text-emerald-400 text-[10px] font-black tracking-widest uppercase">Validated</span>
                    </div>
                 )}
              </h2>
            </div>
            
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-700">
               <button className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 relative group shadow-xl">
                 <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                 <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#050508] shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
               </button>
               <div className="h-10 w-px bg-white/5 mx-2" />
               <button 
                 onClick={() => setIsCommandPaletteOpen(true)}
                 className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 hover:bg-indigo-500/20 transition-all duration-300 group"
               >
                 <Sparkles size={16} className="text-indigo-400 group-hover:animate-spin" />
                 <span className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">AI Assistant</span>
                 <div className="ml-2 px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-[8px] font-black text-indigo-400">⌘K</div>
               </button>
            </div>
          </div>

          <main className="p-6 sm:p-8 lg:p-10 pt-4 max-w-[1720px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            {children}
          </main>

          <footer className="px-10 py-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto">
             <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">{BRAND_NAME_WITH_YEAR} • SUPERIA ADMIN OS v3.0</p>
             <div className="flex items-center gap-6">
                <a href="#" className="text-[10px] font-black text-gray-500 hover:text-indigo-400 transition-colors uppercase tracking-widest">Documentation</a>
                <a href="#" className="text-[10px] font-black text-gray-500 hover:text-indigo-400 transition-colors uppercase tracking-widest">Support</a>
                <a href="#" className="text-[10px] font-black text-gray-500 hover:text-indigo-400 transition-colors uppercase tracking-widest">Logs</a>
             </div>
          </footer>
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tabId) => setActiveTab(tabId as TabType)}
        tabs={visibleTabs}
      />
    </div>
  );
};
