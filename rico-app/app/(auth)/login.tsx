import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../supabase';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, Shield, Zap, Users, BarChart3, ChevronRight, Key, Mail } from 'lucide-react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Sign In Error', error.message);
      setLoading(false);
    } else {
      router.replace('/(tabs)');
    }
  }

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Sign Up Error', error.message);
    if (!session) Alert.alert('Check your email for the confirmation link!');
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-black">
      {/* Video Background */}
      <View className="absolute inset-0 z-0">
        <Video
          source={require('../../assets/images/login_page_video.mp4')}
          shouldPlay
          isLooping
          isMuted
          resizeMode={ResizeMode.COVER}
          className="w-full h-full opacity-60 scale-105"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
          className="absolute inset-0"
        />
        <View className="absolute inset-0 bg-black/30" />
      </View>

      <View className="relative z-10 flex-1 justify-center p-4">
        <View className="w-full max-w-md mx-auto">
          {/* Glassmorphic Card */}
          <BlurView intensity={25} tint="dark" className="overflow-hidden rounded-3xl border border-white/10 bg-black/40">
            {/* Top accent bar */}
            <LinearGradient
              colors={['#06b6d4', '#a855f7', '#06b6d4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="h-1 w-full"
            />
            
            <View className="p-6 md:p-8">
              {/* Header */}
              <View className="items-center mb-6">
                <View className="flex-row justify-center mb-4">
                   <View className="p-3 rounded-2xl border border-white/10 bg-white/5">
                     <Shield color="#22d3ee" size={32} />
                   </View>
                </View>
                <Text className="text-3xl font-extrabold tracking-tighter text-white uppercase italic">
                  Admin Control
                </Text>
                <Text className="text-cyan-400 font-mono text-[10px] tracking-[0.2em] mt-2 uppercase opacity-80 decoration-cyan-500/30">
                  Authentication Gateway OS 2.6
                </Text>
              </View>

              {/* Login Modes Container */}
              <View className="min-h-[300px]">
                
                {/* Mode Selection Grid */}
                {!isFormOpen && (
                  <View className="flex flex-col gap-3">
                    <Text className="text-gray-500 text-[10px] font-bold mb-1 ml-1 uppercase tracking-[0.3em]">Access Role</Text>
                    
                    <TouchableOpacity
                      onPress={() => setIsFormOpen(true)}
                      className="flex-row items-center justify-between p-3 rounded-2xl border border-white/10 bg-cyan-900/20"
                    >
                      <View className="flex-row items-center gap-4">
                        <View className="p-3 rounded-xl bg-cyan-400/10">
                          <Zap color="#22d3ee" size={20} />
                        </View>
                        <View>
                          <Text className="font-bold text-sm text-white">Admin Panel</Text>
                          <Text className="text-[10px] text-gray-400">High-level orchestration</Text>
                        </View>
                      </View>
                      <ChevronRight color="#4b5563" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-row items-center justify-between p-3 rounded-2xl border border-white/10 bg-purple-900/20"
                    >
                      <View className="flex-row items-center gap-4">
                        <View className="p-3 rounded-xl bg-purple-400/10">
                          <Shield color="#c084fc" size={20} />
                        </View>
                        <View>
                          <Text className="font-bold text-sm text-white">Security Node</Text>
                          <Text className="text-[10px] text-gray-400">Scan & Entry verification</Text>
                        </View>
                      </View>
                      <ChevronRight color="#4b5563" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-row items-center justify-between p-3 rounded-2xl border border-white/10 bg-emerald-900/20"
                    >
                      <View className="flex-row items-center gap-4">
                        <View className="p-3 rounded-xl bg-emerald-400/10">
                          <BarChart3 color="#34d399" size={20} />
                        </View>
                        <View>
                          <Text className="font-bold text-sm text-white">Council</Text>
                          <Text className="text-[10px] text-gray-400">Analytics dashboard</Text>
                        </View>
                      </View>
                      <ChevronRight color="#4b5563" size={20} />
                    </TouchableOpacity>

                    {/* ── Guest / Dev bypass ── */}
                    <TouchableOpacity
                      onPress={() => router.replace('/(tabs)')}
                      className="flex-row items-center justify-center mt-2 p-3 rounded-2xl border border-white/5 bg-white/3"
                    >
                      <Text className="text-gray-500 text-xs tracking-widest font-bold uppercase">
                        ⟶  View App (Guest)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Form Content */}
                {isFormOpen && (
                  <View className="space-y-6">
                    <View className="space-y-2 mb-4">
                      <Text className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70 font-bold ml-1 mb-1">Identity (Email)</Text>
                      <View className="relative justify-center">
                        <TextInput
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-medium pl-10"
                          onChangeText={(text) => setEmail(text)}
                          value={email}
                          placeholder="cyber@ricorrenza.fun"
                          placeholderTextColor="#71717a"
                          autoCapitalize="none"
                          autoComplete="email"
                          keyboardType="email-address"
                        />
                        <View className="absolute left-4">
                           <Mail color="#71717a" size={16} />
                        </View>
                      </View>
                    </View>

                    <View className="space-y-2 mb-6">
                      <Text className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70 font-bold ml-1 mb-1">Access Key (Password)</Text>
                      <View className="relative justify-center">
                        <TextInput
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-medium pl-10"
                          onChangeText={(text) => setPassword(text)}
                          value={password}
                          secureTextEntry={!showPassword}
                          placeholder="••••••••"
                          placeholderTextColor="#71717a"
                          autoCapitalize="none"
                        />
                        <View className="absolute left-4">
                           <Key color="#71717a" size={16} />
                        </View>
                        <TouchableOpacity
                          className="absolute right-4"
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff color="#71717a" size={16} /> : <Eye color="#71717a" size={16} />}
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="flex-col gap-3">
                      <TouchableOpacity
                        className="w-full bg-cyan-400 rounded-xl py-4 items-center justify-center flex-row shadow-lg shadow-cyan-400/20"
                        disabled={loading}
                        onPress={() => signInWithEmail()}
                      >
                        {loading ? (
                          <ActivityIndicator color="#000" />
                        ) : (
                          <View className="flex-row items-center gap-2">
                             <Key color="#000" size={18} />
                             <Text className="text-black font-bold uppercase tracking-widest text-sm">Initiate Session</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <View className="flex-row gap-2 mt-2">
                         <TouchableOpacity
                           onPress={() => setIsFormOpen(false)}
                           className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 items-center justify-center"
                         >
                           <Text className="text-white text-xs font-bold uppercase tracking-widest">Back</Text>
                         </TouchableOpacity>
                         
                         <TouchableOpacity
                           onPress={() => signUpWithEmail()}
                           className="flex-1 px-4 py-3 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex-row items-center justify-center gap-2"
                         >
                           <Text className="text-cyan-400 text-xs font-bold uppercase tracking-widest">+ Register</Text>
                         </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

              </View>
            </View>

            {/* Bottom Footer Info */}
            <View className="px-6 py-4 border-t border-white/5 bg-black/40 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Shield color="rgba(34, 197, 94, 0.5)" size={12} />
                <Text className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">
                  SSL: Encrypted Tunnel Active
                </Text>
              </View>
              <Text className="text-gray-600 text-[10px] font-mono">
                RICORRENZA OS 2026
              </Text>
            </View>
          </BlurView>

          <View className="mt-8 text-center items-center">
            <Text className="text-gray-500 text-[10px] uppercase tracking-[0.4em] font-medium opacity-50">
               © 2026 RICORRENZA Fest Committee
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
