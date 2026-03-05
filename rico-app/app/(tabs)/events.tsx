import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, Modal, Pressable, Image,
  TextInput, Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import {
  Calendar, Clock, Users, MapPin, Zap, FileText,
  ChevronDown, ChevronUp, X, UserPlus, Search, Phone
} from 'lucide-react-native';
import { supabase } from '../../supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useData } from '@/components/DataProvider';
import { Event, EventCoordinator, EventCategory } from '@/types/data';

const { width } = Dimensions.get('window');

// Structured rules helpers
type RuleBlock = { kind: 'points'; style?: 'bullet' | 'number'; title?: string; items: string[] };
type RuleSection = { heading?: string; blocks?: RuleBlock[] };
const STRUCTURED_MARK = '__SR__';

const unpackStructured = (rules: string[] | string | null | undefined): RuleSection[] => {
  try {
    if (!rules) return [];
    const rArray = Array.isArray(rules) ? rules : [rules];
    if (rArray.length !== 1 || !rArray[0].startsWith(STRUCTURED_MARK)) return [];
    const s = rArray[0].slice(STRUCTURED_MARK.length);
    const parsed = JSON.parse(s);
    if (parsed?.v === 2 && Array.isArray(parsed?.sections)) return parsed.sections as RuleSection[];
    return [];
  } catch { return []; }
};

// ─── Category color map ───────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Medical:   '#a78bfa',
  Cultural:  '#f43f5e',
  Sports:    '#22d3ee',
  Technical: '#fbbf24',
  Clinical:  '#34d399',
};
const getCatColor = (cat: string) => CATEGORY_COLORS[cat] || '#818cf8';

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, onPress, onRegister }: { event: Event; onPress: () => void; onRegister: () => void }) {
  const color = getCatColor(event.category);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Poster / Video */}
      {event.motion_poster_url ? (
        <Video
          source={{ uri: event.motion_poster_url }}
          style={styles.cardPoster}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          usePoster={!!event.image}
          posterSource={{ uri: event.image || undefined }}
          posterStyle={{ resizeMode: 'cover' }}
          progressUpdateIntervalMillis={5000} // Reduces bridge traffic as we don't need accurate progress here
        />
      ) : event.image ? (
        <Image source={{ uri: event.image }} style={styles.cardPoster} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[`${color}44`, 'rgba(5,5,15,0.95)']}
          style={styles.cardPosterFallback}
        />
      )}

      {/* Category badge */}
      <View style={[styles.categoryBadge, { borderColor: `${color}77` }]}>
        <Zap size={9} color={color} />
        <Text style={[styles.categoryText, { color }]}>{(event.category || 'Event').toUpperCase()}</Text>
      </View>

      {/* Registration pill */}
      {event.registration_open && (
        <View style={styles.regOpenPill}>
          <View style={styles.regDot} />
          <Text style={styles.regText}>OPEN</Text>
        </View>
      )}

      {/* Content */}
      <LinearGradient
        colors={['transparent', 'rgba(5,5,10,0.6)', 'rgba(5,5,10,0.98)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>

        <View style={styles.cardMeta}>
          {event.date ? (
            <View style={styles.metaRow}>
              <Calendar size={11} color="rgba(255,255,255,0.5)" />
              <Text style={styles.metaText}>{event.date}</Text>
            </View>
          ) : null}
          {event.venue ? (
            <View style={styles.metaRow}>
              <MapPin size={11} color="rgba(255,255,255,0.5)" />
              <Text style={styles.metaText} numberOfLines={1}>{event.venue}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.viewDetails, { color }]}>VIEW DETAILS →</Text>
          {event.registration_open && (
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                onRegister();
              }}
              style={[styles.regBtn, { borderColor: `${color}99`, backgroundColor: `${color}11` }]}
            >
              <UserPlus size={10} color={color} />
              <Text style={[styles.regBtnText, { color }]}>REGISTER</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Rules Modal ──────────────────────────────────────────────────────────────
function RulesModal({ event, coordinators, onClose, onRegister }: { event: Event | null; coordinators: EventCoordinator[]; onClose: () => void; onRegister: () => void }) {
  if (!event) return null;
  const color = getCatColor(event.category);
  const sections = unpackStructured(event.rules);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={60} tint="dark" style={styles.modalBlur} />
        <View style={styles.modalSheet}>
          <LinearGradient
            colors={[`${color}22`, 'rgba(5,5,10,0.98)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.modalAccent, { backgroundColor: color, shadowColor: color, shadowRadius: 10, shadowOpacity: 0.5 }]} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalCat, { color }]}>{(event.category || 'Event').toUpperCase()}</Text>
              <Text style={styles.modalTitle} numberOfLines={2}>{event.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Description */}
            <Text style={styles.modalDesc}>{event.description}</Text>

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              {[
                { icon: Calendar, label: 'Date',      val: event.date },
                { icon: Clock,    label: 'Time',      val: event.time },
                { icon: MapPin,   label: 'Venue',     val: event.venue },
                { icon: Users,    label: 'Team Size', val: event.participants },
              ].map(({ icon: Icon, label, val }) => val ? (
                <View key={label} style={styles.detailItem}>
                  <Icon size={14} color={color} />
                  <View>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailVal}>{val}</Text>
                  </View>
                </View>
              ) : null)}
            </View>

            {/* Structured Rules */}
            {sections.length > 0 ? (
              <View style={styles.rulesSection}>
                <View style={styles.rulesHeader}>
                  <FileText size={16} color={color} />
                  <Text style={[styles.rulesTitle, { color }]}>RULES & REGULATIONS</Text>
                </View>
                {sections.map((section, si) => (
                  <View key={si} style={{ marginBottom: 16 }}>
                    {section.heading && (
                      <Text style={[styles.sectionHeading, { color }]}>{(section.heading || 'Rules').toUpperCase()}</Text>
                    )}
                    {section.blocks?.map((block, bi) => (
                      <View key={bi} style={{ marginLeft: 4 }}>
                        {block.title && <Text style={styles.blockTitle}>{block.title}</Text>}
                        {block.items.map((item, ii) => (
                          <View key={ii} style={styles.ruleItem}>
                            <View style={[styles.bullet, { backgroundColor: color }]} />
                            <Text style={styles.ruleText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : event.rules ? (
              <View style={styles.rulesSection}>
                <View style={styles.rulesHeader}>
                  <FileText size={16} color={color} />
                  <Text style={[styles.rulesTitle, { color }]}>RULES & REGULATIONS</Text>
                </View>
                {(Array.isArray(event.rules) ? event.rules : [event.rules]).map((rule, i) => (
                  <View key={i} style={styles.ruleItem}>
                    <Text style={[styles.ruleNum, { color }]}>{i + 1}.</Text>
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Coordinators */}
            {(coordinators.length > 0 || event.coordinator_name) && (
              <View style={styles.rulesSection}>
                <View style={styles.rulesHeader}>
                  <Phone size={16} color={color} />
                  <Text style={[styles.rulesTitle, { color }]}>EVENT COORDINATORS</Text>
                </View>
                <View style={styles.coordGrid}>
                  {event.coordinator_name && !coordinators.some(c => c.name === event.coordinator_name) && (
                    <TouchableOpacity 
                      style={[styles.coordCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                      onPress={() => event.coordinator_phone && Linking.openURL(`tel:${event.coordinator_phone}`)}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={styles.coordName}>{event.coordinator_name} (Lead)</Text>
                        {event.coordinator_phone && (
                          <View style={styles.phoneRow}>
                            <Phone size={12} color={color} />
                            <Text style={[styles.coordPhone, { color, fontWeight: '800' }]}>{event.coordinator_phone}</Text>
                          </View>
                        )}
                      </View>
                      {event.coordinator_phone && (
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
                          <Phone size={16} color={color} />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  {coordinators.map((coord) => (
                    <TouchableOpacity 
                      key={coord.id} 
                      style={[styles.coordCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                      onPress={() => coord.phone && Linking.openURL(`tel:${coord.phone}`)}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={styles.coordName}>{coord.name}</Text>
                        {coord.phone && (
                          <View style={styles.phoneRow}>
                            <Phone size={12} color={color} />
                            <Text style={[styles.coordPhone, { color, fontWeight: '800' }]}>{coord.phone}</Text>
                          </View>
                        )}
                      </View>
                      {coord.phone && (
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
                          <Phone size={16} color={color} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Register button */}
            {event.registration_open && (
              <TouchableOpacity 
                style={[styles.bigRegBtn, { borderColor: `${color}88` }]} 
                activeOpacity={0.85}
                onPress={() => {
                  onClose();
                  onRegister();
                }}
              >
                <LinearGradient
                  colors={[`${color}44`, `${color}11`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <UserPlus size={20} color={color} />
                <Text style={[styles.bigRegText, { color }]}>REGISTER FOR THIS EVENT</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events: rawEvents, eventCoordinators: rawCoordinators, eventCategories: rawCategories, loading, refreshAll } = useData();
  
  // Guard against nulls/undefined in data arrays
  const events = useMemo(() => (rawEvents || []).filter(e => e && e.id), [rawEvents]);
  const coordinators = useMemo(() => (rawCoordinators || []).filter(c => c && c.id), [rawCoordinators]);

  const categories = useMemo(() => {
    return (rawCategories || []).filter(c => c && c.id && c.name);
  }, [rawCategories]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].name);
    } else if (selectedCategory && !categories.find(c => c.name === selectedCategory) && categories.length > 0) {
      setSelectedCategory(categories[0].name);
    }
  }, [categories, selectedCategory]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return events.filter(e => {
      // If no search query, strictly filter by the selected category tab
      if (!q) {
        return selectedCategory === '' || e.category === selectedCategory;
      }
      
      // If there IS a search query, search globally across ALL categories
      // Split query into terms for advanced multi-word matching
      const searchTerms = q.split(/\s+/);
      const title = (e.title || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      const desc = (e.description || '').toLowerCase();
      
      // Every typed word must match *something* in the event
      return searchTerms.every(term => 
        title.includes(term) || cat.includes(term) || desc.includes(term)
      );
    });
  }, [events, selectedCategory, searchQuery]);

  const handleRegister = (eventId: number) => {
    router.push({
      pathname: '/registration/[id]',
      params: { id: eventId }
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>EVENTS</Text>
          <Text style={styles.headerSub}>Ricorrenza 2026 · {events.length} competitions</Text>
        </View>
      </View>

      {/* Search & Categories Overlay */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Search size={16} color="rgba(255,255,255,0.4)" />
          <TextInput
            placeholder="Search events or categories..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
          style={styles.pillsScrollView}
        >
          {categories.map(catObj => {
            const cat = catObj.name;
            const active = selectedCategory === cat;
            const color = catObj.hex_identity || getCatColor(cat);
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.pill,
                  active && { backgroundColor: `${color}22`, borderColor: `${color}88` },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, active && { color, fontWeight: '900' }]}>{cat.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#818cf8" />
          <Text style={styles.loadingText}>SYNCING REAL-TIME DATA...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          <View style={styles.listHeader}>
            <Text style={styles.countText}>{filtered.length} RESULTS</Text>
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearFilters}>CLEAR SEARCH</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Search size={48} color="rgba(255,255,255,0.1)" />
              <Text style={styles.emptyTitle}>NO EVENTS FOUND</Text>
              <Text style={styles.emptySub}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            filtered.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                onPress={() => setSelectedEvent(event)} 
                onRegister={() => handleRegister(event.id)}
              />
            ))
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <RulesModal 
          event={selectedEvent} 
          coordinators={coordinators.filter(c => c.event_id === selectedEvent.id)}
          onClose={() => setSelectedEvent(null)} 
          onRegister={() => handleRegister(selectedEvent.id)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050a' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff', fontSize: 36, fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: 'rgba(129,140,248,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12,
    fontWeight: '700', letterSpacing: 0.5, marginTop: -2,
  },

  filterSection: { paddingBottom: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    paddingVertical: 8,
  },

  pillsScrollView: { maxHeight: 50 },
  pillsRow: {
    paddingHorizontal: 20, paddingVertical: 10, gap: 10,
  },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  pillText: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5,
  },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },

  list: { paddingHorizontal: 16, paddingTop: 8 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  countText: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900',
    letterSpacing: 2,
  },
  clearFilters: { color: '#818cf8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  emptyState: { 
    alignItems: 'center', justifyContent: 'center', 
    paddingTop: 80, gap: 12 
  },
  emptyTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  emptySub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600' },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    width: '100%', borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#0a0a1a',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20, minHeight: width * 1.35, // 4:5 Portrait Aspect Ratio
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20,
  },
  cardPoster: {
    position: 'absolute', top: 0, left: 0, right: 0, height: width * 1.35 - 40,
  },
  cardPosterFallback: {
    position: 'absolute', top: 0, left: 0, right: 0, height: width * 1.35 - 40,
  },
  categoryBadge: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  regOpenPill: {
    position: 'absolute', top: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(5,20,10,0.85)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)',
  },
  regDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  regText: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 400,
  },
  cardContent: { padding: 20, marginTop: width * 1.35 - 140 },
  cardTitle: {
    color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 10,
  },
  cardMeta: { gap: 6, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewDetails: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  regBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
    borderWidth: 1,
  },
  regBtnText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBlur: { ...StyleSheet.absoluteFillObject },
  modalSheet: {
    height: '92%', borderTopLeftRadius: 36, borderTopRightRadius: 36,
    overflow: 'hidden', backgroundColor: '#050510',
    borderWidth: 1, borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)', padding: 24,
  },
  modalAccent: { height: 4, width: 40, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  modalCat: { fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  modalTitle: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 32, letterSpacing: -0.5 },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalDesc: {
    color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 24, marginBottom: 24,
    fontWeight: '500',
  },
  detailsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28,
  },
  detailItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    width: (width - 60) / 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, padding: 12,
  },
  detailLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  detailVal: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 3 },
  rulesSection: { marginBottom: 32 },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  rulesTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  sectionHeading: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 12, marginTop: 4, opacity: 0.8 },
  blockTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  ruleItem: {
    flexDirection: 'row', gap: 10, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12,
  },
  bullet: { width: 4, height: 4, borderRadius: 2, marginTop: 8 },
  ruleNum: { fontSize: 13, fontWeight: '900', minWidth: 24 },
  ruleText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20, flex: 1, fontWeight: '500' },
  
  coordGrid: { gap: 10 },
  coordCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14,
  },
  coordName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  coordPhone: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },

  bigRegBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 18, borderRadius: 22,
    borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  bigRegText: { fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
