/**
 * Shared utility functions for time parsing and event status calculation.
 */

/**
 * Parses a time string (e.g., "10:30 AM", "14:00", "2:30 PM", "9 AM") into a numerical value (minutes since midnight).
 */
export const parseTimeValue = (timeStr: string | undefined): number => {
  if (!timeStr) return 0;
  
  const cleanStr = timeStr.trim().toUpperCase();
  // Handle range format "9 AM - 11 AM" by taking the start
  const rangePart = cleanStr.split(/[-–]| TO /)[0].trim();
  
  // Regex handles HH:MM AM/PM, HH AM/PM, HH:MM, and HH
  const match = rangePart.match(/(\d+)(?::(\d+))?(?:\s*(AM|PM))?/);
  
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || '0', 10);
  const ampm = match[3];

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};

/**
 * Calculates start and end minutes for an event based on its data.
 */
export const getEventTimeRange = (event: any) => {
  const start = parseTimeValue(event.time);
  const duration = parseInt(event.duration || '60', 10);
  return { start, end: start + duration };
};

/**
 * Determines the status of an event (Live, Upcoming, Ended) based on the current time and date.
 */
export const getEventStatus = (event: any, now: Date): 'Live' | 'Upcoming' | 'Ended' => {
  const { start, end } = getEventTimeRange(event);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const eventDate = new Date(event.date);
  const isToday = eventDate.toDateString() === now.toDateString();
  const isPast = eventDate < new Date(now.toDateString());
  
  if (isPast) return 'Ended';
  if (!isToday) return 'Upcoming';
  
  if (currentMinutes >= start && currentMinutes <= end) return 'Live';
  if (currentMinutes > end) return 'Ended';
  return 'Upcoming';
};
/**
 * Formats a time string into a more readable range (e.g. "10:30 AM - 11:30 AM")
 */
export const formatTimeRange = (startTimeStr: string | undefined, durationStr?: string): string => {
  if (!startTimeStr) return 'TBA';
  
  // If it already looks like a range (contains " - ", " TO ", etc.), return it as is
  if (startTimeStr.includes(' - ') || startTimeStr.includes(' – ') || startTimeStr.toUpperCase().includes(' TO ')) {
    return startTimeStr;
  }
  
  const startMinutes = parseTimeValue(startTimeStr);
  const duration = parseInt(durationStr || '60', 10);
  const endMinutes = startMinutes + duration;
  
  const formatTime = (minutes: number): string => {
    let h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  };
  
  return `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`;
};

/**
 * Returns a timer status string based on event timing.
 */
export const getTimerStatus = (event: any, now: Date): string => {
  return getEventStatus(event, now).toLowerCase();
};
