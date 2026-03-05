import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Linking, ActivityIndicator, Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExternalLink, Star, Crown, Building2, Mail } from 'lucide-react-native';
import { useData } from '../../components/DataProvider';

const { width } = Dimensions.get('window');

export default function SponsorsScreen() {
  const insets = useSafeAreaInsets();
  const { sponsors, loading } = useData();

  const enabledSponsors = useMemo(
    () => sponsors.filter(s => s.enabled !== false),
    [sponsors]
  );

  const titleSponsors = useMemo(
    () => enabledSponsors.filter(s => s.category === 'Title Sponsor' && s.logo),
    [enabledSponsors]
  );

  const coSponsors = useMemo(
    () => enabledSponsors.filter(s => s.category === 'Co Sponsor' && s.logo),
    [enabledSponsors]
  );

  const otherSponsors = useMemo(() => {
    const others = enabledSponsors.filter(
      s => s.category !== 'Title Sponsor' && s.category !== 'Co Sponsor' && s.logo
    );
    // Group by category
    return others.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {} as Record<string, typeof others>);
  }, [enabledSponsors]);

  const otherCategories = Object.keys(otherSponsors).sort();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadT}>LOADING SPONSORS...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#070114', '#030a1a', '#07071a']} style={StyleSheet.absoluteFillObject} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <Building2 size={13} color="#60a5fa" />
            <Text style={styles.badgeText}>PARTNERSHIPS</Text>
          </View>
          <Text style={styles.h1}>OUR <Text style={styles.neonBlue}>SPONSORS</Text></Text>
          <Text style={styles.subtitle}>Powered by industry leaders who believe in our vision</Text>
          <View style={styles.divider} />
        </View>

        {/* Title Sponsors */}
        {titleSponsors.length > 0 && (
          <Section title="TITLE" accent="SPONSORS" accentColor="#f0abfc" icon={<Crown size={18} color="#fbbf24" />}>
            {titleSponsors.map(s => (
              <SponsorCard key={s.id} sponsor={s} size="large" borderColor="#f43f5e" />
            ))}
          </Section>
        )}

        {/* Co Sponsors */}
        {coSponsors.length > 0 && (
          <Section title="CO" accent="SPONSORS" accentColor="#60a5fa">
            {coSponsors.map(s => (
              <SponsorCard key={s.id} sponsor={s} size="large" borderColor="#3b82f6" />
            ))}
          </Section>
        )}

        {/* Other categories */}
        {otherCategories.map(cat => (
          <Section key={cat} title={cat} accent="" accentColor="#a78bfa">
            <View style={styles.gridRow}>
              {otherSponsors[cat].map(s => (
                <SponsorCard key={s.id} sponsor={s} size="small" borderColor="#7c3aed" />
              ))}
            </View>
          </Section>
        ))}

        {/* No sponsors fallback */}
        {enabledSponsors.length === 0 && (
          <View style={styles.empty}>
            <Star size={40} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyT}>No sponsors yet</Text>
          </View>
        )}

        {/* Become a Sponsor CTA */}
        <View style={styles.ctaBox}>
          <LinearGradient colors={['rgba(244,63,94,0.15)', 'rgba(168,85,247,0.15)']} style={StyleSheet.absoluteFillObject} />
          <Mail size={28} color="#f43f5e" />
          <Text style={styles.ctaTitle}>INTERESTED IN SPONSORING?</Text>
          <Text style={styles.ctaSubtitle}>Connect with our sponsorship team to be part of Ricorrenza</Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => Linking.openURL('mailto:ricorrenza2026@college.edu')}
          >
            <Text style={styles.ctaBtnT}>CONTACT US</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ── Reusable Section Header ──────────────────────────────────────────────────
function Section({ title, accent, accentColor, icon, children }: {
  title: string; accent: string; accentColor: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHdr}>
        {icon && <View style={styles.sectionIcon}>{icon}</View>}
        <Text style={styles.sectionTitle}>
          {title} <Text style={[styles.sectionAccent, { color: accentColor }]}>{accent}</Text>
        </Text>
      </View>
      <View style={[styles.sectionBar, { backgroundColor: accentColor }]} />
      {children}
    </View>
  );
}

// ── Sponsor Card ─────────────────────────────────────────────────────────────
function SponsorCard({ sponsor, size, borderColor }: {
  sponsor: any; size: 'large' | 'small'; borderColor: string;
}) {
  const isLarge = size === 'large';
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isLarge ? styles.cardLarge : styles.cardSmall,
        { borderColor: `${borderColor}40` },
      ]}
      onPress={() => sponsor.website && Linking.openURL(sponsor.website)}
      activeOpacity={0.8}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Logo */}
      <View style={[styles.logoBox, isLarge ? styles.logoBoxL : styles.logoBoxS]}>
        {sponsor.logo ? (
          <Image source={{ uri: sponsor.logo }} style={styles.logoImg} resizeMode="contain" />
        ) : (
          <Text style={styles.logoFb}>{sponsor.name?.[0] || '?'}</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{sponsor.name}</Text>
        <View style={[styles.catBadge, { borderColor }]}>
          <Text style={[styles.catText, { color: borderColor }]}>{sponsor.category}</Text>
        </View>
        {isLarge && sponsor.description ? (
          <Text style={styles.desc} numberOfLines={3}>{sponsor.description}</Text>
        ) : null}
        {sponsor.website ? (
          <View style={styles.linkRow}>
            <ExternalLink size={11} color="#60a5fa" />
            <Text style={styles.linkT}>Visit Website</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07071a' },
  center: { flex: 1, backgroundColor: '#07071a', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadT: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  scroll: { paddingHorizontal: 20 },

  header: { paddingTop: 24, paddingBottom: 16, alignItems: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(96,165,250,0.1)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, marginBottom: 14 },
  badgeText: { color: '#60a5fa', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  h1: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  neonBlue: { color: '#22d3ee' },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  divider: { height: 2, width: 60, backgroundColor: '#22d3ee', borderRadius: 1, marginTop: 18, opacity: 0.6 },

  section: { marginBottom: 36 },
  sectionHdr: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  sectionIcon: { opacity: 0.85 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  sectionAccent: { fontStyle: 'italic' },
  sectionBar: { height: 2, width: 40, borderRadius: 1, marginBottom: 14, opacity: 0.5 },

  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, marginBottom: 12 },
  cardLarge: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  cardSmall: { width: (width - 52) / 2, padding: 14, alignItems: 'center' },

  logoBox: { alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)' },
  logoBoxL: { width: 80, height: 80, flexShrink: 0 },
  logoBoxS: { width: 64, height: 64, marginBottom: 10 },
  logoImg: { width: '100%', height: '100%' },
  logoFb: { color: 'rgba(255,255,255,0.25)', fontSize: 24, fontWeight: '900' },

  cardInfo: { flex: 1 },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  catBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 },
  catText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  desc: { color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 16, marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkT: { color: '#60a5fa', fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyT: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '700', letterSpacing: 1 },

  ctaBox: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)', padding: 28, alignItems: 'center', gap: 12, marginBottom: 12 },
  ctaTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  ctaSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  ctaBtn: { marginTop: 6, backgroundColor: '#f43f5e', borderRadius: 100, paddingHorizontal: 28, paddingVertical: 12 },
  ctaBtnT: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
});
