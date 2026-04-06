import { useState } from 'react';
import { Users, X, ChevronRight, Pen, Send, Eye, EyeOff } from 'lucide-react';
import { AdminPresence } from '../../hooks/useAdminPresence';

interface AdminPresencePanelProps {
  admins: AdminPresence[];
  isOpen: boolean;
  onToggle: () => void;
  onNavigate?: (page: string) => void;
  onSendMessage?: (userId: string, message: string) => Promise<any>;
  hiddenCursors?: string[];
  onToggleCursor?: (userId: string) => void;
}

// Generate consistent color for each admin based on email
const getAdminColor = (email: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-violet-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-red-500',
  ];
  
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Get initials from email
const getInitials = (email: string): string => {
  const name = email.split('@')[0];
  return name.substring(0, 2).toUpperCase();
};

// Format time ago
const timeAgo = (timestamp: string | number): string => {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

export const AdminPresencePanel = ({
  admins,
  isOpen,
  onToggle,
  onNavigate,
  onSendMessage,
  hiddenCursors = [],
  onToggleCursor
}: AdminPresencePanelProps) => {
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const activeAdmins = admins.filter(admin => {
    const lastActivity = new Date(admin.last_activity_at).getTime();
    return Date.now() - lastActivity < 30000; // Active within last 30 seconds
  });

  return (
    <>
      {/* Toggle Button - Fixed on right side */}
      <button
        onClick={onToggle}
        className={`fixed top-20 right-0 z-40 px-3 py-2 rounded-l-lg shadow-lg transition-all duration-300 ${
          isOpen ? 'translate-x-80' : 'translate-x-0'
        } ${activeAdmins.length > 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'} text-white`}
        title={`${activeAdmins.length} admin${activeAdmins.length !== 1 ? 's' : ''} online`}
      >
        <div className="flex items-center gap-2">
          <Users size={18} />
          {activeAdmins.length > 0 && (
            <span className="text-xs font-bold">{activeAdmins.length}</span>
          )}
          <ChevronRight
            size={16}
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } border-l border-gray-200`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-black">
            <Users size={20} />
            <h3 className="font-bold">Active Admins</h3>
            <span className="bg-black text-white text-xs px-2 py-1 rounded-full">
              {activeAdmins.length}
            </span>
          </div>
          <button
            onClick={onToggle}
            className="text-black hover:bg-yellow-600 p-1 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Admin List */}
        <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-64px)]">
          {activeAdmins.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Users size={48} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No other admins online</p>
            </div>
          ) : (
            activeAdmins.map((admin) => {
              // Map page names to tab IDs for navigation
              const pageToTab: Record<string, string> = {
                'Overview': 'overview',
                'Homepage': 'homepage',
                'Hero Media': 'hero-media',
                'Home Bound Settings': 'homebound',
                'About': 'about',
                'Events Management': 'events',
                'Schedule': 'schedule',
                'Gallery': 'gallery',
                'Sponsors': 'sponsors',
                'Registrations': 'registrations',
                'Registration Photos': 'reg-photos',
                'Categories': 'categories',
                'Social Media': 'social',
                'Faculty Heads': 'faculty',
                'Core Team': 'core-team',
                'Sports Team': 'sports-team',
                'Home Bound Band': 'band',
                'Guest Artists': 'guest-artists',
                'Chief Guests': 'chief-guests',
                'Auditions': 'auditions',
                'Memberships': 'memberships',
                'Form Settings': 'form-settings',
                'Batch Model': 'registration-modal',
                'Roadmap': 'roadmap',
                'Security': 'security',
                'Site Settings': 'site-settings',
                'Admin Users': 'admin-users',
                'Notifications': 'notifications'
              };

              const canNavigate = admin.current_page && pageToTab[admin.current_page];
              const isCursorHidden = hiddenCursors.includes(admin.user_id);

              return (
                <div
                  key={admin.id}
                  className={`p-3 bg-gray-50 rounded-lg border border-gray-200 transition-all ${
                    canNavigate ? 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    if (canNavigate && onNavigate) {
                      onNavigate(pageToTab[admin.current_page!]);
                    }
                  }}
                  title={canNavigate ? `Click to jump to ${admin.current_page}` : undefined}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={`${getAdminColor(admin.email || '')} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                    >
                      {getInitials(admin.email || '')}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                        {admin.email?.split('@')[0]}
                        {/* Cursor Toggle */}
                        {onToggleCursor && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleCursor(admin.user_id);
                            }}
                            className={`p-1 rounded-full hover:bg-gray-200 transition-colors ${
                              isCursorHidden ? 'text-gray-400' : 'text-blue-500'
                            }`}
                            title={isCursorHidden ? "Show cursor" : "Hide cursor"}
                          >
                            {isCursorHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        )}
                      </div>
                      
                      {/* Current Page/Section */}
                      {admin.current_page && (
                        <div className="text-xs text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{admin.current_page}</span>
                            {canNavigate && (
                              <span className="text-blue-600">→</span>
                            )}
                          </div>
                          {admin.current_section && (
                            <div className="text-gray-500 truncate mt-0.5">
                              {admin.current_section}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Typing Indicator */}
                      {admin.is_typing && (
                        <div className="flex items-center gap-1 text-blue-600 mt-1">
                          <Pen size={12} className="animate-pulse" />
                          <span className="text-xs font-medium">typing...</span>
                        </div>
                      )}

                      {/* Last Seen */}
                      <div className="text-xs text-gray-400 mt-1">
                        {timeAgo(admin.last_activity_at)}
                      </div>
                    </div>

                    {/* Online Indicator */}
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1 animate-pulse" />
                  </div>

                  {/* Message Input - Only show if onSendMessage is provided */}
                  {onSendMessage && (
                    <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Send a message..."
                          value={messageInputs[admin.user_id] || ''}
                          onChange={(e) => setMessageInputs(prev => ({ ...prev, [admin.user_id]: e.target.value }))}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              const message = messageInputs[admin.user_id]?.trim();
                              if (message && message.length > 0) {
                                setSendingTo(admin.user_id);
                                await onSendMessage(admin.user_id, message);
                                setMessageInputs(prev => ({ ...prev, [admin.user_id]: '' }));
                                setSendingTo(null);
                              }
                            }
                          }}
                          className="flex-1 text-xs p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          maxLength={500}
                          disabled={sendingTo === admin.user_id}
                        />
                        <button
                          onClick={async () => {
                            const message = messageInputs[admin.user_id]?.trim();
                            if (message && message.length > 0) {
                              setSendingTo(admin.user_id);
                              await onSendMessage(admin.user_id, message);
                              setMessageInputs(prev => ({ ...prev, [admin.user_id]: '' }));
                              setSendingTo(null);
                            }
                          }}
                          disabled={!messageInputs[admin.user_id]?.trim() || sendingTo === admin.user_id}
                          className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Send message"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Backdrop when open on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
};
