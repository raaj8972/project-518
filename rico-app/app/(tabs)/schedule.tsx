import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Calendar, MapPin, Timer, AlertCircle } from 'lucide-react-native';
import { supabase } from '../../supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useData } from '@/components/DataProvider';
import { ScheduleDay, ScheduleEvent } from '@/types/data';

const { width, height } = Dimensions.get('window');



// ─── Helpers ────────────────────────────────────────────────────────────

// Parse time string (e.g., "10:30 AM") to minutes from midnight
const parseTimeValue = (timeStr: string): number => {
  if (!timeStr) return 9999;
  try {
    const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const ap = match[3]?.toUpperCase();
      
      if (ap) {
        if (ap === 'PM' && h < 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
      } else {
        if (h < 7) h += 12; // Heuristic: < 7 is PM
      }
      return h * 60 + m;
    }
  } catch (e) { return 9999; }
  return 9999;
};

// Calculate status: LIVE, COMING SOON, or ENDED
const getTimerStatus = (range: { start: Date; end: Date } | null, now: Date) => {
  if (!range) return null;
  const { start, end } = range;
  const nowMs = now.getTime();
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (nowMs < startMs) {
    const diff = startMs - nowMs;
    const diffHours = diff / (1000 * 60 * 60);
    if (diffHours < 1) {
      const mins = Math.floor(diff / (1000 * 60));
      return { label: `STARTS IN ${mins} MIN`, color: '#fbbf24' };
    }
    if (diffHours < 24) {
      return { label: `STARTS IN ${Math.floor(diffHours)} HR`, color: '#22d3ee' };
    }
    return null;
  }

  if (nowMs >= startMs) {
    if (nowMs < endMs) {
      return { label: 'LIVE NOW', color: '#ef4444' };
    } else {
      return { label: 'ENDED', color: 'rgba(255,255,255,0.2)' };
    }
  }
  return null;
};

// Get Start and End dates from time string + duration
const getEventTimeRange = (dateStr: string, timeStr: string, durationStr?: string): { start: Date; end: Date } | null => {
  if (!timeStr) return null;
  try {
    const parts = timeStr.split(/\s*(?:-|to)\s*/i);
    const startVal = parseTimeValue(parts[0]);
    if (startVal === 9999) return null;

    const startDate = new Date(dateStr);
    startDate.setHours(Math.floor(startVal / 60), startVal % 60, 0, 0);

    let endDate = new Date(startDate);
    if (parts.length > 1 && parts[1]) {
      const endVal = parseTimeValue(parts[1]);
      if (endVal !== 9999) {
        endDate.setHours(Math.floor(endVal / 60), endVal % 60, 0, 0);
        if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
        return { start: startDate, end: endDate };
      }
    }

    if (durationStr) {
      const durationMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour|min|m)/i);
      if (durationMatch) {
        const val = parseFloat(durationMatch[1]);
        const isMin = durationStr.match(/(?:min|m)/i) && !durationStr.match(/(?:h)/i);
        endDate.setMinutes(startDate.getMinutes() + (isMin ? val : val * 60));
        return { start: startDate, end: endDate };
      }
    }

    endDate.setHours(startDate.getHours() + 2);
    return { start: startDate, end: endDate };
  } catch { return null; }
};

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function TimelineCard({ event, now, dayDate, themeColor }: { event: ScheduleEvent; now: Date; dayDate: string; themeColor: string }) {
  const range = useMemo(() => getEventTimeRange(dayDate, event.time || '', event.duration || ''), [dayDate, event.time, event.duration]);
  const status = getTimerStatus(range, now);
  
  return (
    <View style={styles.timelineRow}>
      {/* Time column */}
      <View style={styles.timeCol}>
        <Text style={[styles.timeText, { color: themeColor }]}>{event.time || '—'}</Text>
        {status && (
          <View style={styles.statusRow}>
            <Timer size={8} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        )}
        <View style={[styles.dot, { backgroundColor: themeColor }]} />
      </View>

      <View style={[styles.line, { backgroundColor: `${themeColor}22` }]} />

      {/* Content card */}
      <BlurView intensity={20} tint="dark" style={styles.card}>
        <LinearGradient
          colors={[`${themeColor}15`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.cardAccent, { backgroundColor: themeColor }]} />
        
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{event.title}</Text>
          {status?.label === 'LIVE NOW' && (
            <View style={styles.livePulse} />
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <MapPin size={10} color="rgba(255,255,255,0.4)" />
            <Text style={styles.metaText}>{event.venue || 'TBA'}</Text>
          </View>
          {event.type && (
            <View style={[styles.typePill, { borderColor: `${themeColor}44` }]}>
              <Text style={[styles.typeText, { color: themeColor }]}>{(event.type || 'Event').toUpperCase()}</Text>
            </View>
          )}
        </View>
      </BlurView>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { schedule, siteSettings, loading } = useData();
  const [scheduleType, setScheduleType] = useState<'prelims' | 'mains'>('prelims');
  const [now, setNow] = useState(new Date());

  // Use the admin's default schedule type if explicitly set
  useEffect(() => {
    if (siteSettings?.default_schedule_type && (siteSettings.default_schedule_type === 'prelims' || siteSettings.default_schedule_type === 'mains')) {
      setScheduleType(siteSettings.default_schedule_type);
    }
  }, [siteSettings?.default_schedule_type]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const filteredSchedule = useMemo(() => 
    schedule.filter(s => s.schedule_type === scheduleType),
    [schedule, scheduleType]
  );

  const themeColor = scheduleType === 'prelims' ? '#22d3ee' : '#a855f7';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background Decor */}
      <View style={styles.gradTop} pointerEvents="none" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textShadowColor: themeColor }]}>TIMELINE</Text>
        <Text style={styles.headerSub}>CHRONOLOGICAL EVENT TRACKER</Text>
      </View>

      {/* Type Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity 
          onPress={() => setScheduleType('prelims')}
          style={[styles.toggleBtn, scheduleType === 'prelims' && { backgroundColor: '#22d3ee', borderColor: '#22d3ee' }]}
        >
          <Text style={[styles.toggleText, scheduleType === 'prelims' && { color: '#000' }]}>PRELIMS</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setScheduleType('mains')}
          style={[styles.toggleBtn, scheduleType === 'mains' && { backgroundColor: '#a855f7', borderColor: '#a855f7' }]}
        >
          <Text style={[styles.toggleText, scheduleType === 'mains' && { color: '#000' }]}>MAINS</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={themeColor} />
          <Text style={[styles.loadingText, { color: themeColor }]}>SYNCING TEMPORAL DATA...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {filteredSchedule.length === 0 ? (
            <View style={styles.empty}>
              <AlertCircle size={48} color="rgba(255,255,255,0.1)" />
              <Text style={styles.emptyText}>NO DATA FOUND FOR THIS PHASE</Text>
              <Text style={styles.emptySub}>Schedule will be broadcasted soon.</Text>
            </View>
          ) : (
            filteredSchedule.map((day) => (
              <View key={day.id} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <View style={[styles.dayBar, { backgroundColor: themeColor }]} />
                  <Text style={styles.dayTitle}>{day.date}</Text>
                  <Text style={[styles.daySub, { color: themeColor }]}>{(day.day || 'Day').toUpperCase()}</Text>
                </View>

                {day.events?.map((evt) => (
                  <TimelineCard 
                    key={evt.id} 
                    event={evt} 
                    now={now} 
                    dayDate={day.date} 
                    themeColor={themeColor} 
                  />
                ))}
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  gradTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.4,
    opacity: 0.15, backgroundColor: '#0f172a'
  },
  header: { padding: 25, paddingBottom: 15 },
  headerTitle: {
    color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', 
    letterSpacing: 2, marginTop: 4
  },
  toggleRow: {
    flexDirection: 'row', paddingHorizontal: 25, gap: 12, marginBottom: 25
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center'
  },
  toggleText: { color: 'rgba(255,255,255,0.6)', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  
  scroll: { paddingHorizontal: 25 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  loadingText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
  daySection: { marginBottom: 35 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dayBar: { width: 4, height: 24, borderRadius: 2 },
  dayTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  daySub: { fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  timelineRow: { flexDirection: 'row', marginBottom: 15, position: 'relative' },
  timeCol: { width: 65, alignItems: 'center', paddingTop: 10 },
  timeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 10, zIndex: 2, borderWidth: 2, borderColor: '#030303' },
  line: { position: 'absolute', top: 30, bottom: -15, left: 32, width: 2, zIndex: 1 },
  
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  statusText: { fontSize: 7, fontWeight: '900' },

  card: {
    flex: 1, padding: 16, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginLeft: 10
  },
  cardAccent: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1, paddingRight: 10 },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500' },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  typeText: { fontSize: 8, fontWeight: '900' },

  empty: { padding: 60, alignItems: 'center', gap: 15 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  emptySub: { color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center' }
});
