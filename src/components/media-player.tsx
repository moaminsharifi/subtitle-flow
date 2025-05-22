"use client";

import type React from 'react';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, Rewind, FastForward, Settings2 } from 'lucide-react';
import type { SubtitleEntry, MediaFile } from '@/lib/types';
import { formatSecondsToTime } from '@/lib/subtitle-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface MediaPlayerProps {
  mediaFile: MediaFile | null;
  subtitles: SubtitleEntry[];
  onTimeUpdate: (time: number) => void;
  onShiftTime: (offset: number) => void; // For global subtitle shift
  playerRef: React.RefObject<HTMLVideoElement | HTMLAudioElement>;
}

export function MediaPlayer({ mediaFile, subtitles, onTimeUpdate, onShiftTime, playerRef }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const internalPlayerRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const activePlayerRef = playerRef || internalPlayerRef;


  useEffect(() => {
    const player = activePlayerRef.current;
    if (player) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleTimeUpdate = () => {
        setCurrentTime(player.currentTime);
        onTimeUpdate(player.currentTime);
      };
      const handleLoadedMetadata = () => setDuration(player.duration);
      const handleVolumeChange = () => {
        setVolume(player.volume);
        setIsMuted(player.muted);
      };

      player.addEventListener('play', handlePlay);
      player.addEventListener('pause', handlePause);
      player.addEventListener('timeupdate', handleTimeUpdate);
      player.addEventListener('loadedmetadata', handleLoadedMetadata);
      player.addEventListener('volumechange', handleVolumeChange);

      // Initial sync
      if (mediaFile) {
         player.src = mediaFile.url; // Ensure src is set if mediaFile changes
         setDuration(mediaFile.duration); // Set initial duration
      }
      setCurrentTime(player.currentTime);
      setVolume(player.volume);
      setIsMuted(player.muted);

      return () => {
        player.removeEventListener('play', handlePlay);
        player.removeEventListener('pause', handlePause);
        player.removeEventListener('timeupdate', handleTimeUpdate);
        player.removeEventListener('loadedmetadata', handleLoadedMetadata);
        player.removeEventListener('volumechange', handleVolumeChange);
      };
    }
  }, [mediaFile, activePlayerRef, onTimeUpdate]);

  const togglePlayPause = () => {
    const player = activePlayerRef.current;
    if (player) {
      if (player.paused || player.ended) {
        player.play().catch(err => console.error("Error playing media:", err));
      } else {
        player.pause();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    const player = activePlayerRef.current;
    if (player) {
      player.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    const player = activePlayerRef.current;
    if (player) {
      player.muted = false;
      setIsMuted(false);
      player.volume = value[0];
      setVolume(value[0]);
    }
  };

  const toggleMute = () => {
    const player = activePlayerRef.current;
    if (player) {
      player.muted = !player.muted;
      setIsMuted(player.muted);
    }
  };

  const handleSkip = (amount: number) => {
    const player = activePlayerRef.current;
    if (player) {
      player.currentTime = Math.max(0, Math.min(duration, player.currentTime + amount));
    }
  };

  const activeSubtitles = subtitles.filter(
    (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
  );

  if (!mediaFile) {
    return (
      <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-lg shadow-inner">
        <p className="text-muted-foreground">Upload media to start</p>
      </div>
    );
  }
  
  return (
    <div className="w-full space-y-3">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-xl">
        {mediaFile.type === 'video' ? (
          <video ref={activePlayerRef} className="w-full h-full" src={mediaFile.url} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-background p-4">
            <audio ref={activePlayerRef} src={mediaFile.url} className="w-full"/>
            <UploadCloud className="w-24 h-24 mb-4 opacity-50" />
            <p className="text-lg font-medium">{mediaFile.name}</p>
            <p className="text-sm opacity-80">Audio playback</p>
          </div>
        )}
        {activeSubtitles.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10/12 p-2 bg-black/70 text-white text-center rounded-md text-sm md:text-base lg:text-lg">
            {activeSubtitles.map(sub => sub.text).join('\n')}
          </div>
        )}
      </div>

      <div className="space-y-2 px-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatSecondsToTime(currentTime, 'vtt')}</span>
          <span>{formatSecondsToTime(duration, 'vtt')}</span>
        </div>
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSeek}
          aria-label="Media progress"
        />
      </div>

      <div className="flex items-center justify-between gap-2 p-2 bg-card rounded-lg shadow-md">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleSkip(-5)} aria-label="Rewind 5 seconds">
            <Rewind />
          </Button>
          <Button variant="ghost" size="icon" onClick={togglePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause /> : <Play />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleSkip(5)} aria-label="Fast forward 5 seconds">
            <FastForward />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
            {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </Button>
          <Slider 
            value={[volume]} 
            max={1} 
            step={0.05} 
            onValueChange={handleVolumeChange} 
            className="w-24"
            aria-label="Volume"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Subtitle settings">
              <Settings2 />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 space-y-2">
            <Label className="text-sm font-medium">Subtitle Timing Shift</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onShiftTime(-0.1)} className="flex-1">-0.1s</Button>
              <Button variant="outline" size="sm" onClick={() => onShiftTime(0.1)} className="flex-1">+0.1s</Button>
            </div>
             <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onShiftTime(-0.5)} className="flex-1">-0.5s</Button>
              <Button variant="outline" size="sm" onClick={() => onShiftTime(0.5)} className="flex-1">+0.5s</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
