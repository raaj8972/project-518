import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image as RNImage } from 'react-native';
import Svg, { Path, Circle, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// ─── ECG Constants ─────────────────────────────────────────────────────────────
const ECG_ONE_BEAT: [number, number][] = [
  [0, 30], [18, 30], [22, 26], [26, 30],
  [34, 30], [36, 34], [38, 8], [40, 52], [42, 30],
  [60, 30], [68, 28], [76, 22], [84, 28], [92, 30],
  [100, 30],
];

const ECG_POINTS: [number, number][] = [];
for (let i = 0; i < 4; i++) {
  ECG_ONE_BEAT.forEach(([x, y]) => ECG_POINTS.push([x + i * 100, y]));
}
const ECG_D = 'M ' + ECG_POINTS.map(([x, y]) => `${x},${y}`).join(' L ');
const PATH_LENGTH = 820;

const QRS_THRESHOLDS = [11, 36, 61, 86];

// ──────────────────────────────────────────────────────────────────────────────
// EcgLine Component (Native)
// ──────────────────────────────────────────────────────────────────────────────
const EcgLine = ({ progress, color }: { progress: number; color: string }) => {
  const t = Math.max(0, Math.min(1, progress / 100));
  const dashOffset = PATH_LENGTH * (1 - t);

  // Approximate head dot position
  const lastIdx = ECG_POINTS.length - 1;
  const ptIdx = t * lastIdx;
  const lo = Math.max(0, Math.min(lastIdx - 1, Math.floor(ptIdx)));
  const hi = Math.min(lastIdx, lo + 1);
  const frac = ptIdx - lo;
  const pLo = ECG_POINTS[lo];
  const pHi = ECG_POINTS[hi];
  const headX = pLo[0] + (pHi[0] - pLo[0]) * frac;
  const headY = pLo[1] + (pHi[1] - pLo[1]) * frac;

  return (
    <View style={styles.ecgContainer}>
      <Svg viewBox="0 0 400 60" width="100%" height={60}>
        {/* Ghost baseline */}
        <Path
          d={ECG_D}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Drawn line */}
        <Path
          d={ECG_D}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={PATH_LENGTH}
          strokeDashoffset={dashOffset}
        />
        {/* Pulse head */}
        {progress > 0 && progress < 100 && (
          <Circle
            cx={headX}
            cy={headY}
            r="3.5"
            fill="white"
          />
        )}
      </Svg>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// PremiumPreloader Component
// ──────────────────────────────────────────────────────────────────────────────
interface PreloaderProps {
  loading: boolean;
  onComplete: () => void;
  logoUrl?: string;
}

export const PremiumPreloader: React.FC<PreloaderProps> = ({ loading, onComplete, logoUrl }) => {
  const [progress, setProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoProgress = useRef(new Animated.Value(0)).current;
  
  const baseHue = useRef(Math.floor(Math.random() * 360)).current;

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      const target = loading ? 98 : 100;
      if (currentProgress < target) {
        currentProgress += 1;
        setProgress(currentProgress);
        logoProgress.setValue(currentProgress / 100);
      } else if (!loading && currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }).start(() => onComplete());
        }, 500);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [loading, onComplete]);

  const hue = Math.round(baseHue + progress * 0.6);
  const glowColor = `hsl(${hue}, 100%, 65%)`;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#030303', '#080808']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Scanlines Overlay (Simplified for mobile) */}
      <View style={styles.scanlines} pointerEvents="none" />

      <View style={styles.content}>
        {/* Logo Monogram or Logo Image */}
        <View style={styles.logoWrapper}>
          {logoUrl ? (
            <View>
              <RNImage 
                source={{ uri: logoUrl }} 
                style={[styles.logo, { tintColor: 'rgba(255,255,255,0.05)' }]} 
                resizeMode="contain" 
              />
              <Animated.View style={[
                  styles.logoFillContainer, 
                  { height: logoProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }) 
                  }
                ]}>
                <RNImage 
                  source={{ uri: logoUrl }} 
                  style={[styles.logo, { tintColor: glowColor }]} 
                  resizeMode="contain" 
                />
              </Animated.View>
            </View>
          ) : (
            <Text style={[styles.monogram, { color: glowColor }]}>
              {String(progress).padStart(3, '0')}
            </Text>
          )}
        </View>

        {/* ECG Line */}
        <View style={styles.ecgWrapper}>
          <EcgLine progress={progress} color={glowColor} />
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: glowColor }]}>
              {String(progress).padStart(3, '0')}
            </Text>
            <Text style={[styles.percentLabel, { color: glowColor }]}>%</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#030303',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    opacity: 0.05,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoWrapper: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
  },
  logoFillContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  monogram: {
    fontSize: 72,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  ecgWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  ecgContainer: {
    width: '100%',
    height: 60,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  percentLabel: {
    fontSize: 12,
    opacity: 0.5,
    marginLeft: 4,
  }
});
