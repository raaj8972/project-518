/**
 * Validation Rules Engine
 * Flexible, configurable validation rules for entry passes
 */

export interface ValidationRule {
  id: string;
  rule_name: string;
  rule_type: 'time_window' | 'capacity' | 'day_restriction' | 'date_restriction' | 'custom';
  pass_type?: string; // null = applies to all types
  config: {
    // Time window
    startTime?: string; // HH:MM format
    endTime?: string;   // HH:MM format
    
    // Capacity
    maxCapacity?: number;
    
    // Day restriction (Weekly)
    allowedDays?: number[]; // 0-6, Sunday-Saturday
    
    // Date restriction (Specific Dates)
    allowedDates?: string[]; // YYYY-MM-DD format
    
    // Custom
    customFunction?: string;
  };
  is_active: boolean;
  priority: number; // Higher = evaluated first
  error_message?: string;
}

/**
 * Evaluate all active rules for a pass
 */
export async function evaluateRules(
  pass: { pass_type: string; pass_token: string },
  rules: ValidationRule[]
): Promise<{ valid: boolean; reason?: string }> {
  
  // Sort by priority (highest first)
  const activeRules = rules
    .filter(r => r.is_active)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of activeRules) {
    // Skip if rule doesn't apply to this pass type
    if (rule.pass_type && rule.pass_type !== pass.pass_type) {
      continue;
    }

    const result = await evaluateRule(pass, rule);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Evaluate a single rule
 */
async function evaluateRule(
  _pass: any,
  rule: ValidationRule
): Promise<{ valid: boolean; reason?: string }> {
  
  switch (rule.rule_type) {
    case 'time_window':
      return evaluateTimeWindow(rule);
    
    case 'capacity':
      return await evaluateCapacity(rule);
    
    case 'day_restriction':
      return evaluateDayRestriction(rule);
      
    case 'date_restriction':
      return evaluateDateRestriction(rule);
    
    default:
      return { valid: true };
  }
}

/**
 * Check if current time is within allowed window
 */
function evaluateTimeWindow(rule: ValidationRule): { valid: boolean; reason?: string } {
  const { startTime, endTime } = rule.config;
  
  if (!startTime || !endTime) {
    return { valid: true };
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  if (currentTime < startTime || currentTime > endTime) {
    return {
      valid: false,
      reason: rule.error_message || `Pass only valid between ${startTime} and ${endTime}`
    };
  }

  return { valid: true };
}

/**
 * Check if venue has reached capacity
 */
async function evaluateCapacity(rule: ValidationRule): Promise<{ valid: boolean; reason?: string }> {
  const { maxCapacity } = rule.config;
  
  if (!maxCapacity) {
    return { valid: true };
  }

  // Get current count from stats
  const currentCount = await getCurrentScanCount();

  if (currentCount >= maxCapacity) {
    return {
      valid: false,
      reason: rule.error_message || `Venue at maximum capacity (${maxCapacity})`
    };
  }

  return { valid: true };
}

/**
 * Check if today is an allowed day (0-6)
 */
function evaluateDayRestriction(rule: ValidationRule): { valid: boolean; reason?: string } {
  const { allowedDays } = rule.config;
  
  if (!allowedDays || allowedDays.length === 0) {
    return { valid: true };
  }

  const today = new Date().getDay(); // 0-6

  if (!allowedDays.includes(today)) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const allowedDayNames = allowedDays.map(d => dayNames[d]).join(', ');
    
    return {
      valid: false,
      reason: rule.error_message || `Pass only valid on: ${allowedDayNames}`
    };
  }

  return { valid: true };
}

/**
 * Check if today is an allowed specific date (YYYY-MM-DD)
 */
function evaluateDateRestriction(rule: ValidationRule): { valid: boolean; reason?: string } {
  const { allowedDates } = rule.config;
  
  if (!allowedDates || allowedDates.length === 0) {
    return { valid: true };
  }

  // Get local date string YYYY-MM-DD in Asia/Kolkata
  const today = new Date();
  const localDate = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  if (!allowedDates.includes(localDate)) {
    // Format dates for display
    const readableDates = allowedDates.map(d => new Date(d).toLocaleDateString()).join(', ');
    
    return {
      valid: false,
      reason: rule.error_message || `Pass only valid on: ${readableDates}`
    };
  }

  return { valid: true };
}

/**
 * Get current scan count (total valid scans today)
 */
async function getCurrentScanCount(): Promise<number> {
  try {
    // Try to get from IndexedDB first (offline)
    const { db } = await import('./offlineDB');
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    // Count scans from today
    const scans = await db.pending_scans
      .where('timestamp')
      .startsWith(todayStr)
      .and(scan => scan.result === 'valid')
      .count();
      
    return scans;
  } catch (error) {
    console.error('Failed to get scan count:', error);
    return 0;
  }
}

/**
 * Default validation rules (can be overridden from database)
 */
export const DEFAULT_RULES: ValidationRule[] = [
  {
    id: 'default-vip-time',
    rule_name: 'VIP Early Access',
    rule_type: 'time_window',
    pass_type: 'vip',
    config: {
      startTime: '16:00', // 4 PM
      endTime: '23:59'    // 11:59 PM
    },
    is_active: false, // Disabled by default
    priority: 10,
    error_message: 'VIP passes are only valid from 4 PM onwards'
  },
  {
    id: 'default-capacity',
    rule_name: 'Venue Capacity Limit',
    rule_type: 'capacity',
    config: {
      maxCapacity: 500
    },
    is_active: false, // Disabled by default
    priority: 5,
    error_message: 'Venue has reached maximum capacity'
  },
  // Example: Event Day 1 (Dec 30th) Restriction
  {
    id: 'day-1-access',
    rule_name: 'Event Day 1 Only',
    rule_type: 'date_restriction',
    pass_type: 'regular', // Applies to regular passes
    config: {
      allowedDates: ['2025-12-30'] // Only valid on Dec 30th
    },
    is_active: false, // Enable to enforce day-specific scanning
    priority: 20,
    error_message: 'This pass is only valid for Day 1 (Dec 30)'
  }
];
