
"use client";

import { useState, useRef, useCallback, useMemo } from 'react';
import type { MediaFile, SubtitleEntry, SubtitleFormat, SubtitleTrack } from '@/lib/types';
import { MediaUploader } from '@/components/media-uploader';
import { SubtitleUploader } from '@/components/subtitle-uploader';
import { MediaPlayer } from '@/components/media-player';
import { SubtitleEditor } from '@/components/subtitle-editor';
import { SubtitleExporter } from '@/components/subtitle-exporter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SubtitleSyncPage() {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [currentPlayerTime, setCurrentPlayerTime] = useState(0);

  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const { toast } = useToast();

  const activeTrack = useMemo(() => {
    return subtitleTracks.find(track => track.id === activeTrackId) || null;
  }, [subtitleTracks, activeTrackId]);

  const handleMediaUpload = (file: File, url: string, type: 'audio' | 'video', duration: number) => {
    setMediaFile({ name: file.name, type, url, duration, rawFile: file });
    setSubtitleTracks([]); // Reset tracks when new media is loaded
    setActiveTrackId(null);
    setCurrentPlayerTime(0);
    if (playerRef.current) {
      playerRef.current.currentTime = 0;
      playerRef.current.pause();
    }
    toast({ title: "Media Loaded", description: `${file.name} is ready.` });
  };

  const handleSubtitleUpload = (entries: SubtitleEntry[], fileName: string, format: SubtitleFormat) => {
    const newTrackId = `track-${Date.now()}`;
    const newTrack: SubtitleTrack = {
      id: newTrackId,
      fileName,
      format,
      entries: entries.sort((a, b) => a.startTime - b.startTime),
    };
    setSubtitleTracks(prevTracks => [...prevTracks, newTrack]);
    setActiveTrackId(newTrackId);
    toast({ title: "Subtitle Track Loaded", description: `${fileName} added.` });
  };

  const handleSubtitleChange = (entryId: string, newEntryData: Partial<Omit<SubtitleEntry, 'id'>>) => {
    if (!activeTrackId) return;
    setSubtitleTracks(prevTracks =>
      prevTracks.map(track => {
        if (track.id === activeTrackId) {
          const updatedEntries = track.entries
            .map(entry => (entry.id === entryId ? { ...entry, ...newEntryData } : entry))
            .sort((a, b) => a.startTime - b.startTime); // Ensure sort after modification
          return { ...track, entries: updatedEntries };
        }
        return track;
      })
    );
  };

  const handleSubtitleAdd = () => {
    if (!activeTrackId || !activeTrack) {
      toast({ title: "No Active Track", description: "Please select or upload a subtitle track first.", variant: "destructive" });
      return;
    }

    const newId = `new-${Date.now()}`;
    const defaultCueDuration = 2.0; // seconds
    let sTime: number;

    if (activeTrack.entries.length > 0) {
      const lastCue = activeTrack.entries[activeTrack.entries.length - 1];
      sTime = lastCue.endTime + 0.1; // Add a small gap
    } else {
      sTime = currentPlayerTime; // Start at current player time if track is empty
    }

    let eTime = sTime + defaultCueDuration;

    // Adjust times based on media duration if media is loaded
    if (mediaFile) {
      const mediaDur = mediaFile.duration;
      if (mediaDur <= 0.001) { // Effectively zero or very short media
        sTime = 0;
        eTime = 0.001; // Minimal valid cue
      } else {
        // Clamp sTime
        sTime = Math.max(0, sTime);
        if (sTime >= mediaDur) { // If proposed sTime is at or after media end
          sTime = Math.max(0, mediaDur - 0.1); // Place it 0.1s before end
        }
        
        // Clamp eTime
        eTime = Math.max(sTime + 0.001, eTime); // Ensure eTime is after sTime
        eTime = Math.min(eTime, mediaDur);     // And not beyond media duration

        // If clamping eTime made it too short or invalid relative to sTime, readjust sTime
        if (sTime >= eTime) {
          sTime = Math.max(0, eTime - 0.001);
        }
      }
    } else { // No media file, less constrained
      sTime = Math.max(0, sTime);
      eTime = Math.max(sTime + 0.001, eTime);
    }
    
    const finalStartTime = parseFloat(sTime.toFixed(3));
    const finalEndTime = parseFloat(eTime.toFixed(3));

    // Final check for validity
    if (finalEndTime <= finalStartTime) {
      toast({ title: "Error Adding Subtitle", description: "Could not determine a valid time range for the new subtitle cue.", variant: "destructive"});
      return;
    }

    const newEntry: SubtitleEntry = {
      id: newId,
      startTime: finalStartTime,
      endTime: finalEndTime,
      text: 'New subtitle',
    };

    setSubtitleTracks(prevTracks =>
      prevTracks.map(track => {
        if (track.id === activeTrackId) {
          const updatedEntries = [...track.entries, newEntry].sort((a, b) => a.startTime - b.startTime);
          return { ...track, entries: updatedEntries };
        }
        return track;
      })
    );
    toast({ title: "Subtitle Added", description: `New cue added from ${finalStartTime.toFixed(3)}s to ${finalEndTime.toFixed(3)}s.` });
  };

  const handleSubtitleDelete = (entryId: string) => {
    if (!activeTrackId) return;
    setSubtitleTracks(prevTracks =>
      prevTracks.map(track => {
        if (track.id === activeTrackId) {
          const updatedEntries = track.entries.filter(entry => entry.id !== entryId).sort((a, b) => a.startTime - b.startTime); // Sort after delete, though likely not strictly necessary
          return { ...track, entries: updatedEntries };
        }
        return track;
      })
    );
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentPlayerTime(time);
  }, []);

  const handleShiftTime = (offset: number) => {
    if (!activeTrackId || !activeTrack || activeTrack.entries.length === 0) return;
    
    setSubtitleTracks(prevTracks =>
      prevTracks.map(track => {
        if (track.id === activeTrackId) {
          const newEntries = track.entries.map(sub => ({
            ...sub,
            startTime: Math.max(0, parseFloat((sub.startTime + offset).toFixed(3))),
            endTime: Math.max(0, parseFloat((sub.endTime + offset).toFixed(3))),
          })).sort((a, b) => a.startTime - b.startTime); // Sort after shift
          return { ...track, entries: newEntries };
        }
        return track;
      })
    );
    toast({ title: "Subtitles Shifted", description: `Active track subtitles shifted by ${offset.toFixed(1)}s.` });
  };
  
  const editorDisabled = !mediaFile || !activeTrack;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 bg-background text-foreground">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-primary tracking-tight">Subtitle Sync</h1>
        <p className="text-muted-foreground">Synchronize and edit subtitles for your media files.</p>
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
                  activeSubtitlesToDisplay={activeTrack?.entries || []}
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
           
           {subtitleTracks.length > 0 && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Active Subtitle Track</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={activeTrackId || ""}
                  onValueChange={(trackId) => setActiveTrackId(trackId)}
                  disabled={!mediaFile || subtitleTracks.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subtitle track to edit" />
                  </SelectTrigger>
                  <SelectContent>
                    {subtitleTracks.map((track) => (
                      <SelectItem key={track.id} value={track.id}>
                        {track.fileName} ({track.format.toUpperCase()}, {track.entries.length} cues)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
           )}

          <div className="flex-grow min-h-[400px] lg:min-h-0">
            <SubtitleEditor
              activeTrack={activeTrack}
              onSubtitleChange={handleSubtitleChange}
              onSubtitleAdd={handleSubtitleAdd}
              onSubtitleDelete={handleSubtitleDelete}
              currentTime={currentPlayerTime}
              disabled={editorDisabled}
            />
          </div>
          <SubtitleExporter 
            activeTrack={activeTrack}
            disabled={editorDisabled || !activeTrack?.entries.length}
          />
        </div>
      </main>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Subtitle Sync. Powered by Next.js.</p>
      </footer>
    </div>
  );
}
