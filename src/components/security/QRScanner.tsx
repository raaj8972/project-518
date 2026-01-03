import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { AlertCircle, Zap, Scan, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
}

const MIN_SCAN_AREA = 0.018; // QR must at least occupy 1.8% of the viewport to trigger

export function QRScanner({ onScanSuccess, onScanError, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const lastScanRef = useRef<string>(''); // Used for logic without re-renders
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Stable refs for callbacks to avoid effect re-runs
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onScanErrorRef.current = onScanError;
  }, [onScanSuccess, onScanError]);

  useEffect(() => {
    let isActive = true;

    const startCamera = async () => {
      try {
        console.log('🎥 Starting camera...');
        
        // DOM is ready in useEffect, no need to wait
        // await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!videoRef.current || !canvasRef.current) {
          throw new Error('Video/Canvas element not found');
        }

        // Get camera stream with ANDROID OPTIMIZED constraints
        // 720p is the sweet spot for Android performance/focus
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            // Force continuous focus for Android (vital for sharp scans)
            advanced: [{ focusMode: 'continuous' }] as any
          }
        } as MediaStreamConstraints;

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isActive) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            console.log('📹 Video metadata loaded');
            resolve();
          };
        });

        await video.play();
        console.log('▶️ Video playing');

        // Check for torch capability (Robust Method)
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        const settings = track.getSettings() as any;
        
        let torchDetected = false;

        // 1. Standard Capabilities/Settings Check
        if (capabilities.torch || settings.torch || ('fillLightMode' in capabilities)) {
          torchDetected = true;
        }

        // 2. ImageCapture Fallback (Android Chrome specific)
        // Many Androids hide the flash capability in the ImageCapture API
        if (!torchDetected && 'ImageCapture' in window) {
           try {
             const imageCapture = new (window as any).ImageCapture(track);
             // Wait for capabilities to be ready
             const photoCapabilities = await imageCapture.getPhotoCapabilities().catch(() => null);
             
             if (photoCapabilities && photoCapabilities.fillLightMode) {
                // Check if 'torch' or 'flash' is available
                if (photoCapabilities.fillLightMode.includes('torch') || photoCapabilities.fillLightMode.includes('flash')) {
                   console.log('🔦 Torch detected via ImageCapture API');
                   torchDetected = true;
                }
             }
           } catch (e) {
             console.warn('⚠️ ImageCapture detection failed (ignoring)', e);
           }
        }

        if (torchDetected) {
          console.log('🔦 Torch capability CONFIRMED');
          setHasTorch(true);
        } else {
             // FORCE ENABLE TORCH FOR MOBILE/ANDROID (Optimistic UI)
             // Many devices have a flash but hide it from the browser API.
             // We show the button anyway and handle failure gracefully.
             const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
             if (isMobile) {
                console.log('📱 Mobile device detected - forcing Torch button visible');
                setHasTorch(true);
             }
        }

        setCameraActive(true);
        setIsLoading(false);

        // Start scanning loop
        startScanning();

        // FORCE FOCUS (Android Fix)
        // Some devices ignore the initial 'advanced' constraint.
        // We re-apply it explicitly on the track now that the stream is active.
        const focusTrack = stream.getVideoTracks()[0];
        try {
           const capabilities = focusTrack.getCapabilities() as any;
           if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              console.log('🎯 Applying continuous focus (Post-Init)...');
              await focusTrack.applyConstraints({
                advanced: [{ focusMode: 'continuous' }]
              } as any);
           }
        } catch (focusErr) {
           console.warn('Focus enforcement failed', focusErr);
        }

      } catch (err: any) {
        console.error('❌ Camera error:', err);
        setIsLoading(false);
        
        let errorMsg = 'Failed to access camera';
        if (err.name === 'NotAllowedError') {
          errorMsg = 'Camera permission denied. Please allow camera access.';
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'Camera is in use by another application.';
        }
        
        setError(errorMsg);
        onScanError?.(errorMsg);
      }
    };

    const startScanning = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const scan = () => {
        if (!isActive || video.readyState !== video.HAVE_ENOUGH_DATA) {
          return;
        }

        // PERFORMANCE: Downscale processing canvas
        // We don't need 720p to read a QR code. 480px width is enough and 4x faster.
        const scale = 480 / video.videoWidth;
        const width = 480;
        const height = video.videoHeight * scale;

        canvas.width = width;
        canvas.height = height;

        if (canvas.width === 0 || canvas.height === 0) {
          return;
        }

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Scan for QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          // PROXIMITY DETECTION: Calculate area of the QR code
          // Area of polygon using surveyor's formula (simplified for quadrilaterals)
          const loc = code.location;
          const area = Math.abs(
            (loc.topLeftCorner.x * loc.topRightCorner.y - loc.topLeftCorner.y * loc.topRightCorner.x) +
            (loc.topRightCorner.x * loc.bottomRightCorner.y - loc.topRightCorner.y * loc.bottomRightCorner.x) +
            (loc.bottomRightCorner.x * loc.bottomLeftCorner.y - loc.bottomRightCorner.y * loc.bottomLeftCorner.x) +
            (loc.bottomLeftCorner.x * loc.topLeftCorner.y - loc.bottomLeftCorner.y * loc.topLeftCorner.x)
          ) / 2;

          const totalPixels = imageData.width * imageData.height;
          const relativeArea = area / totalPixels;

          // Only trigger if QR is at least X% of the frame (Proximity Check)
          // This prevents accidental scans of people further back in line.
          if (relativeArea > MIN_SCAN_AREA) {
            // Prevent duplicate scans for a short window
            if (code.data !== lastScanRef.current) {
              lastScanRef.current = code.data;
              onScanSuccessRef.current(code.data);
              
              // Clear after 3 seconds to allow rapid rescanning only after phone is moved
              setTimeout(() => {
                 lastScanRef.current = '';
              }, 3000);
            }
          }
        }

        // Loop handled by scanLoop now
      };

      // THROTTLE: Scan loop timestamp
      let lastScanTime = 0;
      const SCAN_INTERVAL = 60; // ~15 FPS (Max speed needed for QR)

      const scanLoop = (timestamp: number) => {
         if (timestamp - lastScanTime >= SCAN_INTERVAL) {
             scan();
             lastScanTime = timestamp;
         }
         animationRef.current = requestAnimationFrame(scanLoop);
      };

      // Start the scan loop
      animationRef.current = requestAnimationFrame(scanLoop);
      console.log('🔍 Scanner active - Optimized (480px / 15fps)');
    };

    startCamera();

    return () => {
      isActive = false;
      
      // Stop video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Cancel animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // EMPTY dependency array = Run once on mount, never restart!

  const toggleTorch = async () => {
    try {
      if (!streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      const newState = !isTorchOn;

      // Method 1: Standard Constraints (Modern Android/iOS)
      try {
        await track.applyConstraints({
          advanced: [{ torch: newState }]
        } as any);
        setIsTorchOn(newState);
        toast.success(newState ? 'Flashlight ON' : 'Flashlight OFF', { id: 'torch-status' });
        return; // Success!
      } catch (e) {
        console.warn('Standard torch toggle failed, trying fallback...', e);
      }

      // Method 2: ImageCapture API (Older/Stubborn Android Chrome)
      if ('ImageCapture' in window) {
         try {
           const imageCapture = new (window as any).ImageCapture(track);
           // Try 'torch' mode
           await imageCapture.setOptions({
             fillLightMode: newState ? 'torch' : 'off'
           });
           setIsTorchOn(newState);
           toast.success(newState ? 'Flashlight ON (Fallback)' : 'Flashlight OFF', { id: 'torch-status' });
           return;
         } catch (e2) {
            console.warn('ImageCapture torch mode failed, trying flash mode...', e2);
             // Method 3: 'flash' mode (Some devices call it flash, not torch)
             try {
               const imageCapture = new (window as any).ImageCapture(track);
               await imageCapture.setOptions({
                 fillLightMode: newState ? 'flash' : 'off'
               });
               setIsTorchOn(newState);
               toast.success(newState ? 'Flashlight ON (Alt)' : 'Flashlight OFF', { id: 'torch-status' });
               return;
             } catch (e3) {
                console.error('All torch methods failed', e3);
                throw e3;
             }
         }
      }

      throw new Error('Torch not supported');

    } catch (err) {
      console.error('Failed to toggle torch:', err);
      toast.error('Could not activate flashlight on this device');
    }
  };

  const handleTapFocus = async () => {
     if (!streamRef.current) return;
     const track = streamRef.current.getVideoTracks()[0];
     try {
       // Trigger a re-focus by toggling usage or mode if supported
       // Most Androids will re-focus if you just re-apply the continuous constraint
       await track.applyConstraints({
         advanced: [{ focusMode: 'continuous' }]
       } as any);
       
       // Visual feedback
       const box = document.getElementById('focus-box');
       if (box) {
         box.style.opacity = '1';
         box.style.transform = 'scale(1)';
         setTimeout(() => {
            box.style.opacity = '0';
            box.style.transform = 'scale(1.5)';
         }, 500);
       }
       console.log('🎯 Tap-to-focus triggered');
     } catch (e) {
       console.log('Manual focus not supported');
     }
  };

  return (
    <div className="w-full h-full flex flex-col" onClick={handleTapFocus}>
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Video Container */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          onClick={handleTapFocus}
        />
        
        {/* Tap to Focus Indicator */}
        <div 
          id="focus-box"
          className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-yellow-400/50 rounded-lg pointer-events-none transition-all duration-500 opacity-0 -translate-x-1/2 -translate-y-1/2 transform scale-150"
        />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-cyan-400 font-semibold">Initializing Camera...</p>
              <p className="text-gray-400 text-sm mt-2">Please allow camera access</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center p-6">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-400 font-semibold mb-2">Camera Error</p>
              <p className="text-gray-300 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Scanning Frame Overlay */}
        {cameraActive && !isLoading && !error && (
          <>
            {/* Header Floating HUD */}
            <div className="absolute top-0 inset-x-0 p-6 flex items-start justify-between z-30 bg-gradient-to-b from-black/60 to-transparent pt-safe-top">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-white font-black uppercase tracking-wider">Live System Active</span>
                </div>
                {/* Scan speed indicator */}
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20 w-max">
                  <Zap className="w-3 h-3 text-cyan-300 animate-pulse" />
                  <span className="text-[10px] text-cyan-100 font-bold uppercase tracking-wider">60 FPS</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 items-end">
                {onClose && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="p-4 bg-red-600/80 hover:bg-red-600 text-white rounded-2xl transition-all active:scale-90 shadow-2xl backdrop-blur-md border border-white/20 flex items-center gap-2 touch-manipulation"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                    aria-label="Exit Scanner"
                  >
                    <XCircle className="w-6 h-6" />
                    <span className="font-black uppercase tracking-tighter hidden sm:inline">Exit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Full screen scan indicator */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Animated scanning line that moves across entire screen */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-scan-line opacity-90 shadow-lg shadow-cyan-400/50"></div>
              
              {/* Center scanning frame - professional design */}
              <div className="absolute inset-12 md:inset-16 border-4 border-cyan-400/40 rounded-3xl">
                {/* Animated corner markers */}
                <div className="absolute -top-3 -left-3 w-20 h-20 border-t-[6px] border-l-[6px] border-cyan-300 rounded-tl-3xl animate-pulse-slow"></div>
                <div className="absolute -top-3 -right-3 w-20 h-20 border-t-[6px] border-r-[6px] border-cyan-300 rounded-tr-3xl animate-pulse-slow" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute -bottom-3 -left-3 w-20 h-20 border-b-[6px] border-l-[6px] border-cyan-300 rounded-bl-3xl animate-pulse-slow" style={{animationDelay: '0.4s'}}></div>
                <div className="absolute -bottom-3 -right-3 w-20 h-20 border-b-[6px] border-r-[6px] border-cyan-300 rounded-br-3xl animate-pulse-slow" style={{animationDelay: '0.6s'}}></div>
                
                {/* Center scan icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-16 h-16 rounded-full bg-cyan-400/10 backdrop-blur-sm border-2 border-cyan-400/50 flex items-center justify-center animate-ping-slow">
                    <Scan className="w-8 h-8 text-cyan-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Camera Active Indicator Removed - replaced by HUD */}

            {/* Torch Toggle - Night Vision */}
            {hasTorch && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTorch();
                }}
                className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-8 py-4 rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)] border touch-manipulation active:scale-95 ${
                  isTorchOn
                    ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_50px_rgba(251,191,36,0.4)]'
                    : 'bg-black/60 text-white border-white/20 hover:bg-black/80 backdrop-blur-md'
                }`}
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                <Zap className={`w-6 h-6 ${isTorchOn ? 'fill-current' : 'text-yellow-400'}`} />
                {isTorchOn ? 'Flashlight ON' : 'Night Vision'}
              </button>
            )}
            {/* Instructions Overlay */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-xs text-center pointer-events-none z-20">
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-2xl">
                <p className="text-white font-black text-xl tracking-tight">Align QR Code</p>
                <div className="flex items-center justify-center gap-2 mt-1 opacity-60">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <p className="text-white text-[10px] uppercase font-bold tracking-widest">Automatic Detection</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.4;
          }
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
        }
        
        .animate-scan-line {
          animation: scan-line 2.5s linear infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        .animate-ping-slow {
          animation: ping-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
