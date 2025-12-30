/**
 * Professional Sound Effects for QR Scanner
 * Uses Web Audio API for high-quality, consistent playback
 */

let audioContext: AudioContext | null = null;

// Initialize audio context (lazy loading)
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Play success sound - Pleasant dual-tone affirmation
 * Frequency: 800Hz + 1200Hz harmonics
 * Duration: 400ms
 */
export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create two oscillators for rich harmonic sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Connect oscillators to gain, then to output
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Configure frequencies - harmonious success tone
    osc1.frequency.setValueAtTime(800, now);
    osc2.frequency.setValueAtTime(1200, now);
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    // Volume envelope - quick attack, smooth release
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.02); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4); // Smooth decay
    
    // Play sound
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
    
    console.log('✅ Success sound played');
  } catch (err) {
    console.warn('Failed to play success sound:', err);
  }
};

/**
 * Play error sound - Alert tone with harsh descending frequency
 * Frequency: 400Hz descending to 200Hz
 * Duration: 500ms
 */
export const playErrorSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Harsh square wave for alert/error
    osc.type = 'square';
    
    // Descending frequency for "rejected" feeling
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    
    // Volume envelope - sharp attack, sustained, then quick release
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.setValueAtTime(0.3, now + 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    // Play sound
    osc.start(now);
    osc.stop(now + 0.5);
    
    console.log('❌ Error sound played');
  } catch (err) {
    console.warn('Failed to play error sound:', err);
  }
};

/**
 * Play warning sound - Cautionary oscillating beep
 * Frequency: 600Hz oscillating pattern
 * Duration: 600ms (two beeps)
 */
export const playWarningSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Triangle wave for softer warning tone
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    
    // Two-beep pattern with gap
    // Beep 1: 0-200ms
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gainNode.gain.setValueAtTime(0.25, now + 0.18);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
    
    // Gap: 200-300ms
    gainNode.gain.setValueAtTime(0, now + 0.3);
    
    // Beep 2: 300-500ms
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.32);
    gainNode.gain.setValueAtTime(0.25, now + 0.48);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    // Play sound
    osc.start(now);
    osc.stop(now + 0.6);
    
    console.log('⚠️ Warning sound played');
  } catch (err) {
    console.warn('Failed to play warning sound:', err);
  }
};

/**
 * Enhanced haptic feedback patterns
 */
export const triggerHapticFeedback = (type: 'success' | 'error' | 'warning') => {
  if (!navigator.vibrate) {
    console.log('Haptic feedback not supported');
    return;
  }
  
  switch (type) {
    case 'success':
      // Single strong pulse
      navigator.vibrate(500);
      console.log('✅ Success haptic triggered');
      break;
      
    case 'error':
      // Triple short bursts - urgent alert
      navigator.vibrate([100, 80, 100, 80, 100]);
      console.log('❌ Error haptic triggered');
      break;
      
    case 'warning':
      // Double medium pulses - caution
      navigator.vibrate([200, 150, 200]);
      console.log('⚠️ Warning haptic triggered');
      break;
  }
};

/**
 * Combined feedback - plays sound and triggers haptic together
 */
export const playFeedback = (type: 'success' | 'error' | 'warning') => {
  // Play sound
  switch (type) {
    case 'success':
      playSuccessSound();
      break;
    case 'error':
      playErrorSound();
      break;
    case 'warning':
      playWarningSound();
      break;
  }
  
  // Trigger haptic
  triggerHapticFeedback(type);
};
