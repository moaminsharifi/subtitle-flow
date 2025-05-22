
"use client";

import { useState, useRef, useCallback, useMemo } from 'react';
import type { MediaFile, SubtitleEntry, SubtitleFormat, SubtitleTrack } from '@/lib/types';
import { MediaUploader } from '@/components/media-uploader';
import { SubtitleUploader } from '@/components/subtitle-uploader';
import { MediaPlayer } from '@/components/media-player';
import { SubtitleEditor } from '@/components/subtitle-editor';
import { SubtitleExporter } from '@/components/subtitle-exporter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

type AppStep = 'upload' | 'edit' | 'export';

export default function SubtitleSyncPage() {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [currentPlayerTime, setCurrentPlayerTime] = useState(0);
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');

  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const { toast } = useToast();

  const activeTrack = useMemo(() => {
    return subtitleTracks.find(track => track.id === activeTrackId) || null;
  }, [subtitleTracks, activeTrackId]);

  const handleMediaUpload = (file: File, url: string, type: 'audio' | 'video', duration: number) => {
    setMediaFile({ name: file.name, type, url, duration, rawFile: file });
    // Don't reset tracks here, allow multiple media uploads if user goes back
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
    setActiveTrackId(newTrackId); // Automatically select new track
    toast({ title: "Subtitle Track Loaded", description: `${fileName} added.` });
  };

  const handleSubtitleChange = (entryId: string, newEntryData: Partial<Omit<SubtitleEntry, 'id'>>) => {
    if (!activeTrackId) return;
    setSubtitleTracks(prevTracks =>
      prevTracks.map(track => {
        if (track.id === activeTrackId) {
          const updatedEntries = track.entries
            .map(entry => (entry.id === entryId ? { ...entry, ...newEntryData } : entry))
            .sort((a, b) => a.startTime - b.startTime);
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
    const defaultCueDuration = 2.0; 
    let sTime: number;

    if (activeTrack.entries.length > 0) {
      const lastCue = activeTrack.entries[activeTrack.entries.length - 1];
      sTime = lastCue.endTime + 0.1; 
    } else {
      sTime = currentPlayerTime; 
    }

    let eTime = sTime + defaultCueDuration;

    if (mediaFile) {
      const mediaDur = mediaFile.duration;
      if (mediaDur <= 0.001) {
        sTime = 0;
        eTime = 0.001; 
      } else {
        sTime = Math.max(0, sTime);
        if (sTime >= mediaDur) { 
          sTime = Math.max(0, mediaDur - 0.1); 
        }
        eTime = Math.max(sTime + 0.001, eTime); 
        eTime = Math.min(eTime, mediaDur);     

        if (sTime >= eTime) {
          sTime = Math.max(0, eTime - 0.001);
        }
      }
    } else { 
      sTime = Math.max(0, sTime);
      eTime = Math.max(sTime + 0.001, eTime);
    }
    
    const finalStartTime = parseFloat(sTime.toFixed(3));
    const finalEndTime = parseFloat(eTime.toFixed(3));

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
          const updatedEntries = track.entries.filter(entry => entry.id !== entryId).sort((a, b) => a.startTime - b.startTime);
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
          })).sort((a, b) => a.startTime - b.startTime);
          return { ...track, entries: newEntries };
        }
        return track;
      })
    );
    toast({ title: "Subtitles Shifted", description: `Active track subtitles shifted by ${offset.toFixed(1)}s.` });
  };
  
  const editorDisabled = !mediaFile || !activeTrack;

  // Step navigation logic
  const handleProceedToEdit = () => {
    if (!mediaFile) {
      toast({ title: "Media Required", description: "Please upload a media file first.", variant: "destructive" });
      return;
    }
    if (subtitleTracks.length === 0) {
      toast({ title: "Subtitles Required", description: "Please upload at least one subtitle track.", variant: "destructive" });
      return;
    }
    if (!activeTrackId && subtitleTracks.length > 0) {
      setActiveTrackId(subtitleTracks[0].id); // Default to first track if none selected
    }
    setCurrentStep('edit');
  };

  const handleProceedToExport = () => {
    if (!activeTrack || activeTrack.entries.length === 0) {
      toast({ title: "No Subtitles to Export", description: "The active track has no subtitles to export.", variant: "destructive"});
      return;
    }
    setCurrentStep('export');
  };

  const handleGoToUpload = (reset: boolean = false) => {
    if (reset) {
      setMediaFile(null);
      setSubtitleTracks([]);
      setActiveTrackId(null);
      setCurrentPlayerTime(0);
      if (playerRef.current) {
        playerRef.current.src = ''; 
        playerRef.current.load(); // Important to reset the media element
      }
      toast({ title: "Project Reset", description: "All media and subtitles cleared." });
    }
    setCurrentStep('upload');
  };

  const handleGoToEdit = () => {
    setCurrentStep('edit');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload': return "Step 1 of 3: Upload Files";
      case 'edit': return "Step 2 of 3: Edit Subtitles";
      case 'export': return "Step 3 of 3: Export Subtitles";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 bg-background text-foreground">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-primary tracking-tight">Subtitle Sync</h1>
        <p className="text-muted-foreground">{getStepTitle()}</p>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Always shows media player if media is loaded, otherwise uploader */}
        <div className="space-y-6 flex flex-col">
          {currentStep === 'upload' && !mediaFile && (
            <MediaUploader onMediaUpload={handleMediaUpload} />
          )}
          {mediaFile && (
            <Card className="flex-grow shadow-lg">
              <CardContent className="p-4 h-full">
                <MediaPlayer
                  mediaFile={mediaFile}
                  activeSubtitlesToDisplay={currentStep === 'edit' && activeTrack ? activeTrack.entries : []}
                  onTimeUpdate={handleTimeUpdate}
                  onShiftTime={handleShiftTime}
                  playerRef={playerRef}
                />
              </CardContent>
            </Card>
          )}
           {currentStep === 'upload' && mediaFile && ( // Show uploader again if media is loaded but still in upload step
            <MediaUploader onMediaUpload={handleMediaUpload} />
          )}
        </div>

        {/* Right Column: Step-dependent content */}
        <div className="space-y-6 flex flex-col h-full">
          {currentStep === 'upload' && (
            <>
              <SubtitleUploader onSubtitleUpload={handleSubtitleUpload} disabled={!mediaFile} />
              <Card>
                <CardFooter className="p-4">
                  <Button 
                    onClick={handleProceedToEdit} 
                    disabled={!mediaFile || subtitleTracks.length === 0} 
                    className="w-full"
                  >
                    Proceed to Edit <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}

          {currentStep === 'edit' && (
            <>
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
              <div className="flex-grow min-h-[300px] lg:min-h-0">
                <SubtitleEditor
                  activeTrack={activeTrack}
                  onSubtitleChange={handleSubtitleChange}
                  onSubtitleAdd={handleSubtitleAdd}
                  onSubtitleDelete={handleSubtitleDelete}
                  currentTime={currentPlayerTime}
                  disabled={editorDisabled}
                />
              </div>
              <Card>
                <CardFooter className="p-4 flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => handleGoToUpload(false)} variant="outline" className="w-full sm:w-auto">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Uploads
                  </Button>
                  <Button 
                    onClick={handleProceedToExport} 
                    disabled={!activeTrack || !activeTrack.entries.length}
                    className="w-full sm:flex-1"
                  >
                    Proceed to Export <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}

          {currentStep === 'export' && (
            <>
              <SubtitleExporter 
                activeTrack={activeTrack}
                disabled={!activeTrack || !activeTrack.entries.length}
              />
              <Card>
                <CardFooter className="p-4 flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleGoToEdit} variant="outline" className="w-full sm:w-auto">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Edit More
                  </Button>
                  <Button onClick={() => handleGoToUpload(true)} variant="destructive" className="w-full sm:flex-1">
                     <RotateCcw className="mr-2 h-4 w-4" /> Start Over (Clear Data)
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </div>
      </main>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Subtitle Sync. Powered by Next.js.</p>
      </footer>
    </div>
  );
}

    