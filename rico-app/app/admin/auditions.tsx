import React, { useMemo, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Modal, ScrollView, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, Users, Mail, Phone, ExternalLink, 
  Search, Filter, X, CheckCircle, Clock 
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useData } from '../../components/DataProvider';

export default function AdminAuditionsScreen() {
  const insets = useSafeAreaInsets();
  const { auditions, loading, refreshAll } = useData();
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'contacted'>('all');
  const [selected, setSelected] = useState<any>(null);

  const filteredData = useMemo(() => {
    if (filter === 'all') return auditions;
    return auditions.filter(a => a.status === filter);
  }, [auditions, filter]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={s.card} 
      activeOpacity={0.7}
      onPress={() => setSelected(item)}
    >
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName}>{item.full_name}</Text>
          <Text style={s.cardRole}>{item.instrument_role}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={s.cardFooter}>
        <Text style={s.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        <Text style={s.cardType}>{item.participant_type}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090015', '#03071a']} style={StyleSheet.absoluteFillObject} />
      
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Auditions</Text>
          <Text style={s.subtitle}>{auditions.length} Total Registrations</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['all', 'pending', 'reviewed', 'contacted'] as const).map(f => (
            <TouchableOpacity 
              key={f}
              style={[s.filterPill, filter === f && s.filterPillA]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterT, filter === f && s.filterTA]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && auditions.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator color="#22d3ee" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refreshAll} tintColor="#22d3ee" />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Users size={48} color="rgba(255,255,255,0.05)" />
              <Text style={s.emptyT}>No auditions found</Text>
            </View>
          }
        />
      )}

      {/* Details Modal */}
      <AuditionDetailsModal item={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
    reviewed: { bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.3)', text: '#22d3ee' },
    contacted: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#22c55e' }
  }[status] || { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: '#fff' };

  return (
    <View style={[s.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[s.badgeT, { color: colors.text }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

function AuditionDetailsModal({ item, onClose }: { item: any; onClose: () => void }) {
  if (!item) return null;

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { maxHeight: '85%' }]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={s.handle} />
          
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <X size={18} color="#fff" />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={s.sheetContent}>
            <View style={{ marginBottom: 24 }}>
              <StatusBadge status={item.status} />
              <Text style={s.sheetName}>{item.full_name}</Text>
              <Text style={s.sheetRole}>{item.instrument_role}</Text>
            </View>

            <View style={s.infoRow}>
              <View style={s.infoBox}>
                <Text style={s.infoLabel}>Year</Text>
                <Text style={s.infoVal}>{item.participant_type}</Text>
              </View>
              <View style={s.infoBox}>
                <Text style={s.infoLabel}>Applied On</Text>
                <Text style={s.infoVal}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </View>

            <View style={s.divider} />

            <DetailItem icon={Mail} label="Email" value={item.email} onPress={() => Linking.openURL(`mailto:${item.email}`)} />
            <DetailItem icon={Phone} label="Phone" value={item.phone} onPress={() => Linking.openURL(`tel:${item.phone}`)} />
            
            {item.portfolio_link && (
              <DetailItem 
                icon={ExternalLink} 
                label="Portfolio / Social" 
                value={item.portfolio_link} 
                onPress={() => Linking.openURL(item.portfolio_link)} 
                color="#22d3ee"
              />
            )}

            <View style={s.divider} />

            <Text style={s.sectionLabel}>EXPERIENCE & MOTIVATION</Text>
            <Text style={s.bio}>{item.experience_motivation || 'No additional information provided.'}</Text>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailItem({ icon: Icon, label, value, onPress, color }: any) {
  return (
    <TouchableOpacity style={s.detailItem} onPress={onPress}>
      <View style={s.detailIcon}>
        <Icon size={16} color={color || "rgba(255,255,255,0.4)"} />
      </View>
      <View>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={[s.detailVal, color && { color }]}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  
  filterRow: { paddingHorizontal: 20, marginBottom: 16 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterPillA: { backgroundColor: '#22d3ee', borderColor: '#22d3ee' },
  filterT: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
  filterTA: { color: '#07071a' },

  list: { padding: 20, gap: 12 },
  card: { padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardName: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  cardRole: { color: '#22d3ee', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  cardDate: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600' },
  cardType: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700' },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  badgeT: { fontSize: 9, fontWeight: '900' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 12 },
  emptyT: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '700' },

  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', backgroundColor: '#030712', borderTopWidth: 1, borderColor: 'rgba(34,211,238,0.1)' },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  closeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  sheetContent: { padding: 24 },
  sheetName: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 12, marginBottom: 2 },
  sheetRole: { color: '#22d3ee', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  infoRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  infoBox: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  infoVal: { color: '#fff', fontSize: 13, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 24 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  detailIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  detailLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  detailVal: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  bio: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22 },
});
