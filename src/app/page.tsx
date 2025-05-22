
"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { MediaFile, OpenAIModelType, SubtitleEntry, SubtitleFormat, SubtitleTrack, LanguageCode } from '@/lib/types';
import { LANGUAGE_OPTIONS } from '@/lib/types';
import { MediaUploader } from '@/components/media-uploader';
import { SubtitleUploader } from '@/components/subtitle-uploader';
import { MediaPlayer } from '@/components/media-player';
import { SubtitleEditor } from '@/components/subtitle-editor';
import { SubtitleExporter } from '@/components/subtitle-exporter';
import { SettingsDialog } from '@/components/settings-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, RotateCcw, SettingsIcon, Loader2 } from 'lucide-react';
import { transcribeAudioSegment } from '@/ai/flows/transcribe-segment-flow';
import { sliceAudioToDataURI } from '@/lib/subtitle-utils';

const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
// const GROQ_TOKEN_KEY = 'app-settings-groq-token'; // Kept for UI consistency, but not used by transcription logic
const OPENAI_MODEL_KEY = 'app-settings-openai-model';

type AppStep = 'upload' | 'edit' | 'export';

export default function SubtitleSyncPage() {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [currentPlayerTime, setCurrentPlayerTime] = useState(0);
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [entryTranscriptionLoading, setEntryTranscriptionLoading] = useState<Record<string, boolean>>({});
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<LanguageCode>("");


  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const { toast } = useToast();

  const activeTrack = useMemo(() => {
    return subtitleTracks.find(track => track.id === activeTrackId) || null;
  }, [subtitleTracks, activeTrackId]);

  const handleMediaUpload = (file: File, url: string, type: 'audio' | 'video', duration: number) => {
    setMediaFile({ name: file.name, type, url, duration, rawFile: file });
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

    if (mediaFile && mediaFile.duration > 0) {
        const mediaDur = mediaFile.duration;
        sTime = Math.max(0, Math.min(sTime, mediaDur));
        eTime = Math.max(sTime + 0.001, Math.min(eTime, mediaDur));
        if (eTime <= sTime) { 
            sTime = Math.max(0, eTime - 0.001);
        }
        // If adding at the very end, slightly adjust to prevent issues
        if (sTime >= mediaDur) sTime = Math.max(0, mediaDur - defaultCueDuration);
        if (eTime > mediaDur) eTime = mediaDur;
        if (eTime <= sTime && mediaDur > 0) { // one last check
             sTime = Math.max(0, mediaDur - 0.1);
             eTime = mediaDur;
             if (sTime < 0) sTime = 0;
             if (eTime <= sTime) {
                 toast({ title: "Error Adding Subtitle", description: `Cannot add subtitle at media end. Try adjusting manually.`, variant: "destructive"});
                 return;
             }
        }

    } else { 
        sTime = Math.max(0, sTime);
        eTime = Math.max(sTime + 0.001, eTime);
    }
    
    const finalStartTime = parseFloat(sTime.toFixed(3));
    const finalEndTime = parseFloat(eTime.toFixed(3));

    if (finalEndTime <= finalStartTime && mediaFile && mediaFile.duration > 0 && mediaFile.duration - finalStartTime < 0.001) {
        toast({ title: "Error Adding Subtitle", description: `Cannot add subtitle at the very end of the media or invalid time. ${finalStartTime.toFixed(3)}s - ${finalEndTime.toFixed(3)}s`, variant: "destructive"});
        return;
    }
     if (finalEndTime <= finalStartTime) {
        toast({ title: "Error Adding Subtitle", description: `Could not determine a valid time range. ${finalStartTime.toFixed(3)}s - ${finalEndTime.toFixed(3)}s`, variant: "destructive"});
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
    toast({ title: "Subtitle Deleted", description: "Cue removed from active track."});
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentPlayerTime(time);
  }, []);

  const handleShiftTime = (offset: number) => {
    if (!activeTrackId || !activeTrack || activeTrack.entries.length === 0) return;
    
    setSubtitleTracks(prevTracks =>
      prevTracks.map(track => {
        if (track.id === activeTrackId) {
          const newEntries = track.entries.map(sub => {
            let newStartTime = Math.max(0, parseFloat((sub.startTime + offset).toFixed(3)));
            let newEndTime = Math.max(0, parseFloat((sub.endTime + offset).toFixed(3)));

            if (mediaFile && mediaFile.duration > 0) {
              newStartTime = Math.min(newStartTime, mediaFile.duration);
              newEndTime = Math.min(newEndTime, mediaFile.duration);
              if (newEndTime <= newStartTime && newStartTime > 0) { 
                 newStartTime = Math.max(0, newEndTime - 0.001); 
              }
            }
             if (newEndTime <= newStartTime && newStartTime === 0 && newEndTime === 0 && offset < 0) { 
                return null; 
            }
            return { ...sub, startTime: newStartTime, endTime: newEndTime };
          })
          .filter(subOrNull => subOrNull !== null) 
          .filter(sub => !(mediaFile && mediaFile.duration > 0 && sub!.startTime >= mediaFile.duration && sub!.endTime >= mediaFile.duration)) 
          .sort((a, b) => a!.startTime - b!.startTime) as SubtitleEntry[];
          return { ...track, entries: newEntries };
        }
        return track;
      })
    );
    toast({ title: "Subtitles Shifted", description: `Active track subtitles shifted by ${offset.toFixed(1)}s.` });
  };

  const handleRegenerateTranscription = async (entryId: string) => {
    if (!mediaFile || !activeTrack) {
      toast({ title: "Error", description: "Media file or active track not found.", variant: "destructive" });
      return;
    }

    const entry = activeTrack.entries.find(e => e.id === entryId);
    if (!entry) {
      toast({ title: "Error", description: "Subtitle entry not found.", variant: "destructive" });
      return;
    }

    const selectedOpenAIModel = localStorage.getItem(OPENAI_MODEL_KEY) as OpenAIModelType | null || 'whisper-1';
    const openAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);

    if (!openAIToken) {
      toast({ title: "OpenAI Token Missing", description: "Please set your OpenAI API token in Settings.", variant: "destructive" });
      return;
    }

    setEntryTranscriptionLoading(prev => ({ ...prev, [entryId]: true }));

    try {
      const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, entry.startTime, entry.endTime);
      
      const result = await transcribeAudioSegment({
        audioDataUri,
        openAIModel: selectedOpenAIModel,
        language: transcriptionLanguage === "" ? undefined : transcriptionLanguage, // Pass undefined for auto-detect
        openAIApiKey: openAIToken!,
      });

      if (result.transcribedText !== undefined) {
        handleSubtitleChange(entryId, { text: result.transcribedText });
        toast({ title: "Transcription Updated", description: `Subtitle text regenerated using ${selectedOpenAIModel}.` });
      } else {
        toast({ title: "Transcription Failed", description: "Received no text from the AI model.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Transcription regeneration error:", error);
      toast({ title: "Transcription Error", description: error.message || "Failed to regenerate transcription.", variant: "destructive" });
    } finally {
      setEntryTranscriptionLoading(prev => ({ ...prev, [entryId]: false }));
    }
  };
  
  const isEntryTranscribing = (entryId: string): boolean => {
    return !!entryTranscriptionLoading[entryId];
  };
  
  const editorDisabled = !mediaFile || !activeTrack;

  const handleProceedToEdit = () => {
    if (!mediaFile) {
      toast({ title: "Media Required", description: "Please upload a media file first.", variant: "destructive" });
      return;
    }
    if (subtitleTracks.length === 0) {
       toast({ title: "No Subtitles Yet", description: "Proceeding to editor. You can add subtitles manually or upload a file.", variant: "default" });
    }
    if (!activeTrackId && subtitleTracks.length > 0) {
      setActiveTrackId(subtitleTracks[0].id);
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
        if (playerRef.current.src && playerRef.current.src.startsWith('blob:')) {
             URL.revokeObjectURL(playerRef.current.src); 
        }
        playerRef.current.removeAttribute('src'); 
        playerRef.current.load(); 
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
    <div className="min-h-screen flex flex-col p-4 md:p-6 bg-background text-foreground relative">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-primary tracking-tight">Subtitle Sync</h1>
        <p className="text-muted-foreground">{getStepTitle()}</p>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6">
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
           {currentStep === 'upload' && mediaFile && (
            <MediaUploader onMediaUpload={handleMediaUpload} />
          )}
        </div>

        <div className="space-y-6 flex flex-col h-full">
          {currentStep === 'upload' && (
            <>
              <SubtitleUploader onSubtitleUpload={handleSubtitleUpload} disabled={!mediaFile} />
              <Card>
                <CardFooter className="p-4">
                  <Button 
                    onClick={handleProceedToEdit} 
                    disabled={!mediaFile} 
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
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Track & Language</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="active-track-select">Active Subtitle Track</Label>
                    <Select
                      value={activeTrackId || ""}
                      onValueChange={(trackId) => setActiveTrackId(trackId)}
                      disabled={!mediaFile || subtitleTracks.length === 0}
                      
                    >
                      <SelectTrigger id="active-track-select" className="w-full">
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
                  </div>
                  <div>
                    <Label htmlFor="transcription-language-select">Transcription Language</Label>
                    <Select
                      value={transcriptionLanguage}
                      onValueChange={(value: LanguageCode) => setTranscriptionLanguage(value)}
                      disabled={!mediaFile}
                    >
                      <SelectTrigger id="transcription-language-select" className="w-full">
                        <SelectValue placeholder="Select transcription language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <SelectItem key={lang.value || 'auto'} value={lang.value || ""}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex-grow min-h-[300px] lg:min-h-0">
                <SubtitleEditor
                  activeTrack={activeTrack}
                  onSubtitleChange={handleSubtitleChange}
                  onSubtitleAdd={handleSubtitleAdd}
                  onSubtitleDelete={handleSubtitleDelete}
                  onRegenerateTranscription={handleRegenerateTranscription}
                  isEntryTranscribing={isEntryTranscribing}
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
        <p>&copy; {new Date().getFullYear()} Subtitle Sync. Powered by Next.js & OpenAI.</p>
      </footer>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="fixed bottom-4 right-4 rounded-full shadow-lg z-50"
        onClick={() => setIsSettingsDialogOpen(true)}
        aria-label="Open Settings"
      >
        <SettingsIcon className="h-5 w-5" />
      </Button>
      <SettingsDialog 
        isOpen={isSettingsDialogOpen} 
        onClose={() => setIsSettingsDialogOpen(false)} 
      />
    </div>
  );
}
