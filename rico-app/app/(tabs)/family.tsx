import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, Image, Modal,
  Linking, Platform, Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Crown, Users, Star, Heart, Instagram, Youtube, 
  Phone, Mail, X, Shield, ExternalLink, Sparkles
} from 'lucide-react-native';
import { supabase } from '../../supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/components/DataProvider';
import { FacultyHead as Faculty, CoreCommittee as Committee, CoreTeamMember as Member } from '@/types/data';

const { width, height } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;



// ─── Helpers ─────────────────────────────────────────────────────────────
const isLeadWebDevRole = (role?: string | null, committeeName?: string) => {
  const rl = String(role || '').toLowerCase();
  const cn = String(committeeName || '').toLowerCase();
  if (!rl) return false;
  return ['lead developer','lead web developer','principal developer','principal engineer'].some(p => rl.includes(p)) && cn.includes('web');
};

// ─── Sub-components ─────────────────────────────────────────────────────────────

function SocialButton({ icon: Icon, color, onPress }: { icon: any, color: string, onPress: () => void }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.socialBtn, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}
    >
      <Icon size={18} color={color} />
    </TouchableOpacity>
  );
}

function MemberModal({ member, onClose }: { member: Member | null; onClose: () => void }) {
  if (!member) return null;
  
  const handleLink = (url: string) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        
        <Animated.View style={styles.modalSheet}>
          <LinearGradient
            colors={['rgba(30,41,59,0.95)', '#030303']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.modalHandle} />
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <View style={styles.modalImageContainer}>
                {member.image ? (
                  <Image source={{ uri: member.image }} style={styles.modalImage} resizeMode="cover" />
                ) : (
                  <View style={styles.modalImageFallback}>
                    <Text style={styles.avatarInitial}>{member.name?.[0] || '?'}</Text>
                  </View>
                )}
                {member.is_head && (
                  <View style={styles.modalHeadBadge}>
                    <Crown size={12} color="#fbbf24" />
                    <Text style={styles.modalHeadText}>LEADERSHIP</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalInfo}>
                <Text style={styles.modalName}>{member.name}</Text>
                <Text style={styles.modalRoleText}>{member.role || 'Team Member'}</Text>
                
                {member.specialty && (
                  <View style={styles.modalSpecialtyPill}>
                    <Text style={styles.modalSpecialtyText}>{member.specialty.toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.modalBody}>
              {member.description && (
                <Text style={styles.modalDesc}>{member.description}</Text>
              )}

              <View style={styles.modalDivider} />

              <View style={styles.socialGrid}>
                {member.social_links?.instagram && (
                  <SocialButton 
                    icon={Instagram} 
                    color="#f472b6" 
                    onPress={() => handleLink(member.social_links!.instagram)} 
                  />
                )}
                {member.social_links?.youtube && (
                  <SocialButton 
                    icon={Youtube} 
                    color="#f87171" 
                    onPress={() => handleLink(member.social_links!.youtube)} 
                  />
                )}
                {member.phone && (
                  <SocialButton 
                    icon={Phone} 
                    color="#4ade80" 
                    onPress={() => handleLink(`tel:${member.phone}`)} 
                  />
                )}
                {member.email && (
                  <SocialButton 
                    icon={Mail} 
                    color="#fbbf24" 
                    onPress={() => handleLink(`mailto:${member.email}`)} 
                  />
                )}
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <X size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────────────────────────────

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const { 
    facultyHeads, 
    coreCommittees: committees, 
    coreTeamMembers: members, 
    loading 
  } = useData();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Grouping logic
  const founders = useMemo(() => {
    const hardcodedRaaj = {
      id: 99999,
      name: 'RAAJ',
      role: 'Founder of Website',
      image: 'https://ricorrenza.fun/storage/uploads/raaj_founder.png',
      is_head: true,
      specialty: 'Platform Architect',
      enabled: true,
      social_links: { instagram: 'https://www.instagram.com/i_amraaj__/' }
    };
    
    const dynamicFounders = members.filter(m => 
      isLeadWebDevRole(m.role, committees.find(c => c.id === m.committee_id)?.name) &&
      !m.name.toLowerCase().includes('raaj')
    );

    return [hardcodedRaaj, ...dynamicFounders] as Member[];
  }, [members, committees]);

  const council = useMemo(() => 
    members.filter(m => (m as any).is_council || (m as any).is_chief || (m as any).is_head && !m.committee_id),
    [members]
  );

  const committeeHeads = useMemo(() => 
    members.filter(m => m.is_head && m.committee_id),
    [members]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#22d3ee" size="large" />
        <Text style={styles.loadingText}>SYNCING FAMILY DATABASE...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* ── FOUNDER SPOTLIGHT ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Crown size={16} color="#22d3ee" />
          <Text style={styles.sectionTitle}>ARCHITECTS</Text>
        </View>

        {founders.map((founder) => (
          <TouchableOpacity 
            key={founder.id} 
            style={styles.founderCard}
            onPress={() => setSelectedMember(founder as any)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: founder.image || '' }} style={styles.founderImage} resizeMode="cover" />
            <LinearGradient 
              colors={['transparent', 'rgba(3,7,18,0.95)', '#030712']} 
              style={styles.founderOverlay}
            />
            <View style={styles.founderInfo}>
              <View style={styles.founderBadge}>
                <Shield size={10} color="#22d3ee" />
                <Text style={styles.founderBadgeText}>PLATFORM FOUNDER</Text>
              </View>
              <Text style={styles.founderName}>{founder.name}</Text>
              <Text style={styles.founderTag}>LEGACY SYSTEM CREATOR</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── FACULTY LEADERSHIP ────────────────────────────────────────── */}
        {facultyHeads.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Star size={16} color="#fbbf24" />
              <Text style={styles.sectionTitle}>FACULTY LEADERSHIP</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.facultyRow}
            >
              {facultyHeads.map((fac) => (
                <View key={fac.id} style={styles.facultyCard}>
                  <Image source={{ uri: fac.image || '' }} style={styles.facultyImage} />
                  <LinearGradient 
                    colors={['transparent', 'rgba(0,0,0,0.8)']} 
                    style={StyleSheet.absoluteFillObject} 
                  />
                  <View style={styles.facultyInfo}>
                    <Text style={styles.facultyNameText}>{fac.name}</Text>
                    <Text style={styles.facultyTitleText}>{fac.title}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── THE COUNCIL ───────────────────────────────────────────────── */}
        {council.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Crown size={16} color="#ef4444" />
              <Text style={styles.sectionTitle}>THE COUNCIL</Text>
            </View>
            <View style={styles.councilGrid}>
              {council.map((m) => (
                <TouchableOpacity 
                  key={m.id} 
                  style={styles.councilCard}
                  onPress={() => setSelectedMember(m)}
                >
                  <Image source={{ uri: m.image || '' }} style={styles.councilImage} />
                  <LinearGradient colors={['transparent', '#000']} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.councilInfo}>
                    <Text style={styles.councilName}>{m.name}</Text>
                    <Text style={styles.councilRole}>{m.role}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── CORE COMMITTEES ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Users size={16} color="#818cf8" />
          <Text style={styles.sectionTitle}>COMMITTEES</Text>
        </View>

        {committees.map((committee) => {
          const committeeMembers = members.filter(m => m.committee_id === committee.id && !m.is_head);
          const head = members.find(m => m.committee_id === committee.id && m.is_head);
          
          return (
            <View key={committee.id} style={styles.committeeGroup}>
              <View style={[styles.committeeHeader, { borderLeftColor: committee.color || '#fff' }]}>
                <Text style={[styles.committeeName, { color: committee.color || '#fff' }]}>
                  {(committee.name || 'Committee').toUpperCase()}
                </Text>
                <Text style={styles.committeeMemberCount}>{committeeMembers.length + (head ? 1 : 0)} MEMBERS</Text>
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.memberScroll}
              >
                {head && (
                  <TouchableOpacity 
                    style={[styles.memberCard, { borderColor: `${committee.color}66` }]}
                    onPress={() => setSelectedMember(head)}
                  >
                    <Image source={{ uri: head.image || '' }} style={styles.memberImage} />
                    <View style={styles.headIndicator}>
                      <Crown size={8} color="#000" />
                    </View>
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberNameText}>{head.name}</Text>
                      <Text style={[styles.memberRoleText, { color: committee.color || '#fff' }]}>HEAD</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {committeeMembers.map((m) => (
                  <TouchableOpacity 
                    key={m.id} 
                    style={styles.memberCard}
                    onPress={() => setSelectedMember(m)}
                  >
                    <Image source={{ uri: m.image || '' }} style={styles.memberImage} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberNameText}>{m.name}</Text>
                      <Text style={styles.memberRoleText}>{m.role || 'Member'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      <MemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  loadingContainer: { flex: 1, backgroundColor: '#030303', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#22d3ee', marginTop: 20, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
  scroll: { paddingBottom: 20 },
  sectionHeader: { 
    flexDirection: 'row', alignItems: 'center', gap: 10, 
    paddingHorizontal: 20, marginTop: 30, marginBottom: 15 
  },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },

  // Founder
  founderCard: {
    marginHorizontal: 20, height: 400, borderRadius: 32, overflow: 'hidden',
    backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)'
  },
  founderImage: { width: '100%', height: '100%' },
  founderOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  founderInfo: { position: 'absolute', bottom: 30, left: 25, right: 25 },
  founderBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 5, 
    backgroundColor: 'rgba(34,211,238,0.1)', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 10
  },
  founderBadgeText: { color: '#22d3ee', fontSize: 10, fontWeight: '900' },
  founderName: { color: '#fff', fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  founderTag: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  // Faculty
  facultyRow: { paddingLeft: 20, gap: 15 },
  facultyCard: { width: 160, height: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111' },
  facultyImage: { width: '100%', height: '100%' },
  facultyInfo: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  facultyNameText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  facultyTitleText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },

  // Council
  councilGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  councilCard: { width: (width - 52) / 2, height: 200, borderRadius: 20, overflow: 'hidden' },
  councilImage: { width: '100%', height: '100%' },
  councilInfo: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  councilName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  councilRole: { color: '#ef4444', fontSize: 10, fontWeight: '700' },

  // Committees
  committeeGroup: { marginBottom: 30 },
  committeeHeader: { 
    marginHorizontal: 20, paddingLeft: 12, borderLeftWidth: 3, 
    marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
  },
  committeeName: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  committeeMemberCount: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '800' },
  memberScroll: { paddingLeft: 20, gap: 12 },
  memberCard: { 
    width: 130, height: 180, borderRadius: 16, overflow: 'hidden', 
    backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' 
  },
  memberImage: { width: '100%', height: '100%' },
  headIndicator: { 
    position: 'absolute', top: 8, right: 8, zIndex: 10,
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#fbbf24',
    alignItems: 'center', justifyContent: 'center'
  },
  memberInfo: { position: 'absolute', bottom: 10, left: 10, right: 10 },
  memberNameText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  memberRoleText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalSheet: { width: '100%', maxHeight: '80%', borderRadius: 40, overflow: 'hidden', elevation: 5 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 15, marginBottom: 10 },
  modalHeader: { padding: 30, alignItems: 'center' },
  modalImageContainer: { width: 160, height: 160, borderRadius: 80, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)' },
  modalImage: { width: '100%', height: '100%' },
  modalImageFallback: { flex: 1, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: 48, fontWeight: '900' },
  modalHeadBadge: { 
    position: 'absolute', bottom: 0, alignSelf: 'center', 
    backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 4, 
    borderRadius: 12, borderWidth: 1, borderColor: '#fbbf24',
    flexDirection: 'row', alignItems: 'center', gap: 5
  },
  modalHeadText: { color: '#fbbf24', fontSize: 9, fontWeight: '900' },
  modalInfo: { alignItems: 'center', marginTop: 20 },
  modalName: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  modalRoleText: { color: '#22d3ee', fontSize: 14, fontWeight: '700', marginTop: 5 },
  modalSpecialtyPill: { 
    marginTop: 15, paddingHorizontal: 15, paddingVertical: 6, 
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' 
  },
  modalSpecialtyText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  modalBody: { paddingHorizontal: 30, paddingBottom: 30 },
  modalDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  modalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 25 },
  socialGrid: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  socialBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalCloseBtn: { position: 'absolute', top: 25, right: 25, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }
});
