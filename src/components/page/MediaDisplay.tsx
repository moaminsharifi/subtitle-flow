
"use client";

import type React from 'react';
import type { MediaFile, SubtitleEntry, LogEntry } from '@/lib/types';
import { MediaPlayer } from '@/components/media-player';
import { MediaUploader } from '@/components/media-uploader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaDisplayProps {
  mediaFile: MediaFile | null;
  activeSubtitlesToDisplay: SubtitleEntry[];
  onTimeUpdate: (time: number) => void;
  onShiftTime: (offset: number) => void;
  playerRef: React.RefObject<HTMLVideoElement | HTMLAudioElement>;
  currentStep: 'upload' | 'edit' | 'export';
  isReplacingMedia: boolean;
  setIsReplacingMedia: (isReplacing: boolean) => void;
  onMediaUpload: (file: File, url: string, type: 'audio' | 'video', duration: number) => void;
  isGeneratingFullTranscription: boolean;
  addLog: (message: string, type?: LogEntry['type']) => void;
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode;
  dir: 'ltr' | 'rtl';
}

export function MediaDisplay({
  mediaFile,
  activeSubtitlesToDisplay,
  onTimeUpdate,
  onShiftTime,
  playerRef,
  currentStep,
  isReplacingMedia,
  setIsReplacingMedia,
  onMediaUpload,
  isGeneratingFullTranscription,
  addLog,
  t,
  dir,
}: MediaDisplayProps) {
  if (!mediaFile) {
    // This case is handled by the MediaUploader being rendered directly in page.tsx when mediaFile is null
    return null; 
  }

  return (
    <Card className={cn(
      "shadow-lg animate-fade-in",
      (currentStep === 'upload' || currentStep === 'edit') ? "sticky top-6 flex-grow" : "flex-grow"
    )}>
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex-grow">
          <MediaPlayer
            mediaFile={mediaFile}
            activeSubtitlesToDisplay={currentStep === 'edit' ? activeSubtitlesToDisplay : []}
            onTimeUpdate={onTimeUpdate}
            onShiftTime={onShiftTime}
            playerRef={playerRef}
          />
        </div>
        {currentStep === 'upload' && (
          <div className="mt-4 pt-4 border-t">
            {!isReplacingMedia ? (
              <Button
                variant="outline"
                onClick={() => {
                  setIsReplacingMedia(true);
                  addLog("Media replacement uploader shown.", "debug");
                }}
                className="w-full"
                aria-label={t('mediaPlayer.changeMediaButton') as string}
                disabled={isGeneratingFullTranscription}
              >
                <Pencil className={cn("h-4 w-4", dir === 'rtl' ? 'ms-2' : 'me-2')} /> {t('mediaPlayer.changeMediaButton') as string}
              </Button>
            ) : (
              <div className="w-full space-y-2">
                <MediaUploader
                  onMediaUpload={onMediaUpload}
                  disabled={isGeneratingFullTranscription}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReplacingMedia(false);
                    addLog("Media replacement uploader hidden.", "debug");
                  }}
                  className="w-full"
                >
                  {t('mediaPlayer.cancelChangeMediaButton') as string}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
