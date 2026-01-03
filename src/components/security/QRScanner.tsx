import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, AlertCircle, Zap, Scan } from 'lucide-react';
import toast from 'react-hot-toast';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [lastScan, setLastScan] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  useEffect(() => {
    let isActive = true;

    const startCamera = async () => {
      try {
        console.log('🎥 Starting camera...');
        
        // Wait for DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!videoRef.current || !canvasRef.current) {
          throw new Error('Video/Canvas element not found');
        }

        // Get camera stream with high quality
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          }
        });

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

        // Check for torch capability
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          setHasTorch(true);
        }

        setCameraActive(true);
        setIsLoading(false);

        // Start scanning loop
        startScanning();

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
          animationRef.current = requestAnimationFrame(scan);
          return;
        }

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (canvas.width === 0 || canvas.height === 0) {
          animationRef.current = requestAnimationFrame(scan);
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
          // Prevent duplicate scans
          if (code.data !== lastScan) {
            console.log('✅ QR CODE DETECTED:', code.data);
            setLastScan(code.data);
            onScanSuccess(code.data);
            
            // Clear after 2 seconds to allow rescanning
            setTimeout(() => setLastScan(''), 2000);
          }
        }

        // Continue scanning
        animationRef.current = requestAnimationFrame(scan);
      };

      // Start the scan loop
      scan();
      console.log('🔍 Scanner active - scanning at 60fps');
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
  }, [onScanSuccess, onScanError, lastScan]);

  const toggleTorch = async () => {
    try {
      if (!streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      const newState = !isTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: newState }]
      } as any);
      setIsTorchOn(newState);
      toast.success(newState ? 'Flashlight ON' : 'Flashlight OFF', {
        id: 'torch-status',
        duration: 2000
      });
    } catch (err) {
      console.error('Failed to toggle torch:', err);
      toast.error('Torch not supported on this device');
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
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

            {/* Camera Active Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-500/30 backdrop-blur-md rounded-full px-4 py-2.5 border-2 border-green-400/60 shadow-lg">
              <div className="w-2.5 h-2.5 bg-green-300 rounded-full animate-pulse"></div>
              <Camera className="w-5 h-5 text-green-300" />
              <span className="text-xs text-green-100 font-bold uppercase tracking-wider">Recording</span>
            </div>

            {/* Scan speed indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-cyan-500/30 backdrop-blur-md rounded-full px-4 py-2.5 border-2 border-cyan-400/60 shadow-lg">
              <Zap className="w-5 h-5 text-cyan-300 animate-pulse" />
              <span className="text-xs text-cyan-100 font-bold uppercase tracking-wider">60 FPS</span>
            </div>

            {/* Torch Toggle - Night Vision */}
            {hasTorch && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTorch();
                }}
                className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-wider transition-all transform active:scale-95 shadow-2xl z-30 ${
                  isTorchOn 
                    ? 'bg-yellow-400 text-black border-b-4 border-yellow-600' 
                    : 'bg-gray-800/80 text-white border-b-4 border-gray-900 backdrop-blur-md'
                }`}
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
