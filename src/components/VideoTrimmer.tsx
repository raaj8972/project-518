import React, { useState, useRef, useEffect } from 'react';
import { X, Scissors, Play, Pause } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface VideoTrimmerProps {
  videoFile: File;
  onTrimComplete: (trimmedFile: File) => void;
  onCancel: () => void;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({
  videoFile,
  onTrimComplete,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegError, setFfmpegError] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      
      // Set a timeout - if loading takes more than 30 seconds, show error
      const timeoutId = setTimeout(() => {
        if (!ffmpegLoaded) {
          setFfmpegError('Loading is taking too long. You can skip trimming and upload the video as-is, or refresh and try again.');
        }
      }, 30000); // 30 seconds
      
      try {
        setLoadingProgress(10);
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        
        setLoadingProgress(30);
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        
        setLoadingProgress(60);
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        
        setLoadingProgress(80);
        await ffmpeg.load({
          coreURL,
          wasmURL,
        });
        
        setLoadingProgress(100);
        setFfmpegLoaded(true);
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        setFfmpegError('Failed to load video processor. You can skip trimming and upload the video as-is.');
        clearTimeout(timeoutId);
      }
    };
    loadFFmpeg();
  }, []);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setEndTime(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTrim = async () => {
    if (!ffmpegLoaded) {
      alert('Video processing library is still loading. Please wait...');
      return;
    }

    if (startTime >= endTime) {
      alert('Start time must be before end time');
      return;
    }

    setIsTrimming(true);
    setTrimProgress(0);

    try {
      const ffmpeg = ffmpegRef.current;
      
      // Write input file
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      
      // Set up progress tracking
      ffmpeg.on('progress', ({ progress }) => {
        setTrimProgress(Math.round(progress * 100));
      });

      // Trim video
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', startTime.toString(),
        '-to', endTime.toString(),
        '-c', 'copy',
        'output.mp4'
      ]);

      // Read output file
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: 'video/mp4' });
      const trimmedFile = new File([blob], `trimmed_${videoFile.name}`, { type: 'video/mp4' });

      onTrimComplete(trimmedFile);
    } catch (error) {
      console.error('Trim error:', error);
      alert('Failed to trim video. Please try again.');
    } finally {
      setIsTrimming(false);
      setTrimProgress(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartChange = (value: number) => {
    setStartTime(Math.min(value, endTime - 1));
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  const handleEndChange = (value: number) => {
    setEndTime(Math.max(value, startTime + 1));
  };

  const trimDuration = endTime - startTime;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Trim Video</h3>
            <button
              onClick={onCancel}
              disabled={isTrimming}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>

          {/* Loading Progress */}
          {!ffmpegLoaded && !ffmpegError && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 font-medium mb-2">Loading video processor... {loadingProgress}%</p>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-blue-600 text-xs mt-2">First-time setup: downloading ~30MB library</p>
            </div>
          )}

          {/* Error Message */}
          {ffmpegError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium mb-3">{ffmpegError}</p>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Skip Trimming & Close
              </button>
            </div>
          )}

          {/* Video Preview */}
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          {/* Play Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePlayPause}
              disabled={isTrimming}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <span className="text-sm text-gray-600">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <div className="relative h-2 bg-gray-200 rounded">
              {/* Selected range */}
              <div
                className="absolute h-full bg-blue-500 rounded"
                style={{
                  left: `${(startTime / duration) * 100}%`,
                  width: `${((endTime - startTime) / duration) * 100}%`
                }}
              />
              {/* Current time marker */}
              <div
                className="absolute top-0 w-0.5 h-full bg-red-500"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            {/* Start Time Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time: {formatTime(startTime)}
              </label>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={startTime}
                onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                disabled={isTrimming}
                className="w-full"
              />
            </div>

            {/* End Time Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time: {formatTime(endTime)}
              </label>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={endTime}
                onChange={(e) => handleEndChange(parseFloat(e.target.value))}
                disabled={isTrimming}
                className="w-full"
              />
            </div>
          </div>

          {/* Duration Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Original Duration:</span>
                <span className="ml-2 font-semibold">{formatTime(duration)}</span>
              </div>
              <div>
                <span className="text-gray-600">Trimmed Duration:</span>
                <span className="ml-2 font-semibold">{formatTime(trimDuration)}</span>
              </div>
            </div>
          </div>

          {/* Progress */}
          {isTrimming && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${trimProgress}%` }}
                />
              </div>
              <p className="text-sm text-center text-gray-600">
                Processing video... {trimProgress}%
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isTrimming}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleTrim}
              disabled={isTrimming || !ffmpegLoaded}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Scissors size={16} />
              {isTrimming ? 'Trimming...' : ffmpegLoaded ? 'Trim Video' : 'Loading...'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
