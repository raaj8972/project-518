import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, Image, Animated, Linking, Platform, Modal,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar, Zap, Crown, Star, Users, ArrowRight,
  Instagram, Youtube, ChevronRight, Music2, Play, MoveUpRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Filter, FeGaussianBlur, FeComposite } from 'react-native-svg';
import { useData } from '@/components/DataProvider';
import { 
  HeroMedia, GuestArtist, EventWinner, Sponsor, 
  FacultyHead, CoreTeamMember as CommitteeMember, 
  RoadmapMilestone, AboutSettings 
} from '@/types/data';

const { width, height } = Dimensions.get('window');

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, iconColor = '#818cf8', tag, title, subLight, subtitle }: {
  icon?: any; iconColor?: string; tag?: string;
  title: string; subLight?: string; subtitle?: string;
}) {
  return (
    <View style={secH.wrap}>
      {tag && (
        <View style={secH.tagRow}>
          {Icon && <Icon size={11} color={iconColor} />}
          <Text style={[secH.tag, { color: iconColor }]}>{tag}</Text>
        </View>
      )}
      <Text style={secH.title}>
        {title}{subLight ? <Text style={secH.light}> {subLight}</Text> : null}
      </Text>
      {subtitle ? <Text style={secH.sub}>{subtitle}</Text> : null}
      <View style={[secH.bar, { backgroundColor: iconColor }]} />
    </View>
  );
}
const secH = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 10 },
  tag: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  light: { color: 'rgba(255,255,255,0.35)', fontWeight: '300' },
  sub: { color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  bar: { width: 48, height: 2.5, borderRadius: 1, marginTop: 14 },
});

// ─── 1. HERO ──────────────────────────────────────────────────────────────────
function HeroSection({ heroMedia }: { heroMedia: HeroMedia | null }) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(28)).current;
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 900, delay: 200, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 700, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const isAndroid = Platform.OS === 'android';
  const videoUrl = heroMedia?.video_url || heroMedia?.mobile_video_url || null;
  const actualVideoUrl = isAndroid && videoUrl?.toLowerCase().endsWith('.mov')
    ? (heroMedia?.mobile_video_url || videoUrl)
    : videoUrl;

  const imageUrl = heroMedia?.image_url || heroMedia?.mobile_image_url || heroMedia?.poster_url || null;
  const isVideo = heroMedia?.background_type === 'video' && !!actualVideoUrl && !videoError;

  return (
    <View style={h.box}>
      <LinearGradient colors={['#090015', '#03071a', '#000a1f']} style={StyleSheet.absoluteFillObject} />
      <View style={h.glow1} />
      <View style={h.glow2} />

      {imageUrl && (!videoReady || videoError) && (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      )}

      {isVideo && (
        <Video
          source={{ uri: actualVideoUrl! }}
          style={StyleSheet.absoluteFillObject}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          useNativeControls={false}
          onReadyForDisplay={() => setVideoReady(true)}
          onError={() => { setVideoError(true); }}
          rate={1.0}
          volume={0}
        />
      )}

      <LinearGradient
        colors={['rgba(7,7,16,0.25)', 'rgba(7,7,16,0.45)', 'rgba(7,7,16,0.92)']}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[h.content, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        <View style={h.badge}>
          <Zap size={10} color="#818cf8" />
          <Text style={h.badgeT}>✦ ANNUAL FESTIVAL 2026</Text>
        </View>
        <Text style={h.title}>RICORRENZA</Text>
        <Text style={h.tagline}>Music That Moves You</Text>
        <Text style={h.sub}>Experience the future of music and creativity</Text>
        <TouchableOpacity style={h.cta} onPress={() => router.push('/(tabs)/events')} activeOpacity={0.85}>
          <LinearGradient colors={['rgba(129,140,248,0.35)','rgba(99,102,241,0.1)']} style={StyleSheet.absoluteFillObject} />
          <Calendar size={15} color="#818cf8" />
          <Text style={h.ctaTxt}>Explore Events</Text>
          <ArrowRight size={13} color="#818cf8" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
const h = StyleSheet.create({
  box: { height: height * 0.72, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  glow1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -80, right: -60, backgroundColor: 'rgba(99,102,241,0.14)' },
  glow2: { position: 'absolute', width: 260, height: 260, borderRadius: 130, bottom: 40, left: -40, backgroundColor: 'rgba(167,139,250,0.1)' },
  content: { alignItems: 'center', paddingHorizontal: 30, zIndex: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  badgeT: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 52, fontWeight: '900', letterSpacing: 1, textAlign: 'center', marginBottom: 8, textShadowColor: 'rgba(129,140,248,0.55)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  tagline: { color: 'rgba(255,255,255,0.82)', fontSize: 16, fontWeight: '300', textAlign: 'center', marginBottom: 6 },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginBottom: 32, lineHeight: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(129,140,248,0.45)', overflow: 'hidden' },
  ctaTxt: { color: '#818cf8', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});

// ─── 2. FEATURED ARTISTS ──────────────────────────────────────────────────────
function FeaturedArtists({ artists, onArtistPress }: { artists: GuestArtist[]; onArtistPress: (a: GuestArtist) => void }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);
  const cardW = width * 0.82;
  const spacer = (width - cardW) / 2;
  const snapInterval = cardW + 12;

  useEffect(() => {
    if (artists.length < 2) return;
    let idx = 0;
    const t = setInterval(() => {
      idx = (idx + 1) % artists.length;
      flatListRef.current?.scrollToOffset({ 
        offset: idx * snapInterval, 
        animated: true 
      });
    }, 4500);
    return () => clearInterval(t);
  }, [artists.length, snapInterval]);

  if (artists.length === 0) return null;

  return (
    <View style={art.section}>
      <SectionHeader 
        icon={Music2} 
        iconColor="#f43f5e" 
        tag="GUEST ARTISTS" 
        title="FEATURED" 
        subLight="ARTISTS" 
        subtitle="Meet the incredible artists who will light up RICORRENZA 2026" 
      />
      <Animated.FlatList
        ref={flatListRef}
        data={artists}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacer }}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item: a, index: i }) => {
          const inputRange = [
            (i - 1) * snapInterval,
            i * snapInterval,
            (i + 1) * snapInterval,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.65, 1, 0.65],
            extrapolate: 'clamp',
          });

          const imgUrl = a.image || a.card_media_url;
          const artistVideoUrl = a.card_media_url;
          const isArtistVideo = a.card_media_is_video && artistVideoUrl;

          return (
            <Animated.View style={{ width: cardW, marginRight: 12, transform: [{ scale }], opacity }}>
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => onArtistPress(a)}
                style={art.card}
              >
                <LinearGradient colors={['#1a0533','#0a0a2e']} style={StyleSheet.absoluteFillObject} />

                {isArtistVideo ? (
                  <Video
                    source={{ uri: artistVideoUrl! }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                    usePoster={!!imgUrl}
                    posterSource={{ uri: imgUrl || undefined }}
                    posterStyle={{ resizeMode: 'cover' }}
                    progressUpdateIntervalMillis={5000}
                  />
                ) : imgUrl && (
                  <Image source={{ uri: imgUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                )}

                <View style={art.overlay}>
                  <BlurView intensity={65} tint="dark" style={art.glassPanel}>
                    <View style={art.panelRow}>
                      <View style={art.textInfo}>
                        <Text style={art.name} numberOfLines={1}>{(a.name || 'Artist').toUpperCase()}</Text>
                        <Text style={art.genre}>{a.title || a.specialty || 'PERFORMER'}</Text>
                        
                        <View style={art.actionRow}>
                          <View style={art.detailsBtn}>
                            <Text style={art.detailsTxt}>VIEW DETAILS</Text>
                            <MoveUpRight size={12} color="rgba(255,255,255,0.7)" />
                          </View>
                        </View>
                      </View>
                      
                      <View style={art.playBtn}>
                        <Play size={18} color="#fff" fill="#fff" />
                      </View>
                    </View>
                  </BlurView>
                </View>

                <View style={art.topBadge}>
                  <Zap size={10} color="#f43f5e" />
                  <Text style={art.featB}>FEATURED ARTIST</Text>
                </View>
                
                {a.live_now_enabled && (
                  <View style={art.liveBadge}>
                    <View style={art.liveDot} />
                    <Text style={art.liveT}>LIVE NOW</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />
      <View style={art.dots}>
        {artists.map((_, i) => {
          const dotScale = scrollX.interpolate({
            inputRange: [
              (i - 1) * snapInterval,
              i * snapInterval,
              (i + 1) * snapInterval,
            ],
            outputRange: [1, 1.5, 1],
            extrapolate: 'clamp',
          });
          const dotOpacity = scrollX.interpolate({
            inputRange: [
              (i - 1) * snapInterval,
              i * snapInterval,
              (i + 1) * snapInterval,
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          const dotWidth = scrollX.interpolate({
            inputRange: [
              (i - 1) * snapInterval,
              i * snapInterval,
              (i + 1) * snapInterval,
            ],
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View 
              key={i} 
              style={[
                art.dot, 
                { 
                  width: dotWidth, 
                  opacity: dotOpacity,
                  backgroundColor: scrollX.interpolate({
                    inputRange: [(i-1)*snapInterval, i*snapInterval, (i+1)*snapInterval],
                    outputRange: ['rgba(255,255,255,0.2)', '#f43f5e', 'rgba(255,255,255,0.2)'],
                    extrapolate: 'clamp'
                  })
                }
              ]} 
            />
          );
        })}
      </View>
    </View>
  );
}
const art = StyleSheet.create({
  section: { marginBottom: 64 },
  card: { height: 480, borderRadius: 32, overflow: 'hidden', backgroundColor: '#0d0d1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  overlay: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  glassPanel: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 18, backgroundColor: 'rgba(0,0,0,0.3)' },
  panelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  textInfo: { flex: 1, marginRight: 12 },
  name: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  genre: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700', fontStyle: 'italic', letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' },
  actionRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 14 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailsTxt: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  playBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.2)' },
  topBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  featB: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  liveBadge: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(220,38,38,0.4)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveT: { color: '#ef4444', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 24 },
  dot: { height: 4, borderRadius: 2 },
});

// ─── 3. HALL OF GLORY ─────────────────────────────────────────────────────────
function HallOfGlory({ winners }: { winners: EventWinner[] }) {
  if (winners.length === 0) return null;
  const posLabel: Record<number, string> = { 1: '1ST PLACE', 2: '2ND PLACE', 3: '3RD PLACE' };
  return (
    <View style={glory.section}>
      <SectionHeader icon={Crown} iconColor="#fbbf24" tag="HALL OF GLORY" title="HALL OF" subLight="GLORY" subtitle="Celebrating the champions of RICORRENZA" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={glory.row}>
        {winners.map(w => {
          const displayName = w.team_name || w.registration_name || w.name;
          const leaderCandidate = w.registration_name || w.name;
          const leaderName = (w.team_name && leaderCandidate && leaderCandidate !== w.team_name) ? leaderCandidate : null;
          
          const membersList = (() => {
            try {
              if (Array.isArray(w.team_members)) return w.team_members;
              if (typeof w.team_members === 'string') return JSON.parse(w.team_members);
              return [];
            } catch (e) {
              return [];
            }
          })().map((m: any) => typeof m === 'object' ? m.name : m);

          return (
            <BlurView key={w.id} intensity={20} tint="dark" style={glory.card}>
              <LinearGradient colors={['rgba(251,191,36,0.15)','rgba(10,10,10,0.95)']} style={StyleSheet.absoluteFillObject} />
              
              <View style={glory.headerRow}>
                <View style={glory.badge}>
                  <Crown size={10} color="#fbbf24" />
                  <Text style={glory.bdgT}>{posLabel[w.position || 1] || 'WINNER'}</Text>
                </View>
                {w.year ? <Text style={glory.year}>{w.year}</Text> : null}
              </View>

              <View style={glory.winnerWrap}>
                {w.photo_url ? (
                  <Image source={{ uri: w.photo_url }} style={glory.photo} resizeMode="cover" />
                ) : (
                  <View style={glory.avatar}><Text style={glory.avatarL}>{displayName?.[0] || '?'}</Text></View>
                )}

                <View style={glory.mainInfo}>
                  <Text style={glory.winnerN} numberOfLines={2}>{(displayName || 'Champion').toUpperCase()}</Text>
                  {leaderName && (
                    <Text style={glory.leaderT}>LEADER: {leaderName.toUpperCase()}</Text>
                  )}
                  <Text style={glory.cat}>{w.event_title || w.category || 'CHAMPION'}</Text>
                </View>
              </View>

              {membersList.length > 0 && (
                <View style={glory.membersPanel}>
                  <Text style={glory.membersLabel}>TEAM CREW</Text>
                  <Text style={glory.membersText} numberOfLines={2}>
                    {membersList.join(', ')}
                  </Text>
                </View>
              )}
            </BlurView>
          );
        })}
      </ScrollView>
    </View>
  );
}
const glory = StyleSheet.create({
  section: { marginBottom: 56 },
  row: { paddingHorizontal: 20, gap: 14, paddingBottom: 16 },
  card: { width: width * 0.75, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)', padding: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  bdgT: { color: '#fbbf24', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  year: { color: 'rgba(251,191,36,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  winnerWrap: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  photo: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(251,191,36,0.3)' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  avatarL: { color: 'rgba(255,255,255,0.3)', fontSize: 24, fontWeight: '900' },
  mainInfo: { flex: 1 },
  winnerN: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  leaderT: { color: 'rgba(251,191,36,0.8)', fontSize: 9, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  cat: { color: '#818cf8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  membersPanel: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12 },
  membersLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  membersText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontStyle: 'italic', lineHeight: 14 },
});

// ─── 4. PARTNERS ──────────────────────────────────────────────────────────────
function Partners({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;
  return (
    <View style={spon.section}>
      <SectionHeader icon={Star} iconColor="#22d3ee" tag="SPONSORS" title="OUR" subLight="PARTNERS" subtitle="Powered by industry leaders who believe in our vision" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={spon.row}>
        {sponsors.map(s => (
          <TouchableOpacity key={s.id} style={spon.card} onPress={() => s.website && Linking.openURL(s.website)} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
            {s.logo ? (
              <Image source={{ uri: s.logo }} style={spon.logo} resizeMode="contain" />
            ) : (
              <Text style={spon.name} numberOfLines={2}>{s.name}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
const spon = StyleSheet.create({
  section: { marginBottom: 56 },
  row: { paddingHorizontal: 20, gap: 12, alignItems: 'center' },
  card: { width: 100, height: 100, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', padding: 10 },
  logo: { width: 82, height: 82 },
  name: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', textAlign: 'center' },
});

// ─── 5. LEADERSHIP ────────────────────────────────────────────────────────────
function Leadership({ facultyHeads, committeeHeads }: { facultyHeads: FacultyHead[]; committeeHeads: CommitteeMember[] }) {
  if (facultyHeads.length === 0 && committeeHeads.length === 0) return null;
  return (
    <View style={lead.section}>
      <SectionHeader icon={Crown} iconColor="#f59e0b" tag="LEADERSHIP" title="OUR" subLight="LEADERSHIP" subtitle="Faculty chairs and heads of our core committees" />
      {facultyHeads.length > 0 && (
        <View style={lead.sub}>
          <View style={lead.subHdr}><Crown size={12} color="#fbbf24" /><Text style={lead.subTit}>Faculty Heads</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={lead.row}>
            {facultyHeads.map(f => (
              <BlurView key={f.id} intensity={20} tint="dark" style={lead.card}>
                <LinearGradient colors={['rgba(99,102,241,0.2)','rgba(0,0,0,0)']} style={StyleSheet.absoluteFillObject} />
                {f.image ? <Image source={{ uri: f.image }} style={lead.photo} resizeMode="cover" /> : <View style={lead.photoFB}><Text style={lead.photoI}>{f.name?.[0] || '?'}</Text></View>}
                <View style={lead.crownB}><Crown size={10} color="#fbbf24" /></View>
                <View style={lead.foot}><Text style={lead.nm} numberOfLines={2}>{f.name}</Text><Text style={lead.rl} numberOfLines={1}>{f.title || 'Faculty Head'}</Text></View>
              </BlurView>
            ))}
          </ScrollView>
        </View>
      )}
      {committeeHeads.length > 0 && (
        <View style={lead.sub}>
          <View style={lead.subHdr}><Crown size={12} color="#818cf8" /><Text style={[lead.subTit, { color: '#818cf8' }]}>Committee Members</Text><Text style={lead.cnt}>{committeeHeads.length} MEMBERS</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={lead.row}>
            {committeeHeads.map(m => (
              <BlurView key={m.id} intensity={20} tint="dark" style={[lead.card, { borderColor: 'rgba(129,140,248,0.2)' }]}>
                <LinearGradient colors={['rgba(129,140,248,0.15)','rgba(0,0,0,0)']} style={StyleSheet.absoluteFillObject} />
                {m.image ? <Image source={{ uri: m.image }} style={lead.photo} resizeMode="cover" /> : <View style={[lead.photoFB, { backgroundColor: 'rgba(129,140,248,0.15)' }]}><Text style={lead.photoI}>{m.name?.[0] || '?'}</Text></View>}
                {m.is_head && <View style={[lead.crownB, { borderColor: 'rgba(129,140,248,0.4)' }]}><Text style={{ color: '#818cf8', fontSize: 6, fontWeight: '900' }}>HEAD</Text></View>}
                <View style={lead.foot}><Text style={lead.nm} numberOfLines={2}>{m.name}</Text><Text style={[lead.rl, { color: '#818cf8' }]} numberOfLines={1}>{m.role || 'Committee Head'}</Text></View>
              </BlurView>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
const lead = StyleSheet.create({
  section: { marginBottom: 56 },
  sub: { marginBottom: 24 },
  subHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  subTit: { color: '#fbbf24', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  cnt: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800' },
  row: { paddingHorizontal: 20, gap: 12 },
  card: { width: 160, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)' },
  photo: { width: '100%', height: 160 },
  photoFB: { width: '100%', height: 160, backgroundColor: 'rgba(251,191,36,0.1)', alignItems: 'center', justifyContent: 'center' },
  photoI: { fontSize: 36, fontWeight: '900', color: 'rgba(255,255,255,0.3)' },
  crownB: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)', alignItems: 'center', justifyContent: 'center' },
  foot: { padding: 10 },
  nm: { color: '#fff', fontSize: 12, fontWeight: '800', marginBottom: 2 },
  rl: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontStyle: 'italic' },
});

// ─── 6. ROADMAP (Z-PATTERN ROAD) ────────────────────────────────────────────────
const ROAD_WIDTH = 60; 
const buildPathD = (w: number, h: number, segments: number, edgePad: number) => {
  const pts = [`M ${edgePad} 0`];
  for (let i = 1; i <= segments; i++) {
    const x = i % 2 === 0 ? edgePad : w - edgePad;
    const y = (i / segments) * h;
    pts.push(`L ${x} ${y}`);
  }
  pts.push(`L ${segments % 2 !== 0 ? edgePad : w - edgePad} ${h + 200}`);
  return pts.join(' ');
};

function Roadmap({ roadmapMilestones }: { roadmapMilestones: any[] }) {
  const milestones = useMemo(() => {
    if (roadmapMilestones && roadmapMilestones.length > 0) {
      return roadmapMilestones
        .filter(m => m.enabled !== false)
        .sort((a,b) => a.order_position - b.order_position)
        .map(m => ({
          id: String(m.id || m.year),
          year: String(m.year),
          lines: (m.points && m.points.length > 0) ? m.points : [m.title || String(m.year)],
          status: m.status || 'completed',
        }));
    }
    return [
      { id: '1', year: '2015', lines: ['Biggest ever in History of RICORRENZA', 'Radiant Glow Bands', 'National Artists'], status: 'completed' },
      { id: '2', year: '2017', lines: ['20+ events', '500+ participants', '3 days of cultural extravaganza'], status: 'completed' },
      { id: '3', year: '2019', lines: ['Bollywood Artist Mohammad Irfan', '10000+ Footfall'], status: 'completed' },
      { id: '4', year: '2022', lines: ['Develop branding & marketing campaigns', 'DJ Night'], status: 'completed' },
      { id: '5', year: '2023', lines: ['Bollywood Artist Amit Mishra', 'College Band Homeground'], status: 'completed' },
      { id: '6', year: '2026', lines: ['Commencement of Ricorrenza'], status: 'current' },
    ];
  }, [roadmapMilestones]);

  // Progressive reveal state — each index starts hidden
  const [revealed, setRevealed] = useState<boolean[]>(() => milestones.map(() => false));
  const revealedRef = useRef<boolean[]>(milestones.map(() => false));

  // Animated progress 0→1 looping
  const vehicleProgress = useRef(new Animated.Value(0)).current;

  if (milestones.length === 0) return null;

  // Dynamic sizing — road grows 1 Z-leg per milestone
  const viewWidth = width;
  const segmentHeight = 260;
  const containerHeight = Math.max(900, milestones.length * segmentHeight + 200);
  const roadHeight = containerHeight - 200;
  const segmentCount = Math.max(3, milestones.length);
  const dynamicEdgePad = 40;

  const pathD = useMemo(
    () => buildPathD(viewWidth, roadHeight, segmentCount, dynamicEdgePad),
    [viewWidth, roadHeight, segmentCount]
  );

  // Zig-zag keyframe points with road-following rotation
  const segmentPoints = useMemo(() => {
    const segW = viewWidth - 2 * dynamicEdgePad;  // horizontal distance per segment
    const segH = roadHeight / segmentCount;         // vertical distance per segment
    // Real slope angle of the diagonal road (e.g., ~41° for typical proportions)
    const slopeAngle = Math.atan2(segH, segW) * (180 / Math.PI);

    const pts: { x: number; y: number; angle: number }[] = [];
    for (let i = 0; i <= segmentCount; i++) {
      const x = i % 2 === 0 ? dynamicEdgePad : viewWidth - dynamicEdgePad;
      const y = (i / segmentCount) * roadHeight;
      // Right-going → positive slope tilt; Left-going → negative slope tilt
      // This keeps the vehicle oriented correctly (never flips)
      const angle = i < segmentCount
        ? (i % 2 === 0 ? slopeAngle : -slopeAngle)
        : (segmentCount % 2 === 0 ? slopeAngle : -slopeAngle);
      pts.push({ x, y, angle });
    }
    return pts;
  }, [viewWidth, roadHeight, segmentCount, dynamicEdgePad]);

  // Y-positions of each milestone (82% of road height zone)
  const milestoneYPositions = useMemo(() =>
    milestones.map((_, i) => (i / Math.max(milestones.length - 1, 1)) * (roadHeight * 0.82)),
    [milestones.length, roadHeight]
  );

  const totalSegs = segmentPoints.length - 1;
  const inputRange = segmentPoints.map((_, i) => i / totalSegs);
  // Center vehicle on road — offset so front-right of vehicle sits on path vertex
  const xValues = segmentPoints.map(p => p.x - 50);
  const yValues = segmentPoints.map(p => p.y - 28);
  const angleValues = segmentPoints.map(p => `${p.angle}deg`);

  const vehicleX = vehicleProgress.interpolate({ inputRange, outputRange: xValues });
  const vehicleY = vehicleProgress.interpolate({ inputRange, outputRange: yValues });
  // Smooth rotation that follows the road slope — positive=right-down, negative=left-down
  const vehicleRotation = vehicleProgress.interpolate({ inputRange, outputRange: angleValues });

  // Wheel spin animation — continuous independent rotation
  const wheelSpin = useRef(new Animated.Value(0)).current;

  // Reveal anim values for each milestone
  const revealAnims = useRef(milestones.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Reset reveal on mount
    const initRevealed = milestones.map(() => false);
    revealedRef.current = initRevealed;
    setRevealed(initRevealed);
    revealAnims.forEach(a => a.setValue(0));

    // Start animation — 60s per loop (natural driving pace)
    const loop = Animated.loop(
      Animated.timing(vehicleProgress, {
        toValue: 1,
        duration: 60000,
        useNativeDriver: true,
      })
    );
    loop.start();

    // Wheel spin — spins continuously at a fixed rate (1.5s per revolution)
    const wheelLoop = Animated.loop(
      Animated.timing(wheelSpin, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    wheelLoop.start();

    // Listen to progress to trigger milestone reveals
    const listenerId = vehicleProgress.addListener(({ value }) => {
      const currentY = value * roadHeight; // approximate Y position of vehicle
      milestoneYPositions.forEach((mY, i) => {
        // Reveal when vehicle passes 20px below each milestone's Y position
        if (!revealedRef.current[i] && currentY >= mY) {
          revealedRef.current = [...revealedRef.current];
          revealedRef.current[i] = true;
          setRevealed(prev => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
          // Animate fade-in + slide up for this milestone
          Animated.timing(revealAnims[i], {
            toValue: 1,
            duration: 700,
            delay: 100,
            useNativeDriver: true,
          }).start();
        }
      });

      // On loop wrap (progress resets), reset all reveals
      if (value < 0.02 && revealedRef.current.some(r => r)) {
        revealedRef.current = milestones.map(() => false);
        setRevealed(milestones.map(() => false));
        revealAnims.forEach(a => a.setValue(0));
      }
    });

    return () => {
      loop.stop();
      wheelLoop.stop();
      vehicleProgress.removeListener(listenerId);
    };
  }, [milestones.length, roadHeight]);

  return (
    <View style={rm.section}>
      <SectionHeader icon={Zap} iconColor="#22d3ee" tag="JOURNEY" title="RICORRENZA" subLight="EVOLUTION" subtitle="Our journey to making this festival unforgettable" />

      <View style={{ width: viewWidth, height: containerHeight, marginTop: 20 }}>
        {/* Bottom Fade */}
        <LinearGradient
          colors={['transparent', '#070710']}
          style={[StyleSheet.absoluteFillObject, { top: containerHeight * 0.78, zIndex: 5 }]}
          pointerEvents="none"
        />

        {/* Z-Pattern Road SVG */}
        <Svg height={containerHeight} width={viewWidth} style={StyleSheet.absoluteFillObject}>
          <Defs>
            <SvgLinearGradient id="roadGradRm" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#1e293b" />
              <Stop offset="50%" stopColor="#334155" />
              <Stop offset="100%" stopColor="#1e293b" />
            </SvgLinearGradient>
          </Defs>
          <Path d={pathD} stroke="#101827" strokeWidth={ROAD_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={pathD} stroke="rgba(255,255,255,0.05)" strokeWidth={ROAD_WIDTH - 12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={pathD} stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeDasharray="14 26" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={pathD} stroke="rgba(34,211,238,0.35)" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>

        {/* Milestone Cards — revealed progressively as ambulance passes */}
        {milestones.map((m, i) => {
          const isLeft = i % 2 === 0;
          const yPos = milestoneYPositions[i];

          return (
            <Animated.View
              key={m.id}
              pointerEvents="none"
              style={[
                rm.milestoneContainer,
                { top: yPos },
                isLeft ? { left: 10 } : { right: 10, alignItems: 'flex-end' },
                {
                  opacity: revealAnims[i],
                  transform: [{ translateY: revealAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                },
              ]}
            >
              <Text style={[rm.milT, m.status === 'current' && { color: '#22d3ee' }]}>{m.year}</Text>
              <View style={[rm.linesContainer, !isLeft && { alignItems: 'flex-end' }]}>
                {m.lines.map((line: string, j: number) => (
                  <View key={j} style={[rm.lineRow, !isLeft && { flexDirection: 'row-reverse' }]}>
                    <View style={[rm.bullet, m.status === 'current' && { backgroundColor: '#22d3ee' }]} />
                    <Text style={[rm.milD, !isLeft && { textAlign: 'right', marginRight: 8, marginLeft: 0 }, m.status === 'current' && { color: '#f8fafc' }]}>{line}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          );
        })}

        {/* Ambulance with properly spinning wheels */}
        {(() => {
          const wheelRotate = wheelSpin.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          });
          return (
            <Animated.View style={[
              rm.vehicleLayer,
              { transform: [
                { translateX: vehicleX },
                { translateY: vehicleY },
                { rotate: vehicleRotation },
              ]}
            ]}>
              <View style={rm.vehicleGlow} />

              {/* ── AMBULANCE BODY (pure SVG, no animated children) ── */}
              <Svg width={100} height={56} viewBox="0 0 100 56" style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Main body */}
                <Path d="M6 10 L72 10 L72 40 L6 40 Z" fill="#f0f4f8" stroke="#cbd5e1" strokeWidth={0.8} />
                {/* Cab */}
                <Path d="M72 12 L88 12 L96 24 L96 40 L72 40 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.8} />
                {/* Windshield */}
                <Path d="M73 13 L86 13 L92 22 L73 22 Z" fill="rgba(34,211,238,0.3)" stroke="#22d3ee" strokeWidth={0.8} />
                {/* Red stripe */}
                <Path d="M6 28 L72 28 L72 33 L6 33 Z" fill="#ef4444" />
                {/* Red Cross */}
                <Path d="M32 14 L32 24" stroke="#ef4444" strokeWidth={3.5} strokeLinecap="round" />
                <Path d="M28 19 L36 19" stroke="#ef4444" strokeWidth={3.5} strokeLinecap="round" />
                {/* Siren lights */}
                <Path d="M14 6 L22 6 L22 10 L14 10 Z" fill="#ef4444" />
                <Path d="M24 6 L32 6 L32 10 L24 10 Z" fill="#60a5fa" />
                {/* Headlight */}
                <Path d="M96 20 L100 20 L100 26 L96 26 Z" fill="#fef08a" />
                {/* Rear light */}
                <Path d="M4 14 L6 14 L6 20 L4 20 Z" fill="#fca5a5" />
                {/* Wheel circles (static outlines only — spokes added outside) */}
                <Path d="M78 40 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0" fill="#1e293b" stroke="#475569" strokeWidth={1.2} />
                <Path d="M78 40 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" fill="#334155" />
                <Path d="M20 40 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0" fill="#1e293b" stroke="#475569" strokeWidth={1.2} />
                <Path d="M20 40 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" fill="#334155" />
                {/* Ground glow */}
                <Path d="M6 48 L96 48" stroke="rgba(34,211,238,0.35)" strokeWidth={2} strokeLinecap="round" />
              </Svg>

              {/* ── FRONT WHEEL SPOKES (React Native Views, positioned over wheel) ── */}
              {/* Front wheel center in SVG: (78, 40), in container: (78, 40) */}
              <Animated.View style={[
                rm.spokesWrapper,
                { left: 70, top: 32 },
                { transform: [{ rotate: wheelRotate }] }
              ]}>
                <View style={[rm.spokeH]} />
                <View style={[rm.spokeV]} />
              </Animated.View>

              {/* ── REAR WHEEL SPOKES ── */}
              {/* Rear wheel center: (20, 40) */}
              <Animated.View style={[
                rm.spokesWrapper,
                { left: 12, top: 32 },
                { transform: [{ rotate: wheelRotate }] }
              ]}>
                <View style={[rm.spokeH]} />
                <View style={[rm.spokeV]} />
              </Animated.View>

            </Animated.View>
          );
        })()}

      </View>
    </View>
  );
}

const rm = StyleSheet.create({
  section: { marginBottom: 56, overflow: 'hidden' },
  milestoneContainer: { position: 'absolute', width: '42%', zIndex: 10 },
  milT: { color: '#fff', fontSize: 34, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 8 },
  linesContainer: { gap: 5, marginTop: 2 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  bullet: { width: 4, height: 4, borderRadius: 2, marginTop: 1, backgroundColor: '#64748b', flexShrink: 0 },
  milD: { color: '#cbd5e1', fontSize: 10, lineHeight: 15, fontWeight: '700', marginLeft: 7, flexShrink: 1, textShadowColor: 'black', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  vehicleLayer: { position: 'absolute', zIndex: 20, width: 100, height: 56 },
  vehicleGlow: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -4, borderRadius: 50, backgroundColor: 'rgba(34,211,238,0.12)' },
  spokesWrapper: { position: 'absolute', width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  spokeH: { position: 'absolute', width: 14, height: 2, borderRadius: 1, backgroundColor: '#64748b' },
  spokeV: { position: 'absolute', width: 2, height: 14, borderRadius: 1, backgroundColor: '#64748b' },
  vehicleImg: { width: 90, height: 52 },
});

// ─── 7. ABOUT ─────────────────────────────────────────────────────────────────
function About({ about }: { about: AboutSettings | null }) {
  const defaultStats = [{ value: '4+', label: 'Years' }, { value: '30+', label: 'Events' }, { value: '2000+', label: 'Students' }, { value: '3', label: 'Days' }];
  const stats = (about?.stats && about.stats.length > 0) ? about.stats : defaultStats;
  const paras = about?.hero_paragraphs || [];
  const desc = paras.length > 0 ? paras.join(' ') : 'RICORRENZA is the annual cultural festival of the Medical College, bringing together students to celebrate music, arts, and creativity.';
  return (
    <View style={abt.section}>
      <SectionHeader icon={Star} iconColor="#22d3ee" tag="WHO WE ARE" title="ABOUT" subLight="RICORRENZA" />
      <View style={{ paddingHorizontal: 20 }}>
        <BlurView intensity={20} tint="dark" style={abt.card}>
          <LinearGradient colors={['rgba(34,211,238,0.1)','rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFillObject} />
          <View style={abt.accentLine} />
          {about?.hero_heading ? <Text style={abt.heading}>{about.hero_heading}</Text> : null}
          <Text style={abt.desc}>{desc}</Text>
          <View style={abt.grid}>
            {stats.map((s, i) => (
              <View key={i} style={abt.stat}>
                <Text style={abt.sVal}>{s.value}</Text>
                <Text style={abt.sLbl}>{s.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={abt.btn} onPress={() => router.push('/(tabs)/family')} activeOpacity={0.8}>
            <Users size={14} color="#22d3ee" />
            <Text style={abt.btnT}>MEET THE RICO FAMILY</Text>
            <ChevronRight size={14} color="#22d3ee" />
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
}
const abt = StyleSheet.create({
  section: { marginBottom: 56 },
  card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(34,211,238,0.15)', padding: 20 },
  accentLine: { position: 'absolute', left: 0, top: 20, bottom: 20, width: 3, borderRadius: 2, backgroundColor: '#22d3ee' },
  heading: { color: '#22d3ee', fontSize: 15, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 8 },
  desc: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 22, marginBottom: 20, paddingLeft: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  stat: { flex: 1, minWidth: (width - 80) / 2 - 5, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, alignItems: 'center' },
  sVal: { color: '#22d3ee', fontSize: 24, fontWeight: '900', textShadowColor: 'rgba(34,211,238,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  sLbl: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)', backgroundColor: 'rgba(34,211,238,0.07)' },
  btnT: { color: '#22d3ee', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});

// ─── 8. FOOTER ────────────────────────────────────────────────────────────────
function Footer({ ig, yt }: { ig?: string | null; yt?: string | null }) {
  return (
    <View style={foot.wrap}>
      <View style={foot.bar} />
      <Text style={foot.logo}>RICORRENZA</Text>
      <Text style={foot.tag}>2026 · Music That Moves You</Text>
      <View style={foot.socials}>
        <TouchableOpacity onPress={() => ig && Linking.openURL(ig)} style={[foot.btn, { borderColor: 'rgba(244,114,182,0.3)' }]}><Instagram size={18} color="#f472b6" /></TouchableOpacity>
        <TouchableOpacity onPress={() => yt && Linking.openURL(yt)} style={[foot.btn, { borderColor: 'rgba(248,113,113,0.3)' }]}><Youtube size={18} color="#f87171" /></TouchableOpacity>
      </View>
      <Text style={foot.cp}>© 2026 RICORRENZA FEST COMMITTEE</Text>
    </View>
  );
}
const foot = StyleSheet.create({
  wrap: { paddingTop: 48, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center', backgroundColor: '#070710', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  bar: { width: 60, height: 2, borderRadius: 1, backgroundColor: '#818cf8', marginBottom: 24 },
  logo: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 3, textShadowColor: 'rgba(129,140,248,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, marginBottom: 4 },
  tag: { color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: 1.5, marginBottom: 24 },
  socials: { flexDirection: 'row', gap: 14, marginBottom: 28 },
  btn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cp: { color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
});

// ─── ARTIST DETAIL MODAL ───────────────────────────────────────────────────
function ArtistDetailModal({ artist, visible, onClose }: { artist: GuestArtist | null; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    if (visible && artist?.detail_music_url) {
      loadAndPlay();
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible, artist]);

  async function loadAndPlay() {
    try {
      let url = artist?.detail_music_url || '';
      if (url.includes('?')) url = url.split('?')[0];

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      setSound(newSound);
    } catch (e) {
      console.warn('Failed to play artist audio:', e);
    }
  }

  if (!artist) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject}>
        <View style={[modal.overlay, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={modal.closeArea} activeOpacity={1} onPress={onClose} />
          
          <View style={modal.container}>
            <LinearGradient colors={['rgba(26,5,51,0.95)', 'rgba(7,7,16,0.98)']} style={StyleSheet.absoluteFillObject} />
            
            <View style={modal.header}>
              <View style={modal.imgWrap}>
                {artist.image ? (
                  <Image source={{ uri: artist.image }} style={modal.image} resizeMode="cover" />
                ) : (
                  <View style={modal.imageFallback}><Text style={modal.fallbackT}>{artist.name[0]}</Text></View>
                )}
              </View>
              <View style={modal.headerInfo}>
                <Text style={modal.name}>{artist.name}</Text>
                <Text style={modal.title}>{artist.title || artist.specialty || 'Featured Artist'}</Text>
                <View style={modal.socials}>
                  {artist.social_links?.instagram && (
                    <TouchableOpacity onPress={() => Linking.openURL(artist.social_links!.instagram)}>
                      <Instagram size={18} color="#f472b6" />
                    </TouchableOpacity>
                  )}
                  {artist.social_links?.youtube && (
                    <TouchableOpacity onPress={() => Linking.openURL(artist.social_links!.youtube)}>
                      <Youtube size={18} color="#f87171" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <ScrollView style={modal.scroll} showsVerticalScrollIndicator={false}>
              <View style={modal.content}>
                <Text style={modal.sectionT}>ABOUT</Text>
                <Text style={modal.desc}>{artist.description || 'No description available for this artist.'}</Text>
                
                {artist.achievements && artist.achievements.length > 0 && (
                  <>
                    <Text style={modal.sectionT}>ACHIEVEMENTS</Text>
                    {artist.achievements.map((ach, i) => (
                      <View key={i} style={modal.achItem}>
                        <Star size={12} color="#f43f5e" />
                        <Text style={modal.achText}>{ach}</Text>
                      </View>
                    ))}
                  </>
                )}
                
                {artist.detail_music_url && (
                  <View style={modal.audioNote}>
                    <Music2 size={12} color="#818cf8" />
                    <Text style={modal.audioNoteT} numberOfLines={1}>Audio playing in background</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
              <Text style={modal.closeBtnT}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  closeArea: { ...StyleSheet.absoluteFillObject },
  container: { width: '100%', maxHeight: height * 0.75, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  header: { padding: 24, flexDirection: 'row', gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  imgWrap: { width: 90, height: 90, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)' },
  image: { width: '100%', height: '100%' },
  imageFallback: { width: '100%', height: '100%', backgroundColor: '#1a0533', alignItems: 'center', justifyContent: 'center' },
  fallbackT: { color: 'rgba(255,255,255,0.2)', fontSize: 32, fontWeight: '900' },
  headerInfo: { flex: 1, justifyContent: 'center' },
  name: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  title: { color: '#f43f5e', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  socials: { flexDirection: 'row', gap: 12, marginTop: 12 },
  scroll: { maxHeight: 400 },
  content: { padding: 24 },
  sectionT: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  desc: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  achItem: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  achText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, flex: 1 },
  audioNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, opacity: 0.6 },
  audioNoteT: { color: '#818cf8', fontSize: 10, fontWeight: '700' },
  closeBtn: { padding: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  closeBtnT: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { 
    heroMedia, guestArtists, eventWinners, sponsors, 
    facultyHeads, coreTeamMembers, milestones, 
    aboutSettings, socialMediaSettings, loading 
  } = useData();

  const [selectedArtist, setSelectedArtist] = useState<GuestArtist | null>(null);
  const [artistModalVisible, setArtistModalVisible] = useState(false);

  const homeHero = useMemo(() => 
    heroMedia.find(m => m.page_key === 'home' && m.enabled) || heroMedia.find(m => m.enabled) || null,
    [heroMedia]
  );

  const committeeHeads = useMemo(() => 
    coreTeamMembers.filter(m => m.is_head && m.enabled),
    [coreTeamMembers]
  );

  const handleArtistPress = (artist: GuestArtist) => {
    setSelectedArtist(artist);
    setArtistModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[main.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#818cf8" />
        <Text style={main.loadT}>LOADING RICORRENZA...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[main.root, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <HeroSection heroMedia={homeHero} />
      <View style={main.gap}><FeaturedArtists artists={guestArtists.filter(a => a.enabled)} onArtistPress={handleArtistPress} /></View>
      <View style={main.gap}><HallOfGlory winners={eventWinners} /></View>
      <View style={main.gap}><Partners sponsors={sponsors.filter(s => s.featured)} /></View>
      <View style={main.gap}><Leadership facultyHeads={facultyHeads} committeeHeads={committeeHeads as any} /></View>
      <View style={main.gap}><Roadmap roadmapMilestones={milestones || []} /></View>
      <View style={main.gap}><About about={aboutSettings} /></View>
      <Footer 
        ig={socialMediaSettings?.instagram || "https://instagram.com/ricorrenza"} 
        yt={socialMediaSettings?.youtube || "https://youtube.com/ricorrenza"} 
      />
      
      <ArtistDetailModal 
        visible={artistModalVisible}
        artist={selectedArtist}
        onClose={() => setArtistModalVisible(false)}
      />
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
const main = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070710' },
  loading: { flex: 1, backgroundColor: '#070710', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadT: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  gap: { paddingTop: 56 },
});
