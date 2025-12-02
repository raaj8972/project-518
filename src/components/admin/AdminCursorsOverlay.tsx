import React from 'react';
import { MousePointer2 } from 'lucide-react';
import { AdminPresence } from '../../hooks/useAdminPresence';

interface AdminCursorsOverlayProps {
  admins: AdminPresence[];
  hiddenCursors?: string[];
}

// Generate consistent color for each admin based on email
const getAdminColor = (email: string): string => {
  const colors = [
    '#3B82F6', // blue-500
    '#A855F7', // purple-500
    '#22C55E', // green-500
    '#F97316', // orange-500
    '#EC4899', // pink-500
    '#6366F1', // indigo-500
    '#14B8A6', // teal-500
    '#EF4444', // red-500
  ];
  
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const AdminCursorsOverlay: React.FC<AdminCursorsOverlayProps> = ({ admins, hiddenCursors = [] }) => {
  // Filter for active admins with cursor data
  const activeCursors = admins.filter(admin => {
    const lastActivity = new Date(admin.last_activity_at).getTime();
    const isActive = Date.now() - lastActivity < 120000; // 2 minutes tolerance
    const isHidden = hiddenCursors.includes(admin.user_id);
    return isActive && !isHidden && admin.cursor_x !== undefined && admin.cursor_y !== undefined;
  });

  if (activeCursors.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {activeCursors.map(admin => (
        <div
          key={admin.id}
          className="absolute transition-all duration-200 ease-out will-change-transform flex flex-col items-start"
          style={{
            left: `${(admin.cursor_x || 0) * 100}%`,
            top: `${(admin.cursor_y || 0) * 100}%`,
            // transform: `translate(-50%, -50%)` // Optional: center cursor? No, standard is top-left
          }}
        >
          <MousePointer2 
            size={24} 
            className="drop-shadow-md" 
            fill={getAdminColor(admin.email || '')} 
            color="white" 
            strokeWidth={1.5}
          />
          <div 
            className="ml-4 -mt-2 px-2 py-1 rounded-full text-[10px] font-bold text-white shadow-md whitespace-nowrap"
            style={{ backgroundColor: getAdminColor(admin.email || '') }}
          >
            {admin.email?.split('@')[0]}
            {admin.is_typing && <span className="ml-1 opacity-75 animate-pulse">...</span>}
          </div>
        </div>
      ))}
    </div>
  );
};
