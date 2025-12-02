import React, { useEffect, useState } from 'react';
import { X, User } from 'lucide-react';
import { AdminMessage } from '../hooks/useAdminMessages';

interface AdminMessageToastProps {
  message: AdminMessage;
  senderEmail: string | null;
  onDismiss: (messageId: number) => void;
}

export const AdminMessageToast: React.FC<AdminMessageToastProps> = ({
  message,
  senderEmail,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(message.id);
    }, 300); // Match animation duration
  };

  const senderName = senderEmail?.split('@')[0] || 'Owner';

  return (
    <div
      className={`fixed top-20 right-4 z-[60] w-80 bg-white rounded-lg shadow-2xl border-2 border-yellow-400 transition-all duration-300 ${
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-black">
          <User size={18} />
          <span className="font-bold text-sm">Message from {senderName}</span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-black hover:bg-yellow-600 p-1 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>

      {/* Message Content */}
      <div className="p-4">
        <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">
          {message.message}
        </p>
        <div className="mt-2 text-xs text-gray-500">
          {new Date(message.created_at).toLocaleTimeString()}
        </div>
      </div>

      {/* Action Button */}
      <div className="px-4 pb-3">
        <button
          onClick={handleDismiss}
          className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded transition-colors text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

interface AdminMessageToastContainerProps {
  messages: AdminMessage[];
  onDismiss: (messageId: number) => void;
  getUserEmail: (userId: string) => string | null;
}

export const AdminMessageToastContainer: React.FC<AdminMessageToastContainerProps> = ({
  messages,
  onDismiss,
  getUserEmail
}) => {
  return (
    <>
      {messages.map((message, index) => (
        <div
          key={message.id}
          style={{ top: `${80 + index * 20}px` }} // Stack multiple toasts
        >
          <AdminMessageToast
            message={message}
            senderEmail={getUserEmail(message.from_user_id)}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </>
  );
};
