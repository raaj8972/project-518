import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withRepeat,
  withDelay,
  Easing 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/components/AuthProvider';

const { width, height } = Dimensions.get('window');

export default function HeartRateLanding() {
  const router = useRouter();
  const { session, loading } = useAuth();

  const heartScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const scanlineY = useSharedValue(0);
  
  const heartStyles = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }]
  }));

  const textStyles = useAnimatedStyle(() => ({
    opacity: textOpacity.value
  }));

  const scanlineStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: scanlineY.value }]
  }));

  useEffect(() => {
    // Heartbeat Animation
    const beat = withSequence(
      withTiming(1.2, { duration: 150, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) }),
      withDelay(200, withTiming(1.3, { duration: 200, easing: Easing.inOut(Easing.ease) })),
      withTiming(1, { duration: 250, easing: Easing.inOut(Easing.ease) })
    );
    heartScale.value = withRepeat(beat, -1, false);

    textOpacity.value = withDelay(800, withTiming(1, { duration: 800 }));

    scanlineY.value = withRepeat(
      withTiming(height, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    if (loading) return;

    // After 3s, go to tabs if logged in, otherwise login
    const timer = setTimeout(() => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [loading, session]);

  return (
    <View style={styles.container}>
      <View style={styles.gridOverlay}>
        <View style={styles.vLine} />
        <View style={styles.vLine2} />
        <View style={styles.hLine} />
        <View style={styles.hLine2} />
      </View>

      <Animated.View style={[styles.scanline, scanlineStyles]} />
      
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        <View style={styles.ekgContainer}>
           <View style={styles.ekgLineStraight} />
           <Animated.View style={[styles.heartIcon, heartStyles]}>
             <View style={styles.heartShape}>
               <View style={styles.heartLeft} />
               <View style={styles.heartRight} />
             </View>
           </Animated.View>
           <View style={styles.ekgLineStraight} />
        </View>

        <Animated.View style={[styles.textContainer, textStyles]}>
           <Text style={styles.systemText}>SYSTEM BOOT SEQUENCE INITIATED</Text>
           <Text style={styles.vitalText}>VITALS: OPTIMAL</Text>
           <Text style={styles.authText}>ESTABLISHING SECURE CONNECTION...</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  vLine:  { position: 'absolute', left: '33%', top: 0, bottom: 0, width: 1, backgroundColor: '#06b6d4' },
  vLine2: { position: 'absolute', left: '66%', top: 0, bottom: 0, width: 1, backgroundColor: '#06b6d4' },
  hLine:  { position: 'absolute', top: '33%', left: 0, right: 0, height: 1, backgroundColor: '#06b6d4' },
  hLine2: { position: 'absolute', top: '66%', left: 0, right: 0, height: 1, backgroundColor: '#06b6d4' },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    zIndex: 10,
  },
  content: {
    zIndex: 20,
    alignItems: 'center',
  },
  ekgContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.8,
    marginBottom: 40,
  },
  ekgLineStraight: {
    flex: 1,
    height: 2,
    backgroundColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  heartIcon: {
    marginHorizontal: 15,
  },
  heartShape: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartLeft: {
    position: 'absolute',
    top: 0,
    left: 15,
    width: 15,
    height: 25,
    backgroundColor: '#06b6d4',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    transform: [{ rotate: '-45deg' }, { translateX: -5 }],
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  heartRight: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 15,
    height: 25,
    backgroundColor: '#06b6d4',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    transform: [{ rotate: '45deg' }, { translateX: 5 }],
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  systemText: {
    color: '#06b6d4',
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  vitalText: {
    color: '#34d399',
    fontFamily: 'Courier',
    fontSize: 12,
    letterSpacing: 3,
    marginBottom: 8,
  },
  authText: {
    color: '#94a3b8',
    fontFamily: 'Courier',
    fontSize: 10,
    letterSpacing: 1,
  }
});
