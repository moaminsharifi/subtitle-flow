
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

  // Handle initial upload scenario within MediaDisplay
  if (currentStep === 'upload' && !mediaFile && !isReplacingMedia) {
    return (
      <Card className="shadow-lg animate-fade-in flex-grow">
        <CardContent className="p-4 h-full flex flex-col">
          <MediaUploader
            onMediaUpload={onMediaUpload}
            disabled={isGeneratingFullTranscription}
            className="flex flex-col flex-grow h-full"
          />
        </CardContent>
      </Card>
    );
  }
  
  // If no media file is present (and it's not the initial upload scenario handled above)
  if (!mediaFile) {
    return (
      <Card className="shadow-lg animate-fade-in flex-grow">
        <CardContent className="p-4 h-full flex flex-col items-center justify-center">
            <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-lg shadow-inner">
                <p className="text-muted-foreground">{t('mediaPlayer.uploadPrompt') as string}</p>
            </div>
        </CardContent>
      </Card>
    );
  }

  // Media file is present, render player and "change media" options
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
                  onMediaUpload={onMediaUpload} // This is the "replace" uploader
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
