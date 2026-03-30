import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, Sparkles, ChevronRight, X, UserCheck, Calendar, Image, Shield } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
  tabs: any[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelectTab, tabs }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredTabs = tabs.filter(tab => 
    tab.name.toLowerCase().includes(query.toLowerCase()) ||
    tab.group?.toLowerCase().includes(query.toLowerCase())
  );

  const aiSuggestions = [
    { id: 'registrations', name: 'Review Pending Applications', icon: UserCheck, group: 'AI Suggesion' },
    { id: 'events', name: 'Check Upcoming Network Events', icon: Calendar, group: 'AI Suggesion' },
    { id: 'gallery', name: 'Optimize Recent Media Assets', icon: Image, group: 'AI Suggesion' },
  ].filter(s => query === '' || s.name.toLowerCase().includes(query.toLowerCase()));

  const allItems = [...aiSuggestions, ...filteredTabs];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          onSelectTab(allItems[selectedIndex].id);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allItems, selectedIndex, onSelectTab, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Palette Container */}
      <div className="w-full max-w-2xl rico-glass-card rounded-[2.5rem] border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] pointer-events-auto animate-in zoom-in-95 duration-300 relative overflow-hidden">
        {/* Animated Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center gap-4">
            <Search className="w-6 h-6 text-indigo-400" />
            <input 
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands, sections, or AI actions..."
              className="flex-1 bg-transparent border-none outline-none text-xl font-black text-white placeholder-gray-600 tracking-tighter"
            />
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-gray-500 uppercase tracking-widest">ESC</div>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="max-h-[450px] overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            {allItems.length > 0 ? (
              allItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                const Icon = item.icon || ChevronRight;
                const isSuggestion = item.group === 'AI Suggesion';

                return (
                  <button
                    key={`${item.id}-${index}`}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                      w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group
                      ${isSelected 
                        ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-white/10 translate-x-1 shadow-xl' 
                        : 'bg-transparent border border-transparent'}
                    `}
                  >
                    <div className={`
                      p-2.5 rounded-xl border transition-all duration-300
                      ${isSelected 
                        ? isSuggestion ? 'bg-indigo-500 text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-white/10 text-white border-white/20' 
                        : 'bg-white/[0.03] text-gray-500 border-white/5'}
                    `}>
                      <Icon size={20} className={isSelected ? 'animate-pulse' : ''} />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-black tracking-tight ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          {item.name}
                        </span>
                        {isSuggestion && (
                           <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">AI Recommended</span>
                        )}
                      </div>
                      <p className={`text-[10px] uppercase font-black tracking-widest ${isSelected ? 'text-gray-400' : 'text-gray-600'}`}>
                        {item.group}
                      </p>
                    </div>

                    <ChevronRight 
                      size={16} 
                      className={`transition-all duration-300 ${isSelected ? 'text-indigo-400 translate-x-0 opacity-100' : 'text-gray-700 -translate-x-2 opacity-0'}`} 
                    />
                  </button>
                );
              })
            ) : (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto">
                   <Sparkles className="text-gray-700 animate-pulse" />
                </div>
                <p className="text-sm font-black text-gray-600 uppercase tracking-[0.2em]">Intercepting empty results...</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[10px] font-black text-gray-600 uppercase tracking-widest">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5"><div className="p-1 rounded bg-white/5 border border-white/10 leading-none">↓</div> Navigate</span>
              <span className="flex items-center gap-1.5"><div className="p-1 rounded bg-white/5 border border-white/10 leading-none">↵</div> Select</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-indigo-500/50" />
              <span>Rico AI Assistant Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
