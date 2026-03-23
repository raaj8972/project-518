import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw, RefreshCw, Maximize } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number; // Default 5:6 for event posters (49:59.4 cm)
  cropShape?: 'rect' | 'round';
  showRatioSelection?: boolean;
  theme?: 'purple' | 'red';
}

const getRadianAngle = (degreeValue: number) => {
  return (degreeValue * Math.PI) / 180;
};

const rotateSize = (width: number, height: number, rotation: number) => {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

export const ImageCropper: React.FC<ImageCropperProps> = ({
  image,
  onCropComplete,
  onCancel,
  aspectRatio: initialAspectRatio = 5 / 6,
  cropShape = 'rect',
  showRatioSelection = true,
  theme = 'purple'
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(initialAspectRatio);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (location: Point) => setCrop(location);
  const onZoomChange = (zoom: number) => setZoom(zoom);
  const onRotationChange = (rotation: number) => setRotation(rotation);

  const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleRotate90 = (direction: 'cw' | 'ccw') => {
    setRotation((prev) => prev + (direction === 'cw' ? 90 : -90));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (error) => reject(error));
      // needed to avoid cross-origin issues on CodeSandbox
      img.setAttribute('crossOrigin', 'anonymous');
      img.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation: number = 0
  ): Promise<Blob> => {
    const imageElement = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    const rotRad = getRadianAngle(rotation);

    // Calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      imageElement.width,
      imageElement.height,
      rotation
    );

    // Set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-imageElement.width / 2, -imageElement.height / 2);

    // Draw rotated image
    ctx.drawImage(imageElement, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');

    if (!croppedCtx) throw new Error('No 2d context');

    // Set the size of the cropped canvas
    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    // Draw the cropped image onto the new canvas
    croppedCtx.drawImage(
      canvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      croppedCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels, rotation);
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error('Crop error:', error);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const ASPECT_RATIOS = [
    { label: 'Free', value: undefined, icon: Maximize, sub: 'Natural' },
    { label: 'Square', value: 1 / 1, sub: '1:1' },
    { label: 'Faculty', value: 3 / 4, sub: '3:4' },
    { label: 'Event', value: 5 / 6, sub: '5:6' },
    { label: 'Story', value: 9 / 16, sub: '9:16' },
    { label: 'Banner', value: 16 / 9, sub: '16:9' },
  ];

  const isRed = theme === 'red';
  const ratioActiveClasses = isRed 
    ? 'bg-red-600/10 border-red-500 text-red-600 dark:text-red-400 shadow-sm' 
    : 'bg-purple-600/10 border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm';
  const accentText = isRed ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400';
  const accentBadge = isRed ? 'bg-red-50 dark:bg-red-900/30' : 'bg-purple-50 dark:bg-purple-900/30';
  const rangeAccent = isRed ? 'accent-red-600' : 'accent-purple-600';
  const primaryBtn = isRed 
    ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:shadow-red-500/25'
    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-purple-500/25';

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col lg:flex-row items-center justify-center lg:p-8 animate-in fade-in duration-200">
      
      {/* Mobile Header (Only visible on small screens) */}
      <div className="w-full h-14 bg-zinc-900 border-b border-white/10 flex items-center justify-between px-4 lg:hidden">
        <h3 className="text-white font-medium">Crop Image</h3>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="bg-zinc-900 lg:bg-white/10 lg:backdrop-blur-xl lg:border lg:border-white/20 lg:rounded-2xl w-full h-[calc(100vh-3.5rem)] lg:h-auto lg:max-w-6xl lg:max-h-[90vh] flex flex-col lg:flex-row overflow-hidden lg:shadow-2xl">
        
        {/* Left/Top Area: Cropper */}
        <div className="relative flex-1 min-h-[40vh] bg-black/60 lg:bg-black/40">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
            onCropComplete={onCropAreaChange}
            cropShape={cropShape}
            showGrid={true}
          />
          
          {/* Desktop Close Button */}
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="hidden lg:block absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Right/Bottom Area: Controls */}
        <div className="w-full lg:w-80 bg-white dark:bg-zinc-900 px-4 py-5 lg:p-6 flex flex-col gap-5 lg:gap-8 overflow-y-auto h-[50vh] lg:h-auto lg:max-h-full rounded-t-2xl lg:rounded-none lg:rounded-r-2xl pb-safe">
          <div className="hidden lg:block">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">Adjust Image</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Position, rotate, and crop</p>
          </div>

          {/* Aspect Ratio */}
          {showRatioSelection && (
            <div className="space-y-2 lg:space-y-3">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Ratio
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.label}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`py-3 px-3 rounded-xl text-left transition-all border ${
                      aspectRatio === ratio.value
                        ? ratioActiveClasses
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-tight">{ratio.label}</span>
                      {ratio.icon && <ratio.icon size={12} />}
                    </div>
                    <div className="text-[10px] opacity-60 font-medium">{ratio.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zoom */}
          <div className="space-y-2 lg:space-y-3">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Zoom
            </label>
            <div className="flex items-center gap-3 lg:gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-2 lg:p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <ZoomOut className="text-zinc-400" size={16} />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                disabled={isProcessing}
                className={`flex-1 ${rangeAccent} h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer`}
              />
              <ZoomIn className="text-zinc-400" size={16} />
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2 lg:space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Rotation
              </label>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${accentText} ${accentBadge}`}>
                {rotation}°
              </span>
            </div>
            
            <div className="flex items-center gap-3 lg:gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-2 lg:p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <RotateCcw 
                className="text-zinc-400 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors" 
                size={16} 
                onClick={() => handleRotate90('ccw')}
              />
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={Math.round(rotation)}
                onChange={(e) => setRotation(parseFloat(e.target.value))}
                disabled={isProcessing}
                className={`flex-1 ${rangeAccent} h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer`}
              />
              <RotateCw 
                className="text-zinc-400 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors" 
                size={16} 
                onClick={() => handleRotate90('cw')}
              />
            </div>
          </div>

          <div className="mt-auto space-y-3 pt-6 lg:pt-0 pb-4 lg:pb-0">
            <button
              onClick={handleReset}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <RefreshCw size={14} /> Reset all adjustments
            </button>
            <div className="flex gap-2 lg:gap-3">
              <button
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 font-medium transition-colors hidden lg:block"
              >
                Cancel
              </button>
              <button
                onClick={handleCrop}
                disabled={isProcessing}
                className={`flex-[2] px-4 py-3 text-white rounded-xl hover:shadow-lg disabled:opacity-75 font-semibold transition-all transform active:scale-95 ${primaryBtn}`}
              >
                {isProcessing ? 'Processing...' : 'Apply & Save'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
