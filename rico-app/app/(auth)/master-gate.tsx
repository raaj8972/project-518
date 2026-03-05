import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  withDelay, 
  Easing,
  SharedValue 
} from 'react-native-reanimated';

export default function MasterGate() {
  const router = useRouter();
  const [authId, setAuthId] = useState('');

  // Animations
  const pingScale = useSharedValue(1);
  const pingOpacity = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  useEffect(() => {
    // Ping Animation
    pingScale.value = withRepeat(
      withTiming(2, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    pingOpacity.value = withRepeat(
      withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    // Pulse Animation
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 })
      ),
      -1,
      true
    );

    // Bounce Animations for Dots
    const bounceConfig = { duration: 500, easing: Easing.inOut(Easing.ease) };
    dot1Y.value = withRepeat(withSequence(withTiming(-10, bounceConfig), withTiming(0, bounceConfig)), -1, true);
    setTimeout(() => {
      dot2Y.value = withRepeat(withSequence(withTiming(-10, bounceConfig), withTiming(0, bounceConfig)), -1, true);
    }, 200);
    setTimeout(() => {
      dot3Y.value = withRepeat(withSequence(withTiming(-10, bounceConfig), withTiming(0, bounceConfig)), -1, true);
    }, 400);

  }, []);

  const pingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pingScale.value }],
    opacity: pingOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const getDotStyle = (yValue: SharedValue<number>) => useAnimatedStyle(() => ({
    transform: [{ translateY: yValue.value }],
  }));

  useEffect(() => {
    // Generate a secure, unique session token (simulated for RN)
    const secureToken = Math.random().toString(36).substring(2, 18);
    const id = secureToken.slice(-16);
    setAuthId(id);
    
    // Redirect after a deliberate delay to login page with master mode
    const timer = setTimeout(() => {
      // Pass the gatePass securely. In Expo Router, you can use query params or global state.
      router.replace({ pathname: '/(auth)/login', params: { mode: 'master', gatePass: `vault_v2_${secureToken}_${Date.now()}` } });
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 bg-black items-center justify-center">
      <View className="items-center space-y-6">
        
        {/* Shield Animation Area */}
        <View className="relative w-24 h-24 items-center justify-center mb-8">
          <Animated.View 
            className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"
            style={pingStyle}
          />
          <View className="absolute inset-0 border-4 border-cyan-500 rounded-full items-center justify-center bg-black">
            <Animated.View style={pulseStyle}>
               <ShieldAlert color="#06b6d4" size={40} />
            </Animated.View>
          </View>
        </View>

        <View className="items-center space-y-3">
            <Text className="text-cyan-400 text-sm font-bold tracking-widest uppercase mb-4">
              System Handshake
            </Text>
            
            {/* Bouncing Dots */}
            <View className="flex-row justify-center gap-2 mb-6">
                <Animated.View className="w-2.5 h-2.5 bg-cyan-500 rounded-full" style={getDotStyle(dot1Y)} />
                <Animated.View className="w-2.5 h-2.5 bg-cyan-500 rounded-full" style={getDotStyle(dot2Y)} />
                <Animated.View className="w-2.5 h-2.5 bg-cyan-500 rounded-full" style={getDotStyle(dot3Y)} />
            </View>

            <Text className="text-gray-600 text-[10px] uppercase mt-4 mb-6">
              Initializing secure node communication...
            </Text>
            
            <View className="mt-6 pt-4 border-t border-cyan-500/10 w-full items-center">
              <Text className="text-[10px] text-gray-700 font-mono mb-1">
                AUTH_ID: {authId}
              </Text>
              <Text className="text-[10px] text-gray-700 font-mono">
                NODE_SYNC: OK
              </Text>
            </View>
        </View>

      </View>
    </View>
  );
}
