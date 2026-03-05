import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { 
  Calendar, Clock, Users, ImagePlus, Briefcase, LogIn, Home, ChevronRight, ShieldCheck
} from 'lucide-react-native';
import { useAuth } from '../../components/AuthProvider';

const { width } = Dimensions.get('window');

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();
  
  const menuItems = [
    { label: 'Home', icon: Home, route: '/(tabs)' },
    { label: 'Events', icon: Calendar, route: '/(tabs)/events' },
    { label: 'Schedule', icon: Clock, route: '/(tabs)/schedule' },
    { label: 'Gallery', icon: ImagePlus, route: '/(tabs)/gallery' },
    { label: 'Home Bound', icon: Users, route: '/(tabs)/home-bound' },
    { label: 'Rico Family', icon: Users, route: '/(tabs)/family' },
    { label: 'Sponsors', icon: Briefcase, route: '/(tabs)/sponsors' },
    { label: 'Login', icon: LogIn, route: '/(auth)/login' },
  ];

  const adminItems = user ? [
    { label: 'Admin: Auditions', icon: ShieldCheck, route: '/admin/auditions' },
  ] : [];

  const allItems = [...menuItems, ...adminItems];

  const handleNav = (route: string) => {
    if (route === '/(tabs)') {
       router.replace('/(tabs)');
    } else {
       router.push(route as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Dark background base to match index.tsx style */}
      <LinearGradient colors={['#090015', '#03071a', '#000712']} style={StyleSheet.absoluteFillObject} />
      
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject}>
        <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoBackground}>
                <Image 
                  source={{ uri: 'https://ucarecdn.com/13149594-5544-46c5-9271-e0e64036cb87/' }} 
                  style={styles.logoImg}
                />
              </View>
              <View>
                <Text style={styles.logoTitle}>RICORRENZA</Text>
                <Text style={styles.year}>FESTIVAL 2026</Text>
              </View>
            </View>
          </View>

          {/* Links */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            <Text style={styles.sectionLabel}>NAVIGATION</Text>
            {allItems.map((item, idx) => {
              const isActive = pathname === item.route;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.item, isActive && styles.itemA]} 
                  onPress={() => handleNav(item.route)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, isActive && styles.iconBoxA]}>
                    <item.icon size={18} color={isActive ? '#fff' : 'rgba(255,255,255,0.5)'} strokeWidth={2} />
                  </View>
                  <Text style={[styles.itemT, isActive && styles.itemTA]}>{item.label}</Text>
                  <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.divider} />
            <Text style={styles.sponsoredBy}>Official Partner</Text>
            <View style={styles.sponsorRow}>
              <Image 
                source={{ uri: 'https://ricorrenza.fun/assets/ZIGMA%20LOGO-CSbVp072.png' }} 
                style={styles.sponsorLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.sponsorName}>ZIGMA GROUP</Text>
                <Text style={styles.sponsorTag}>Innovation & Excellence</Text>
              </View>
            </View>
          </View>

        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070710' },
  root: { flex: 1, paddingHorizontal: 24 },
  header: { marginBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoBackground: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: 36, height: 36 },
  logoTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  year: { color: '#22d3ee', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginTop: -2 },
  
  list: { gap: 10, paddingBottom: 20 },
  sectionLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8, paddingHorizontal: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  itemA: { backgroundColor: 'rgba(34,211,238,0.08)', borderColor: 'rgba(34,211,238,0.2)' },
  iconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  iconBoxA: { backgroundColor: '#22d3ee' },
  itemT: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700', flex: 1 },
  itemTA: { color: '#fff', fontWeight: '800' },

  footer: { marginTop: 'auto', paddingVertical: 10 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
  sponsoredBy: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  sponsorLogo: { width: 32, height: 32 },
  sponsorName: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  sponsorTag: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '600' },
});
