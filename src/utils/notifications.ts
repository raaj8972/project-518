/**
 * Real-Time Notifications System
 * Browser notifications for important security events
 */

type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface NotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  vibrate?: number[];
  silent?: boolean;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Show browser notification
 */
export function showNotification(
  title: string,
  options: NotificationOptions,
  type: NotificationType = 'info'
): void {
  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  const defaultOptions: NotificationOptions = {
    icon: '/logo.png',
    badge: '/badge.png',
    vibrate: getVibrationPattern(type),
    ...options
  };

  try {
    new Notification(title, defaultOptions);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

/**
 * Get vibration pattern based on notification type
 */
function getVibrationPattern(type: NotificationType): number[] {
  switch (type) {
    case 'success':
      return [200]; // Single short vibration
    case 'warning':
      return [200, 100, 200]; // Double vibration
    case 'error':
      return [400]; // Long vibration
    default:
      return [100]; // Very short
  }
}

/**
 * Notification presets for common events
 */
export const NotificationPresets = {
  
  validEntry: (name: string, passType: string) => {
    showNotification(
      '✅ Valid Entry',
      {
        body: `${name} (${passType.toUpperCase()})`,
        tag: 'scan-success',
        vibrate: [200]
      },
      'success'
    );
  },

  duplicateAttempt: (name: string) => {
    showNotification(
      '⚠️ Duplicate Scan Attempt',
      {
        body: `${name} was already scanned`,
        tag: 'duplicate-alert',
        vibrate: [200, 100, 200]
      },
      'warning'
    );
  },

  invalidPass: (reason?: string) => {
    showNotification(
      '❌ Invalid Pass',
      {
        body: reason || 'Pass rejected',
        tag: 'invalid-pass',
        vibrate: [400]
      },
      'error'
    );
  },

  offlineMode: () => {
    showNotification(
      '📴 Now Offline',
      {
        body: 'Scans will be queued for sync',
        tag: 'offline-mode',
        silent: true
      },
      'info'
    );
  },

  backOnline: (pendingCount: number) => {
    showNotification(
      '🌐 Connection Restored',
      {
        body: pendingCount > 0 
          ? `${pendingCount} scans will be synced`
          : 'All scans up to date',
        tag: 'online-mode'
      },
      'success'
    );
  },

  syncComplete: (count: number) => {
    showNotification(
      '✅ Sync Complete',
      {
        body: `${count} scans uploaded successfully`,
        tag: 'sync-complete'
      },
      'success'
    );
  },

  syncFailed: (failedCount: number) => {
    showNotification(
      '⚠️ Sync Failed',
      {
        body: `${failedCount} scans failed to upload`,
        tag: 'sync-failed',
        vibrate: [200, 100, 200]
      },
      'warning'
    );
  },

  capacityWarning: (current: number, max: number) => {
    const percentage = (current / max) * 100;
    showNotification(
      '⚠️ Capacity Warning',
      {
        body: `${percentage.toFixed(0)}% full (${current}/${max})`,
        tag: 'capacity-warning'
      },
      'warning'
    );
  },

  ruleViolation: (ruleName: string, message: string) => {
    showNotification(
      `🚫 ${ruleName}`,
      {
        body: message,
        tag: 'rule-violation',
        vibrate: [200, 100, 200]
      },
      'warning'
    );
  }
};

/**
 * Check if notifications are supported and enabled
 */
export function areNotificationsEnabled(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}
