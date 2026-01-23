import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Lock, Save, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '../ToastProvider';

export const CoordinatorPasswordManagement: React.FC = () => {
  const { events, updateEvent, adminUsers } = useData() as any;
  const { user } = useAuth();
  const { push } = useToast();
  
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
  const [passwords, setPasswords] = useState<{ [key: number]: string }>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  // Check if user is owner
  const isOwner = React.useMemo(() => {
    try {
      const uid = user?.id;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.is_primary));
    } catch {
      return false;
    }
  }, [user, adminUsers]);

  const handlePasswordChange = (eventId: number, value: string) => {
    setPasswords(prev => ({ ...prev, [eventId]: value }));
  };

  const handleSave = async (eventId: number) => {
    const newPassword = passwords[eventId];
    if (!newPassword || !newPassword.trim()) {
      push({ message: 'Password cannot be empty', type: 'error' });
      return;
    }

    try {
      setSavingId(eventId);
      await updateEvent(eventId, { coordinator_password: newPassword } as any);
      push({ message: 'Password updated successfully!', type: 'success' });
      // Clear the local edit
      setPasswords(prev => {
        const updated = { ...prev };
        delete updated[eventId];
        return updated;
      });
    } catch (error) {
      console.error('Error updating password:', error);
      push({ message: 'Failed to update password', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const toggleShowPassword = (eventId: number) => {
    setShowPasswords(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const getCurrentPassword = (event: any) => {
    return passwords[event.id] !== undefined ? passwords[event.id] : (event.coordinator_password || '');
  };

  const hasUnsavedChanges = (event: any) => {
    return passwords[event.id] !== undefined && passwords[event.id] !== (event.coordinator_password || '');
  };

  if (!isOwner) {
    return (
      <div className="p-8 bg-white rounded-lg shadow">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-semibold text-lg">Owner Access Required</h3>
            <p className="text-sm text-gray-600">Only the owner can manage coordinator passwords.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Coordinator Password Management</h2>
            <p className="text-sm text-gray-600">Manage login passwords for event coordinators</p>
          </div>
        </div>

        <div className="space-y-4">
          {events && events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No events found</p>
          ) : (
            events.map((event: any) => (
              <div 
                key={event.id} 
                className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                <div className="flex flex-col gap-4">
                  {/* Event Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500">{event.category}</p>
                      {event.coordinator_name && (
                        <p className="text-xs text-gray-400 mt-1">
                          Coordinator: {event.coordinator_name}
                        </p>
                      )}
                    </div>
                    {hasUnsavedChanges(event) && (
                      <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                        Unsaved
                      </span>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Login Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords[event.id] ? 'text' : 'password'}
                          value={getCurrentPassword(event)}
                          onChange={(e) => handlePasswordChange(event.id, e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-purple-300 bg-purple-50 rounded-lg text-sm font-mono text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="123@Rajaevent"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowPassword(event.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords[event.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSave(event.id)}
                      disabled={!hasUnsavedChanges(event) || savingId === event.id}
                      className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                        hasUnsavedChanges(event)
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {savingId === event.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 How It Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each event can have a unique password for its coordinator</li>
          <li>• Coordinators use this password to log in at <code className="bg-blue-100 px-1 py-0.5 rounded">/coordinator</code></li>
          <li>• Default password for new events: <code className="bg-blue-100 px-1 py-0.5 rounded">123@Rajaevent</code></li>
          <li>• Only you (the owner) can change these passwords</li>
        </ul>
      </div>
    </div>
  );
};
