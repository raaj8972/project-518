import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

/**
 * Mobile equivalent of the web's NoiseOverlay.
 * Uses a faint radial gradient vignette to ground the look.
 * In a real production app, we would also overlay a grain/noise texture image.
 */
export const NoiseOverlay: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Cinematic Vignette */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)']}
        style={styles.vignette}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* Radial overlay for that "screen" feel */}
      <View style={styles.radial} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
  },
  radial: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // We could add a repeating noise pattern here if we had a suitable asset
  }
});
