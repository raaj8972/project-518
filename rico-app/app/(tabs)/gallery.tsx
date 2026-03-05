import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Modal, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ImageIcon, X, Filter } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/components/DataProvider';
import { GalleryImage } from '@/types/data';
import { sanitizeUrl } from '@/utils/dataUtils';

const { width } = Dimensions.get('window');
const COLUMNS = 2;
const SPACING = 12;
const CARD_W = (width - 40 - (COLUMNS - 1) * SPACING) / COLUMNS;

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { galleryImages } = useData();
  
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const images = useMemo(() => (galleryImages || []).filter(i => i && i.src), [galleryImages]);

  const categories = useMemo(() => {
    const cats = new Set(images.map(img => (img.category || '').trim()).filter(Boolean));
    return ['All', ...Array.from(cats)].sort();
  }, [images]);

  const subcategories = useMemo(() => {
    if (selectedCat === 'All') return [];
    const subs = new Set<string>();
    images.forEach(img => {
      const imgCat = (img.category || '').trim();
      const sub = (img.subcategory || '').trim();
      if (imgCat === selectedCat && sub) {
        subs.add(sub);
      }
    });
    return Array.from(subs).sort();
  }, [images, selectedCat]);

  const filtered = useMemo(() => {
    if (selectedCat === 'All') return images;
    return images.filter(img => {
      const imgCat = (img.category || '').trim();
      if (imgCat !== selectedCat) return false;
      if (selectedSubCat) {
        const imgSub = (img.subcategory || '').trim();
        return imgSub === selectedSubCat;
      }
      return true;
    });
  }, [images, selectedCat, selectedSubCat]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>GALLERY</Text>
          <Text style={styles.headerSub}>Ricorrenza 2026 · Moments</Text>
        </View>
      </View>

      {/* Categories */}
      {categories.length > 1 && (
        <View style={styles.filterSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {categories.map(cat => {
              const active = selectedCat === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedCat(cat);
                    setSelectedSubCat(null);
                  }}
                  style={[styles.catPill, active && styles.catPillActive]}
                >
                  <Text style={[styles.catText, active && styles.catTextActive]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Subcategories (if any exist for the selected category) */}
          {subcategories.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.catScroll, { marginTop: 12 }]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedSubCat(null)}
                style={[styles.subPill, !selectedSubCat && styles.subPillActive]}
              >
                <Text style={[styles.subText, !selectedSubCat && styles.subTextActive]}>
                  ALL EVENTS
                </Text>
              </TouchableOpacity>
              
              {subcategories.map(sub => {
                const active = selectedSubCat === sub;
                return (
                  <TouchableOpacity
                    key={sub}
                    activeOpacity={0.7}
                    onPress={() => setSelectedSubCat(sub)}
                    style={[styles.subPill, active && styles.subPillActive]}
                  >
                    <Text style={[styles.subText, active && styles.subTextActive]}>
                      {sub.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Grid */}
      <FlatList
        data={filtered}
        keyExtractor={img => img.id.toString()}
        numColumns={COLUMNS}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridOuter}
        columnWrapperStyle={{ gap: SPACING, marginBottom: SPACING }}
        ListFooterComponent={<View style={{ height: 100 }} />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={({ item: img }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedImage(img)}
            style={styles.card}
          >
            <Image 
              source={{ uri: sanitizeUrl(img.src, { width: 300 }) }} 
              style={styles.cardImg} 
              contentFit="cover" 
              transition={200}
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['transparent', 'rgba(5,5,15,0.8)']}
              style={styles.cardGradient}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{img.title || 'Untitled'}</Text>
              {(img.category || img.year) && (
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {[img.category, img.year].filter(Boolean).join(' • ')}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => setSelectedImage(null)}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>

          {selectedImage && (
            <View style={styles.modalContent}>
              <Image 
                source={{ uri: sanitizeUrl(selectedImage.src) }} 
                style={styles.modalImg} 
                contentFit="contain" 
                transition={300}
                cachePolicy="memory-disk"
              />
              
              <View style={styles.modalTextContainer}>
                <Text style={styles.modalTitle}>{selectedImage.title || 'Gallery Image'}</Text>
                <View style={styles.modalMetaRow}>
                  {selectedImage.category && (
                    <View style={styles.modalBadge}>
                      <Text style={styles.modalBadgeText}>{selectedImage.category.toUpperCase()}</Text>
                    </View>
                  )}
                  {selectedImage.year && (
                    <Text style={styles.modalYear}>{selectedImage.year}</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050a' },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  headerTitle: {
    color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1,
    textShadowColor: 'rgba(236,72,153,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: -2,
  },

  filterSection: { paddingVertical: 12 },
  catScroll: { paddingHorizontal: 20, gap: 10 },
  catPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  catPillActive: { backgroundColor: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.5)' },
  catText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  catTextActive: { color: '#ec4899' },

  subPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  subPillActive: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.5)' },
  subText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  subTextActive: { color: '#c084fc', fontWeight: '800' },

  gridOuter: { paddingHorizontal: 20, paddingTop: 10 },
  
  card: {
    width: CARD_W, height: CARD_W * 1.25,
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  cardImg: { width: '100%', height: '100%' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  cardInfo: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  cardTitle: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  cardMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  closeBtn: {
    position: 'absolute', top: 60, right: 20, zIndex: 10,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  modalContent: { width: '100%', height: '100%', justifyContent: 'center' },
  modalImg: { width: width, height: width * 1.5, maxHeight: '70%' },
  modalTextContainer: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    padding: 24, borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 12 },
  modalMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(236,72,153,0.2)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.4)',
  },
  modalBadgeText: { color: '#ec4899', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modalYear: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
});
