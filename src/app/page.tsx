"use client";

import { useState, useRef, useCallback } from 'react';
import type { MediaFile, SubtitleEntry, SubtitleFormat } from '@/lib/types';
import { MediaUploader } from '@/components/media-uploader';
import { SubtitleUploader } from '@/components/subtitle-uploader';
import { MediaPlayer } from '@/components/media-player';
import { SubtitleEditor } from '@/components/subtitle-editor';
import { SubtitleExporter } from '@/components/subtitle-exporter';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button'; // For potential future use, e.g. reset
import { useToast } from '@/hooks/use-toast';
import { suggestSubtitleTimings } from '@/ai/flows/suggest-subtitle-timings';
import { fileToDataUri } from '@/lib/subtitle-utils';

export default function SubtitleSyncPage() {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [originalSubtitleFileName, setOriginalSubtitleFileName] = useState<string | null>(null);
  const [originalSubtitleFormat, setOriginalSubtitleFormat] = useState<SubtitleFormat | null>(null);
  const [currentPlayerTime, setCurrentPlayerTime] = useState(0);
  const [isLoadingAIForId, setIsLoadingAIForId] = useState<string | null>(null);

  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleMediaUpload = (file: File, url: string, type: 'audio' | 'video', duration: number) => {
    setMediaFile({ name: file.name, type, url, duration, rawFile: file });
    // Reset subtitles when new media is uploaded
    setSubtitles([]);
    setOriginalSubtitleFileName(null);
    setOriginalSubtitleFormat(null);
    setCurrentPlayerTime(0); // Reset player time visually
    if (playerRef.current) { // Reset actual player state
      playerRef.current.currentTime = 0;
      playerRef.current.pause();
    }
    toast({ title: "Media Loaded", description: `${file.name} is ready.` });
  };

  const handleSubtitleUpload = (entries: SubtitleEntry[], fileName: string, format: SubtitleFormat) => {
    setSubtitles(entries);
    setOriginalSubtitleFileName(fileName);
    setOriginalSubtitleFormat(format);
  };

  const handleSubtitleChange = (index: number, newEntry: SubtitleEntry) => {
    const updatedSubtitles = [...subtitles];
    updatedSubtitles[index] = newEntry;
    setSubtitles(updatedSubtitles);
  };

  const handleSubtitleAdd = () => {
    const newId = `new-${Date.now()}`;
    let newStartTime = 0;
    if (subtitles.length > 0) {
      newStartTime = subtitles[subtitles.length - 1].endTime + 0.1;
    } else if (mediaFile) {
      newStartTime = Math.min(currentPlayerTime, mediaFile.duration -1) ; // Start near current time or beginning
    }
    
    const newEndTime = newStartTime + 2; // Default 2s duration

    setSubtitles([
      ...subtitles,
      { id: newId, startTime: parseFloat(newStartTime.toFixed(3)), endTime: parseFloat(newEndTime.toFixed(3)), text: 'New subtitle' },
    ]);
  };

  const handleSubtitleDelete = (index: number) => {
    setSubtitles(subtitles.filter((_, i) => i !== index));
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentPlayerTime(time);
  }, []);

  const handleShiftTime = (offset: number) => {
    if (subtitles.length === 0) return;
    const newSubtitles = subtitles.map(sub => ({
      ...sub,
      startTime: Math.max(0, parseFloat((sub.startTime + offset).toFixed(3))),
      endTime: Math.max(0, parseFloat((sub.endTime + offset).toFixed(3))),
    }));
    setSubtitles(newSubtitles);
    toast({ title: "Subtitles Shifted", description: `All subtitles shifted by ${offset.toFixed(1)}s.` });
  };

  const handleAIAssist = async (subtitleId: string) => {
    if (!mediaFile) {
      toast({ title: "AI Error", description: "Please upload media first.", variant: "destructive" });
      return;
    }
    const subtitleEntry = subtitles.find(sub => sub.id === subtitleId);
    if (!subtitleEntry) {
      toast({ title: "AI Error", description: "Subtitle entry not found.", variant: "destructive" });
      return;
    }

    setIsLoadingAIForId(subtitleId);
    try {
      const audioDataUri = await fileToDataUri(mediaFile.rawFile);
      const result = await suggestSubtitleTimings({
        audioDataUri,
        subtitleText: subtitleEntry.text,
      });

      if (result.suggestedStartTime !== undefined && result.suggestedEndTime !== undefined) {
         const index = subtitles.findIndex(s => s.id === subtitleId);
         if (index !== -1) {
            const updatedSubtitles = [...subtitles];
            updatedSubtitles[index] = {
                ...updatedSubtitles[index],
                startTime: parseFloat(result.suggestedStartTime.toFixed(3)),
                endTime: parseFloat(result.suggestedEndTime.toFixed(3)),
            };
            setSubtitles(updatedSubtitles);
            toast({ title: "AI Suggestion Applied", description: `Timings updated for subtitle. Confidence: ${(result.confidence * 100).toFixed(0)}%` });
         }
      } else {
        toast({ title: "AI Suggestion", description: "AI could not provide a specific timing.", variant: "default" });
      }
    } catch (error) {
      console.error("AI Error:", error);
      toast({ title: "AI Error", description: "Failed to get AI timing suggestions.", variant: "destructive" });
    } finally {
      setIsLoadingAIForId(null);
    }
  };
  
  const editorDisabled = !mediaFile;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 bg-background text-foreground">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-primary tracking-tight">Subtitle Sync</h1>
        <p className="text-muted-foreground">Synchronize and edit subtitles for your media files with AI assistance.</p>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Media and Playback */}
        <div className="space-y-6 flex flex-col">
          <MediaUploader onMediaUpload={handleMediaUpload} />
          {mediaFile && (
            <Card className="flex-grow shadow-lg">
              <CardContent className="p-4 h-full">
                <MediaPlayer
                  mediaFile={mediaFile}
                  subtitles={subtitles}
                  onTimeUpdate={handleTimeUpdate}
                  onShiftTime={handleShiftTime}
                  playerRef={playerRef}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Subtitle Management */}
        <div className="space-y-6 flex flex-col h-full">
           <SubtitleUploader onSubtitleUpload={handleSubtitleUpload} disabled={!mediaFile} />
          <div className="flex-grow min-h-[400px] lg:min-h-0"> {/* Ensure editor has space */}
            <SubtitleEditor
              subtitles={subtitles}
              onSubtitleChange={handleSubtitleChange}
              onSubtitleAdd={handleSubtitleAdd}
              onSubtitleDelete={handleSubtitleDelete}
              onAIAssist={handleAIAssist}
              currentTime={currentPlayerTime}
              isLoadingAIForId={isLoadingAIForId}
              disabled={editorDisabled}
            />
          </div>
          <SubtitleExporter 
            subtitles={subtitles} 
            fileName={originalSubtitleFileName} 
            originalFormat={originalSubtitleFormat}
            disabled={editorDisabled || subtitles.length === 0}
          />
        </div>
      </main>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Subtitle Sync. Powered by Next.js and Genkit.</p>
      </footer>
    </div>
  );
}
