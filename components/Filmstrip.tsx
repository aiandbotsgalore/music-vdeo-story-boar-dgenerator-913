
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Scene } from '../types';
import AsyncImage from './AsyncImage';
import { useAudioUrl } from '../hooks/useAudioUrl';
import PlayIcon from './PlayIcon';
import PauseIcon from './PauseIcon';

interface FilmstripProps {
  scenes: Scene[];
  onFrameClick: (index: number) => void;
  audioId: string | null;
}

const parseTimestamp = (ts: string): number => {
    const match = ts.match(/\[(\d{2}):(\d{2})\.(\d{3})\]/);
    if (!match) return -1;
    const [, minutes, seconds, milliseconds] = match;
    return parseInt(minutes, 10) * 60 + parseInt(seconds, 10) + parseInt(milliseconds, 10) / 1000;
};

const Filmstrip: React.FC<FilmstripProps> = ({ scenes, onFrameClick, audioId }) => {
  const hasImages = scenes.some(s => s.imageHistory && s.imageHistory.length > 0);
  const audioUrl = useAudioUrl(audioId);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(-1);

  const sceneTimestamps = useMemo(() => scenes.map(scene => parseTimestamp(scene.timestamp)), [scenes]);

  useEffect(() => {
    frameRefs.current = frameRefs.current.slice(0, scenes.length);
  }, [scenes]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
        setIsPlaying(false);
        setActiveSceneIndex(-1);
    };

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      let newActiveIndex = -1;
      for (let i = sceneTimestamps.length - 1; i >= 0; i--) {
        if (sceneTimestamps[i] !== -1 && currentTime >= sceneTimestamps[i]) {
          newActiveIndex = i;
          break;
        }
      }

      setActiveSceneIndex(prevIndex => {
        if (newActiveIndex !== -1 && newActiveIndex !== prevIndex) {
          const frameEl = frameRefs.current[newActiveIndex];
          frameEl?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }
        return newActiveIndex;
      });
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [sceneTimestamps]);

  if (!hasImages) {
    return null;
  }

  return (
    <section className="w-full mt-12 sticky bottom-0 z-10">
      <div className="flex justify-center items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold text-center">Cinematic Filmstrip</h2>
        {audioUrl && (
            <>
                <audio ref={audioRef} src={audioUrl} preload="auto" />
                <button onClick={togglePlay} className="p-2 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
                    {isPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                </button>
            </>
        )}
      </div>
      <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700">
        <div ref={scrollContainerRef} className="flex overflow-x-auto space-x-4 pb-4">
          {scenes.map((scene, index) => {
            const latestImages = scene.imageHistory?.[scene.imageHistory.length - 1];
            const imageId = latestImages?.[0];

            return (
              <div
                key={index}
// FIX: The ref callback was implicitly returning a value, which is not allowed. Wrapping the assignment in curly braces `{}` fixes this by ensuring the function returns void.
                ref={el => { frameRefs.current[index] = el; }}
                onClick={() => onFrameClick(index)}
                className={`group flex-shrink-0 w-48 h-32 bg-black cursor-pointer relative transition-all duration-300 ${activeSceneIndex === index ? 'ring-2 ring-cyan-400 scale-105' : 'ring-0'}`}
                title={`Jump to scene: ${scene.timestamp}`}
              >
                {/* Sprocket holes top and bottom */}
                <div className="absolute top-0 left-2 right-2 h-2 flex justify-between">
                  {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-1 bg-gray-500 rounded-sm"></div>)}
                </div>
                <div className="absolute bottom-0 left-2 right-2 h-2 flex justify-between">
                   {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-1 bg-gray-500 rounded-sm"></div>)}
                </div>

                <div className="w-full h-full flex items-center justify-center p-3">
                   {imageId ? (
                      <AsyncImage
                        imageId={imageId}
                        alt={`Scene ${scene.timestamp}`}
                        className="w-full h-full object-cover rounded-sm transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 rounded-sm flex items-center justify-center">
                         <span className="text-gray-600 text-xs">No Image</span>
                      </div>
                    )}
                </div>

                 <div className="absolute bottom-3 left-3 right-3 bg-black/50 text-white text-xs text-center p-0.5 rounded-b-sm">
                  {scene.timestamp}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Filmstrip;
