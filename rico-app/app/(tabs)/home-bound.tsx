import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, Linking, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Music, ChevronRight, Star, X, Instagram,
  CheckCircle, Zap
} from 'lucide-react-native';
import { useData } from '../../components/DataProvider';

const { width } = Dimensions.get('window');

type BandMember = {
  id: number;
  name: string;
  role?: string | null;
  image?: string | null;
  description?: string | null;   // bio
  specialty?: string | null;
  category?: string | null;
  achievements?: string[] | null;
  social_links?: { instagram?: string; [key: string]: string | undefined } | null;
  is_featured: boolean;
  enabled: boolean;
  order_position: number;
};

export default function HomeBoundScreen() {
  const insets = useSafeAreaInsets();
  const { bandMembers, loading, formSettings } = useData();
  const [selected, setSelected] = useState<BandMember | null>(null);
  const [auditionModalVisible, setAuditionModalVisible] = useState(false);

  const enabledMembers = useMemo(
    () =>
      (bandMembers as BandMember[])
        .filter(m => m.enabled)
        .sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return a.order_position - b.order_position;
        }),
    [bandMembers]
  );

  const featured = enabledMembers.filter(m => m.is_featured);
  const regular = enabledMembers.filter(m => !m.is_featured);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadT}>LOADING HOMEBOUND...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#030712', '#050c18', '#030712']} style={StyleSheet.absoluteFillObject} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient colors={['rgba(34,211,238,0.08)', 'transparent']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.heroBadge}>
            <View style={styles.dot} />
            <Text style={styles.heroBadgeT}>OFFICIAL LINEUP</Text>
          </View>
          <Text style={styles.heroTitle}>HOME<Text style={styles.heroTitleDim}>BOUND</Text></Text>
          <View style={styles.heroDiv}>
            <View style={styles.heroDivLine} />
            <Text style={styles.heroYear}>2026 CORE IDENTITY</Text>
            <View style={styles.heroDivLine} />
          </View>
          <Text style={styles.heroSub}>The official band of Ricorrenza Festival</Text>
        </View>

        {/* Featured */}
        {featured.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={14} color="#fbbf24" />
              <Text style={styles.sectionTitle}>FEATURED ARTISTS</Text>
            </View>
            {featured.map(m => (
              <FeaturedCard key={m.id} member={m} onDetails={() => setSelected(m)} />
            ))}
          </View>
        )}

        {/* Regular grid */}
        {regular.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Music size={14} color="#22d3ee" />
              <Text style={[styles.sectionTitle, { color: '#22d3ee' }]}>BAND MEMBERS</Text>
            </View>
            <View style={styles.grid}>
              {regular.map(m => (
                <MemberCard key={m.id} member={m} onDetails={() => setSelected(m)} />
              ))}
            </View>
          </View>
        )}

        {enabledMembers.length === 0 && (
          <View style={styles.empty}>
            <Music size={48} color="rgba(34,211,238,0.1)" />
            <Text style={styles.emptyT}>Band lineup coming soon</Text>
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaBox}>
          <LinearGradient colors={['rgba(34,211,238,0.1)', 'rgba(59,130,246,0.08)']} style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]} />
          <Text style={styles.ctaTitle}>Join The Core</Text>
          <Text style={styles.ctaSub}>
            {formSettings?.audition_form_enabled 
              ? "Submit your audition and become part of the legacy."
              : formSettings?.audition_form_message || "Auditions are currently closed."}
          </Text>
          <View style={styles.ctaRow}>
            <TouchableOpacity 
              style={[styles.ctaBtn, !formSettings?.audition_form_enabled && styles.ctaBtnDisabled]} 
              activeOpacity={0.8}
              onPress={() => formSettings?.audition_form_enabled && setAuditionModalVisible(true)}
              disabled={!formSettings?.audition_form_enabled}
            >
              <Music size={16} color={formSettings?.audition_form_enabled ? "#07071a" : "rgba(255,255,255,0.3)"} />
              <Text style={[styles.ctaBtnT, !formSettings?.audition_form_enabled && styles.ctaBtnDisabledT]}>
                {formSettings?.audition_form_enabled ? "SUBMIT AUDITION" : "AUDITIONS CLOSED"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Detail Modal */}
      <DetailModal member={selected} onClose={() => setSelected(null)} />

      {/* Audition Modal */}
      <AuditionModal visible={auditionModalVisible} onClose={() => setAuditionModalVisible(false)} />
    </View>
  );
}

// ── Featured Card ─────────────────────────────────────────────────────────────
function FeaturedCard({ member, onDetails }: { member: BandMember; onDetails: () => void }) {
  return (
    <View style={featS.card}>
      {member.image ? (
        <Image source={{ uri: member.image }} style={featS.bg} resizeMode="cover" />
      ) : (
        <LinearGradient colors={['#0f172a', '#1e293b']} style={featS.bg} />
      )}
      <LinearGradient colors={['transparent', 'rgba(3,7,18,0.97)']} style={featS.overlay} />
      <View style={featS.badge}>
        <Star size={10} color="#fbbf24" />
        <Text style={featS.badgeT}>FEATURED</Text>
      </View>
      <View style={featS.info}>
        {member.specialty ? (
          <Text style={featS.instruments}>{member.specialty}</Text>
        ) : null}
        <Text style={featS.name}>{member.name}</Text>
        {member.role ? <Text style={featS.role}>{member.role}</Text> : null}
        <TouchableOpacity style={featS.detailBtn} onPress={onDetails} activeOpacity={0.8}>
          <Text style={featS.detailBtnT}>VIEW DETAILS</Text>
          <ChevronRight size={13} color="#22d3ee" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const featS = StyleSheet.create({
  card: { height: 320, borderRadius: 24, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  badge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  badgeT: { color: '#fbbf24', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  info: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  instruments: { color: '#22d3ee', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' },
  name: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginBottom: 2 },
  role: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(34,211,238,0.1)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  detailBtnT: { color: '#22d3ee', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
});

// ── Member Card (grid) ────────────────────────────────────────────────────────
function MemberCard({ member, onDetails }: { member: BandMember; onDetails: () => void }) {
  const cardW = (width - 52) / 2;
  return (
    <View style={[mcS.card, { width: cardW }]}>
      {member.image ? (
        <Image source={{ uri: member.image }} style={mcS.photo} resizeMode="cover" />
      ) : (
        <View style={mcS.photoFB}>
          <Text style={mcS.photoI}>{member.name?.[0] || '?'}</Text>
        </View>
      )}
      <LinearGradient colors={['transparent', '#0d1117']} style={mcS.imgOverlay} />
      <View style={mcS.info}>
        {member.achievements && member.achievements.length > 0 && (
            <Text style={mcS.inst} numberOfLines={1}>{member.achievements[0]}</Text>
          )}
        <Text style={mcS.name} numberOfLines={2}>{member.name}</Text>
        {member.role ? <Text style={mcS.role} numberOfLines={1}>{member.role}</Text> : null}
        <TouchableOpacity style={mcS.detailBtn} onPress={onDetails} activeOpacity={0.8}>
          <Text style={mcS.detailBtnT}>DETAILS</Text>
          <ChevronRight size={10} color="#22d3ee" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const mcS = StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: '#0d1117', marginBottom: 12 },
  photo: { width: '100%', height: 140 },
  photoFB: { width: '100%', height: 140, backgroundColor: 'rgba(34,211,238,0.05)', alignItems: 'center', justifyContent: 'center' },
  photoI: { fontSize: 36, fontWeight: '900', color: 'rgba(255,255,255,0.2)' },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
  info: { padding: 10 },
  inst: { color: '#22d3ee', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginBottom: 2, textTransform: 'uppercase' },
  name: { color: '#fff', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  role: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontStyle: 'italic', marginBottom: 6 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(34,211,238,0.08)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5 },
  detailBtnT: { color: '#22d3ee', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ member, onClose }: { member: BandMember | null; onClose: () => void }) {
  if (!member) return null;

  const igUrl = member.social_links?.instagram || null;
  // Strip query params like ?igsh=... to get clean username
  const igUsername = igUrl
    ? igUrl.replace(/.*instagram\.com\//, '').replace(/\?.*$/, '').replace(/\/$/, '').trim()
    : null;

  const openInstagram = () => {
    if (!igUsername) return;
    const appUrl = `instagram://user?username=${igUsername}`;
    const webUrl = `https://www.instagram.com/${igUsername}/`;
    Linking.canOpenURL(appUrl)
      .then(supported => Linking.openURL(supported ? appUrl : webUrl))
      .catch(() => Linking.openURL(webUrl));
  };

  return (
    <Modal visible={!!member} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <View style={mdS.sheet}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={['rgba(34,211,238,0.08)', 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFillObject} />

          {/* Handle bar */}
          <View style={mdS.handle} />

          {/* Close button */}
          <TouchableOpacity style={mdS.closeBtn} onPress={onClose}>
            <X size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {/* Artist photo */}
          {member.image ? (
            <Image source={{ uri: member.image }} style={mdS.photo} resizeMode="cover" />
          ) : (
            <View style={mdS.photoFB}>
              <Text style={mdS.photoI}>{member.name?.[0] || '?'}</Text>
            </View>
          )}

          <ScrollView contentContainerStyle={mdS.content} showsVerticalScrollIndicator={false}>
            {/* Instruments */}
            {member.specialty ? (
              <Text style={mdS.instruments}>{member.specialty}</Text>
            ) : null}

            {/* Name + Role */}
            <Text style={mdS.name}>{member.name}</Text>
            {member.role ? <Text style={mdS.role}>{member.role}</Text> : null}

            {/* Divider */}
            <View style={mdS.divider} />

            {/* Bio */}
            <Text style={mdS.bioLabel}>ABOUT</Text>
            <Text style={mdS.bio}>{member.description || 'No biography available.'}</Text>

            {/* Instagram — branded button */}
            {igUrl && igUsername ? (
              <TouchableOpacity
                style={mdS.igBtn}
                onPress={openInstagram}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#833ab4', '#fd1d1d', '#fcb045']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={mdS.igGradient}
                >
                  <Instagram size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={mdS.igHandle}>@{igUsername}</Text>
                  <Text style={mdS.igSub}>Open on Instagram</Text>
                </View>
                <View style={mdS.igArrow}>
                  <ChevronRight size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            ) : null}

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const mdS = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', maxHeight: '88%', borderTopWidth: 1, borderColor: 'rgba(34,211,238,0.15)' },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: 320 },
  photoFB: { width: '100%', height: 180, backgroundColor: 'rgba(34,211,238,0.05)', alignItems: 'center', justifyContent: 'center' },
  photoI: { fontSize: 56, fontWeight: '900', color: 'rgba(255,255,255,0.15)' },
  content: { padding: 24 },
  instruments: { color: '#22d3ee', fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  name: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  role: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 16 },
  bioLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  bio: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  igBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: 'rgba(225,48,108,0.3)', borderRadius: 16, overflow: 'hidden' },
  igGradient: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  igHandle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  igSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 },
  igArrow: { width: 40, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, backgroundColor: '#030712', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadT: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  scroll: { paddingHorizontal: 20 },
  hero: { alignItems: 'center', paddingTop: 32, paddingBottom: 28, marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 8, overflow: 'hidden' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, marginBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22d3ee' },
  heroBadgeT: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  heroTitle: { color: '#fff', fontSize: 52, fontWeight: '900', letterSpacing: -2, lineHeight: 54 },
  heroTitleDim: { color: 'rgba(255,255,255,0.4)', fontWeight: '300' },
  heroDiv: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 8 },
  heroDivLine: { height: 1, width: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroYear: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', letterSpacing: 3 },
  heroSub: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center' },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { color: '#fbbf24', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyT: { color: 'rgba(255,255,255,0.45)', fontSize: 16, fontWeight: '800' },
  ctaBox: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(34,211,238,0.12)', padding: 28, alignItems: 'center', gap: 10, marginBottom: 12 },
  ctaTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  ctaSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 13 },
  ctaBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ctaBtnT: { color: '#07071a', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  ctaBtnDisabledT: { color: 'rgba(255,255,255,0.2)' },
});

// ── Audition Modal ────────────────────────────────────────────────────────────
function AuditionModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { addAudition } = useData();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    participant_type: '1st Year',
    instrument_role: '',
    experience_motivation: '',
    portfolio_link: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    let e: any = {};
    if (!formData.full_name) e.full_name = 'Name is required';
    if (!formData.email) e.email = 'Email is required';
    if (!formData.phone) e.phone = 'Phone is required';
    if (!formData.instrument_role) e.instrument_role = 'Role is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await addAudition({
        ...formData,
        status: 'pending'
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Submission failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        participant_type: '1st Year',
        instrument_role: '',
        experience_motivation: '',
        portfolio_link: ''
      });
    }, 500);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={mdS.backdrop}>
        <View style={[mdS.sheet, { minHeight: '80%' }]}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
          
          <View style={mdS.handle} />
          <TouchableOpacity style={mdS.closeBtn} onPress={handleClose}>
            <X size={18} color="#fff" />
          </TouchableOpacity>

          <View style={{ padding: 24, paddingBottom: 10 }}>
            <Text style={mdS.instruments}>JOIN HOME BOUND</Text>
            <Text style={mdS.name}>Band Audition</Text>
          </View>

          {isSubmitted ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <CheckCircle size={40} color="#22c55e" />
              </View>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>SUBMITTED!</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, marginBottom: 30 }}>
                Your audition request has been received. Our team will review your profile and contact you soon if selected.
              </Text>
              <TouchableOpacity style={[styles.ctaBtn, { width: '100%' }]} onPress={handleClose}>
                <Text style={styles.ctaBtnT}>DONE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
              <View style={fS.field}>
                <Text style={fS.label}>FULL NAME *</Text>
                <TextInput 
                  style={[fS.input, errors.full_name && fS.inputErr]} 
                  value={formData.full_name} 
                  onChangeText={t => setFormData(p => ({ ...p, full_name: t }))}
                  placeholder="Enter your name"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[fS.field, { flex: 1 }]}>
                  <Text style={fS.label}>EMAIL *</Text>
                  <TextInput 
                    style={[fS.input, errors.email && fS.inputErr]} 
                    value={formData.email} 
                    onChangeText={t => setFormData(p => ({ ...p, email: t }))}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                  />
                </View>
                <View style={[fS.field, { flex: 1 }]}>
                  <Text style={fS.label}>PHONE *</Text>
                  <TextInput 
                    style={[fS.input, errors.phone && fS.inputErr]} 
                    value={formData.phone} 
                    onChangeText={t => setFormData(p => ({ ...p, phone: t }))}
                    placeholder="Phone"
                    keyboardType="phone-pad"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                  />
                </View>
              </View>

              <View style={fS.field}>
                <Text style={fS.label}>PARTICIPANT TYPE</Text>
                <View style={fS.pickerRow}>
                  {['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG'].map(t => (
                    <TouchableOpacity 
                      key={t}
                      onPress={() => setFormData(p => ({ ...p, participant_type: t }))}
                      style={[fS.pill, formData.participant_type === t && fS.pillActive]}
                    >
                      <Text style={[fS.pillT, formData.participant_type === t && fS.pillTActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={fS.field}>
                <Text style={fS.label}>INSTRUMENT / ROLE *</Text>
                <TextInput 
                  style={[fS.input, errors.instrument_role && fS.inputErr]} 
                  value={formData.instrument_role} 
                  onChangeText={t => setFormData(p => ({ ...p, instrument_role: t }))}
                  placeholder="e.g. Lead Guitarist, Vocalist"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>

              <View style={fS.field}>
                <Text style={fS.label}>PORTFOLIO / SOCIAL LINK</Text>
                <TextInput 
                  style={fS.input} 
                  value={formData.portfolio_link} 
                  onChangeText={t => setFormData(p => ({ ...p, portfolio_link: t }))}
                  placeholder="https://..."
                  autoCapitalize="none"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>

              <View style={fS.field}>
                <Text style={fS.label}>EXPERIENCE / MOTIVATION</Text>
                <TextInput 
                  style={[fS.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]} 
                  value={formData.experience_motivation} 
                  onChangeText={t => setFormData(p => ({ ...p, experience_motivation: t }))}
                  placeholder="Tell us about yourself..."
                  multiline
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>

              {errors.submit && <Text style={{ color: '#ef4444', fontSize: 12, marginBottom: 16 }}>{errors.submit}</Text>}

              <TouchableOpacity 
                style={[fS.submitBtn, isSubmitting && { opacity: 0.7 }]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#07071a" size="small" />
                ) : (
                  <>
                    <Zap size={18} color="#07071a" />
                    <Text style={fS.submitBtnT}>COMPLETE REGISTRATION</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const fS = StyleSheet.create({
  field: { marginBottom: 20 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', paddingHorizontal: 16, paddingVertical: 14, fontSize: 14 },
  inputErr: { borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.05)' },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillActive: { backgroundColor: '#22d3ee', borderColor: '#22d3ee' },
  pillT: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  pillTActive: { color: '#07071a' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#22d3ee', borderRadius: 16, padding: 18, marginTop: 10 },
  submitBtnT: { color: '#07071a', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
