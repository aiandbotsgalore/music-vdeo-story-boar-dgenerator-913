
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Scene } from '../types';
import AsyncImage from './AsyncImage';
import { useAudioUrl } from '../hooks/useAudioUrl';
import PlayIcon from './PlayIcon';
import PauseIcon from './PauseIcon';
import CloseIcon from './CloseIcon';
import Spinner from './Spinner';

interface CinematicPreviewProps {
  scenes: Scene[];
  audioId: string | null;
  onClose: () => void;
}

const parseTimestamp = (ts: string): number => {
    if (!ts) return -1;
    const match = ts.match(/\[(\d{2}):(\d{2})\.(\d{3})\]/);
    if (!match) return -1;
    const [, minutes, seconds, milliseconds] = match;
    return parseInt(minutes, 10) * 60 + parseInt(seconds, 10) + parseInt(milliseconds, 10) / 1000;
};

const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const floorSeconds = Math.floor(seconds);
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const CinematicPreview: React.FC<CinematicPreviewProps> = ({ scenes, audioId, onClose }) => {
  const audioUrl = useAudioUrl(audioId);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrubberRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const sceneTimestamps = useMemo(() => scenes.map(scene => parseTimestamp(scene.timestamp)), [scenes]);
  const activeScene = activeSceneIndex !== -1 ? scenes[activeSceneIndex] : null;
  const activeImageId = activeScene?.imageHistory?.[activeScene.imageHistory.length - 1]?.[0];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      let newActiveIndex = -1;
      for (let i = sceneTimestamps.length - 1; i >= 0; i--) {
        if (sceneTimestamps[i] !== -1 && time >= sceneTimestamps[i]) {
          newActiveIndex = i;
          break;
        }
      }
      setActiveSceneIndex(newActiveIndex);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
      setActiveSceneIndex(-1);
    }

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [sceneTimestamps]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-4" onClick={onClose}>
        <div className="w-full max-w-6xl max-h-full flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center text-white">
                <h2 className="text-2xl font-bold">Cinematic Preview</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex items-center justify-center bg-black rounded-lg overflow-hidden relative min-h-[60vh]">
                 {activeImageId ? (
                    <AsyncImage 
                        key={activeImageId}
                        imageId={activeImageId} 
                        alt={activeScene?.description || 'Scene image'} 
                        className="w-full h-full object-contain animate-fade-in"
                    />
                ) : (
                    <div className='text-gray-500'>
                        {activeScene ? "No image for this scene." : "Press play to start."}
                    </div>
                )}
            </div>
            
            {/* Info Panel */}
            <div className="bg-white/5 p-4 rounded-lg text-white min-h-[120px]">
                <p className="font-bold text-lg text-cyan-300">{activeScene?.timestamp || "---"}</p>
                <p className="text-sm italic text-purple-300 mb-2">{activeScene?.lyric ? `♪ ${activeScene.lyric} ♪` : ''}</p>
                <p className="text-sm text-gray-300">{activeScene?.description || '...'}</p>
            </div>

            {/* Player Controls */}
            {audioUrl ? (
                <div className="bg-white/5 p-3 rounded-lg flex items-center gap-4 text-white">
                    <audio ref={audioRef} src={audioUrl} preload="auto" />
                    <button onClick={handlePlayPause} className="p-2 rounded-full bg-cyan-600 hover:bg-cyan-500 transition-colors">
                        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                    </button>
                    <span className="text-sm font-mono">{formatTime(currentTime)}</span>
                    <input
                        ref={scrubberRef}
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleScrubberChange}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full"
                    />
                    <span className="text-sm font-mono">{formatTime(duration)}</span>
                </div>
            ) : (
                <div className="bg-gray-800 p-3 rounded-lg flex items-center justify-center gap-4 text-gray-400">
                    <Spinner className="w-5 h-5" />
                    <span>Loading Audio...</span>
                </div>
            )}
        </div>
        <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }`}</style>
    </div>
  );
};

export default CinematicPreview;
