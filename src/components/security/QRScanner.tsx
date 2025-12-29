import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, AlertCircle, CheckCircle, Zap } from 'lucide-react';

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
        if (!isActive || !video.readyState === video.HAVE_ENOUGH_DATA) {
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
            
            // Vibrate if available
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
            
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

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Video Container */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-cyan-500/30 bg-black">
        <video
          ref={videoRef}
          className="w-full h-auto block"
          style={{ 
            minHeight: '300px',
            maxHeight: '500px',
            objectFit: 'cover'
          }}
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
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan-line opacity-75"></div>
              
              {/* Corner markers - larger area */}
              <div className="absolute inset-8 border-4 border-cyan-500/30 rounded-2xl">
                <div className="absolute -top-2 -left-2 w-16 h-16 border-t-4 border-l-4 border-cyan-400 rounded-tl-2xl"></div>
                <div className="absolute -top-2 -right-2 w-16 h-16 border-t-4 border-r-4 border-cyan-400 rounded-tr-2xl"></div>
                <div className="absolute -bottom-2 -left-2 w-16 h-16 border-b-4 border-l-4 border-cyan-400 rounded-bl-2xl"></div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 border-b-4 border-r-4 border-cyan-400 rounded-br-2xl"></div>
              </div>
            </div>

            {/* Camera Active Indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-green-500/20 backdrop-blur-sm rounded-full px-3 py-2 border border-green-500/50">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <Camera className="w-4 h-4 text-green-400" />
            </div>

            {/* Scan speed indicator */}
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-cyan-500/20 backdrop-blur-sm rounded-full px-3 py-2 border border-cyan-500/50">
              <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs text-cyan-400 font-semibold">LIVE</span>
            </div>
          </>
        )}
      </div>

      {/* Camera Status Badge */}
      {cameraActive && !isLoading && !error && (
        <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg py-2 px-4 animate-pulse">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-semibold">🔍 Scanning Active - Point at QR Code</span>
        </div>
      )}

      {/* Instructions */}
      {cameraActive && !isLoading && !error && (
        <div className="text-center space-y-1">
          <p className="text-cyan-400 font-semibold">
            Hold QR Code in View
          </p>
          <p className="text-gray-400 text-sm">
            Scanner works from any distance • Auto-detects instantly
          </p>
        </div>
      )}

      <style>{`
        @keyframes scan-line {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
