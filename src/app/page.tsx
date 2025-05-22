
"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { MediaFile, OpenAIModelType, SubtitleEntry, SubtitleFormat, SubtitleTrack, LanguageCode, LogEntry, Segment } from '@/lib/types';
import { LANGUAGE_OPTIONS } from '@/lib/types';
import { MediaUploader } from '@/components/media-uploader';
import { SubtitleUploader } from '@/components/subtitle-uploader';
import { MediaPlayer } from '@/components/media-player';
import { SubtitleEditor } from '@/components/subtitle-editor';
import { SubtitleExporter } from '@/components/subtitle-exporter';
import { SettingsDialog } from '@/components/settings-dialog';
import { DebugLogDialog } from '@/components/debug-log-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, RotateCcw, SettingsIcon, Loader2, ClipboardList, WandSparkles } from 'lucide-react';
import { transcribeAudioSegment } from '@/ai/flows/transcribe-segment-flow';
import { sliceAudioToDataURI } from '@/lib/subtitle-utils';

const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
const OPENAI_MODEL_KEY = 'app-settings-openai-model';
const DEFAULT_TRANSCRIPTION_LANGUAGE_KEY = 'app-settings-default-transcription-language';

const CHUNK_DURATION_SECONDS = 5 * 60; // 5 minutes for full transcription chunks


type AppStep = 'upload' | 'edit' | 'export';

export default function SubtitleSyncPage() {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [currentPlayerTime, setCurrentPlayerTime] = useState(0);
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isDebugLogDialogOpen, setIsDebugLogDialogOpen] = useState(false);
  const [entryTranscriptionLoading, setEntryTranscriptionLoading] = useState<Record<string, boolean>>({});
  const [isAnyTranscriptionLoading, setIsAnyTranscriptionLoading] = useState<boolean>(false);
  const [isGeneratingFullTranscription, setIsGeneratingFullTranscription] = useState<boolean>(false);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const { toast } = useToast();

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const newLogEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      message,
      type,
    };
    setLogEntries(prevLogs => [newLogEntry, ...prevLogs.slice(0, 199)]); // Keep max 200 logs
  }, []);

  const clearLogs = useCallback(() => {
    setLogEntries([]);
    addLog("Logs cleared.", "debug");
  }, [addLog]);

  useEffect(() => {
    addLog("Application initialized.", "debug");
    const savedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
    if (savedDefaultLang) {
      setTranscriptionLanguage(savedDefaultLang);
      addLog(`Default transcription language loaded from settings: ${savedDefaultLang}`, "debug");
    } else {
      addLog("No default transcription language found in settings, using 'auto-detect'.", "debug");
    }
  }, [addLog]);


  const activeTrack = useMemo(() => {
    return subtitleTracks.find(track => track.id === activeTrackId) || null;
  }, [subtitleTracks, activeTrackId]);

  const handleMediaUpload = (file: File, url: string, type: 'audio' | 'video', duration: number) => {
    addLog(`Media upload started: ${file.name}`, 'debug');
    setMediaFile({ name: file.name, type, url, duration, rawFile: file });
    setCurrentPlayerTime(0);
    if (playerRef.current) {
      playerRef.current.currentTime = 0;
      playerRef.current.pause();
    }
    const message = `Media Loaded: ${file.name} (Type: ${type}, Duration: ${duration.toFixed(2)}s)`;
    toast({ title: "Media Loaded", description: message });
    addLog(message, 'success');
  };

  const handleSubtitleUpload = (entries: SubtitleEntry[], fileName: string, format: SubtitleFormat) => {
    addLog(`Subtitle upload started: ${fileName}`, 'debug');
    const newTrackId = `track-${Date.now()}`;
    const newTrack: SubtitleTrack = {
      id: newTrackId,
      fileName,
      format,
      entries: entries.sort((a, b) => a.startTime - b.startTime),
    };
    setSubtitleTracks(prevTracks => [...prevTracks, newTrack]);
    setActiveTrackId(newTrackId);
    const message = `Subtitle Track Loaded: ${fileName} (Format: ${format.toUpperCase()}, Cues: ${entries.length})`;
    toast({ title: "Subtitle Track Loaded", description: message });
    addLog(message, 'success');
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
      const msg = "Cannot add subtitle: No Active Track. Please select or upload a subtitle track first.";
      toast({ title: "No Active Track", description: msg, variant: "destructive" });
      addLog(msg, 'warn');
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
        if (sTime >= mediaDur) sTime = Math.max(0, mediaDur - defaultCueDuration);
        if (eTime > mediaDur) eTime = mediaDur;
        if (eTime <= sTime && mediaDur > 0) {
             sTime = Math.max(0, mediaDur - 0.1);
             eTime = mediaDur;
             if (sTime < 0) sTime = 0;
             if (eTime <= sTime) {
                 const errorMsg = `Cannot add subtitle at media end. Try adjusting manually. Times: ${sTime.toFixed(3)} - ${eTime.toFixed(3)}`;
                 toast({ title: "Error Adding Subtitle", description: errorMsg, variant: "destructive"});
                 addLog(errorMsg, 'error');
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
        const errorMsg = `Cannot add subtitle at the very end of the media or invalid time. ${finalStartTime.toFixed(3)}s - ${finalEndTime.toFixed(3)}s`;
        toast({ title: "Error Adding Subtitle", description: errorMsg, variant: "destructive"});
        addLog(errorMsg, 'error');
        return;
    }
     if (finalEndTime <= finalStartTime) {
        const errorMsg = `Could not determine a valid time range. ${finalStartTime.toFixed(3)}s - ${finalEndTime.toFixed(3)}s`;
        toast({ title: "Error Adding Subtitle", description: errorMsg, variant: "destructive"});
        addLog(errorMsg, 'error');
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
    const successMsg = `Subtitle Added: New cue from ${finalStartTime.toFixed(3)}s to ${finalEndTime.toFixed(3)}s.`;
    toast({ title: "Subtitle Added", description: successMsg });
    addLog(successMsg, 'success');
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
    const message = `Subtitle cue ${entryId} deleted.`;
    toast({ title: "Subtitle Deleted", description: "Cue removed from active track."});
    addLog(message, 'info');
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
    const message = `Subtitles Shifted: Active track subtitles shifted by ${offset.toFixed(1)}s for track ${activeTrack.fileName}.`;
    toast({ title: "Subtitles Shifted", description: message });
    addLog(message, 'info');
  };

  const handleRegenerateTranscription = async (entryId: string) => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription) {
      const msg = "A transcription process is already running. Please wait.";
      toast({ title: "Transcription Busy", description: msg, variant: "destructive" });
      addLog(msg, 'warn');
      return;
    }

    addLog(`Transcription regeneration started for entry ID: ${entryId}.`, 'debug');
    if (!mediaFile || !activeTrack) {
      const msg = "Transcription Error: Media file or active track not found.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      addLog(msg, 'error');
      return;
    }

    const entry = activeTrack.entries.find(e => e.id === entryId);
    if (!entry) {
      const msg = `Transcription Error: Subtitle entry ID ${entryId} not found.`;
      toast({ title: "Error", description: msg, variant: "destructive" });
      addLog(msg, 'error');
      return;
    }

    const selectedOpenAIModel = localStorage.getItem(OPENAI_MODEL_KEY) as OpenAIModelType || 'whisper-1';
    const openAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);

    if (!openAIToken) {
      const msg = "OpenAI Token Missing. Please set your OpenAI API token in Settings.";
      toast({ title: "OpenAI Token Missing", description: msg, variant: "destructive" });
      addLog(msg, 'error');
      return;
    }
    
    addLog(`Using OpenAI model: ${selectedOpenAIModel}, Language: ${transcriptionLanguage}. Segment: ${entry.startTime.toFixed(3)}s - ${entry.endTime.toFixed(3)}s.`, 'debug');
    
    setEntryTranscriptionLoading(prev => ({ ...prev, [entryId]: true }));
    setIsAnyTranscriptionLoading(true);

    try {
      const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, entry.startTime, entry.endTime);
      addLog(`Audio segment sliced for transcription (entry ID: ${entryId}). Data URI length: ${audioDataUri.length}`, 'debug');
      
      const result = await transcribeAudioSegment({
        audioDataUri,
        openAIModel: selectedOpenAIModel,
        language: transcriptionLanguage === "auto-detect" ? undefined : transcriptionLanguage,
        openAIApiKey: openAIToken!,
      });

      // For single segment regeneration, we expect a single dominant text block.
      // The new API returns segments, so we'll join them.
      const regeneratedText = result.segments.map(s => s.text).join(' ').trim() || result.fullText;

      if (regeneratedText) {
        handleSubtitleChange(entryId, { text: regeneratedText });
        const successMsg = `Transcription Updated for entry ${entryId} using ${selectedOpenAIModel}. New text: "${regeneratedText.substring(0, 30)}..."`;
        toast({ title: "Transcription Updated", description: successMsg });
        addLog(successMsg, 'success');
      } else {
        const warnMsg = `Transcription for entry ${entryId} resulted in empty text from the AI model.`;
        toast({ title: "Transcription Potentially Failed", description: warnMsg, variant: "destructive" });
        addLog(warnMsg, 'warn');
         handleSubtitleChange(entryId, { text: "" }); // Clear text if transcription is empty
      }
    } catch (error: any) {
      console.error("Transcription regeneration error:", error);
      const errorMsg = `Transcription Error for entry ${entryId}: ${error.message || "Failed to regenerate transcription."}`;
      toast({ title: "Transcription Error", description: errorMsg, variant: "destructive" });
      addLog(errorMsg, 'error');
    } finally {
      setEntryTranscriptionLoading(prev => ({ ...prev, [entryId]: false }));
      setIsAnyTranscriptionLoading(false);
      addLog(`Transcription regeneration finished for entry ID: ${entryId}.`, 'debug');
    }
  };

  const handleGenerateFullTranscription = async () => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription) {
      const msg = "A transcription process is already running. Please wait.";
      toast({ title: "Transcription Busy", description: msg, variant: "destructive" });
      addLog(msg, 'warn');
      return;
    }
    if (!mediaFile) {
      const msg = "Full Transcription Error: No media file loaded.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      addLog(msg, 'error');
      return;
    }

    const selectedOpenAIModel = localStorage.getItem(OPENAI_MODEL_KEY) as OpenAIModelType || 'whisper-1';
    const openAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);

    if (!openAIToken) {
      const msg = "OpenAI Token Missing. Please set your OpenAI API token in Settings.";
      toast({ title: "OpenAI Token Missing", description: msg, variant: "destructive" });
      addLog(msg, 'error');
      return;
    }

    addLog(`Starting full media transcription with model: ${selectedOpenAIModel}, Language: ${transcriptionLanguage}. Media: ${mediaFile.name}`, 'info');
    setIsGeneratingFullTranscription(true);
    
    const allSubtitleEntries: SubtitleEntry[] = [];
    const numChunks = Math.ceil(mediaFile.duration / CHUNK_DURATION_SECONDS);

    try {
      for (let i = 0; i < numChunks; i++) {
        const chunkStartTime = i * CHUNK_DURATION_SECONDS;
        const chunkEndTime = Math.min((i + 1) * CHUNK_DURATION_SECONDS, mediaFile.duration);
        
        if (chunkStartTime >= chunkEndTime) continue;

        const progressMsg = `Transcribing chunk ${i + 1} of ${numChunks} (${chunkStartTime.toFixed(1)}s - ${chunkEndTime.toFixed(1)}s)...`;
        toast({ title: "Transcription Progress", description: progressMsg });
        addLog(progressMsg, 'debug');

        const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, chunkStartTime, chunkEndTime);
        addLog(`Audio chunk ${i+1} sliced. Data URI length: ${audioDataUri.length}`, 'debug');

        const result = await transcribeAudioSegment({
          audioDataUri,
          openAIModel: selectedOpenAIModel,
          language: transcriptionLanguage === "auto-detect" ? undefined : transcriptionLanguage,
          openAIApiKey: openAIToken!,
        });
        
        addLog(`Chunk ${i+1} transcribed. Segments received: ${result.segments.length}`, 'debug');

        result.segments.forEach(segment => {
          allSubtitleEntries.push({
            id: `gen-${chunkStartTime + segment.start}-${Date.now()}-${Math.random()}`,
            startTime: parseFloat((chunkStartTime + segment.start).toFixed(3)),
            endTime: parseFloat((chunkStartTime + segment.end).toFixed(3)),
            text: segment.text,
          });
        });
      }

      allSubtitleEntries.sort((a, b) => a.startTime - b.startTime);

      const newTrackId = `track-generated-${Date.now()}`;
      const newTrackFileName = `${mediaFile.name} - ${selectedOpenAIModel} - AI.srt`; // Default to SRT format for generated
      const newTrack: SubtitleTrack = {
        id: newTrackId,
        fileName: newTrackFileName,
        format: 'srt', // Generated tracks will be SRT format by default
        entries: allSubtitleEntries,
      };

      setSubtitleTracks(prevTracks => [...prevTracks, newTrack]);
      setActiveTrackId(newTrackId);
      
      const successMsg = `Full transcription complete! New track "${newTrackFileName}" added with ${allSubtitleEntries.length} cues.`;
      toast({ title: "Transcription Complete", description: successMsg, duration: 5000 });
      addLog(successMsg, 'success');
      
      // Automatically proceed to edit step
      setCurrentStep('edit');
      addLog("Automatically navigated to Edit step after full transcription.", 'debug');

    } catch (error: any) {
      console.error("Full transcription error:", error);
      const errorMsg = `Full Transcription Error: ${error.message || "Failed to generate full transcription."}`;
      toast({ title: "Full Transcription Error", description: errorMsg, variant: "destructive" });
      addLog(errorMsg, 'error');
    } finally {
      setIsGeneratingFullTranscription(false);
      addLog("Full media transcription process finished.", 'debug');
    }
  };
  
  const isEntryTranscribing = (entryId: string): boolean => {
    return !!entryTranscriptionLoading[entryId];
  };
  
  const editorDisabled = !mediaFile || !activeTrack || isGeneratingFullTranscription;

  const handleProceedToEdit = () => {
    if (!mediaFile) {
      const msg = "Media Required: Please upload a media file first.";
      toast({ title: "Media Required", description: msg, variant: "destructive" });
      addLog(msg, 'warn');
      return;
    }
    if (subtitleTracks.length === 0) {
       const msg = "No Subtitles Yet: Proceeding to editor. You can add subtitles manually, upload a file, or generate with AI.";
       toast({ title: "No Subtitles Yet", description: msg, variant: "default" });
       addLog(msg, 'info');
    }
    if (!activeTrackId && subtitleTracks.length > 0) {
      setActiveTrackId(subtitleTracks[0].id);
      addLog(`Auto-selected first track: ${subtitleTracks[0].fileName} as active.`, 'debug');
    }
    setCurrentStep('edit');
    addLog("Navigated to Edit step.", 'debug');
  };

  const handleProceedToExport = () => {
    if (!activeTrack || activeTrack.entries.length === 0) {
      const msg = "No Subtitles to Export: The active track has no subtitles to export.";
      toast({ title: "No Subtitles to Export", description: msg, variant: "destructive"});
      addLog(msg, 'warn');
      return;
    }
    setCurrentStep('export');
    addLog("Navigated to Export step.", 'debug');
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
      const msg = "Project Reset: All media and subtitles cleared.";
      toast({ title: "Project Reset", description: msg });
      addLog(msg, 'info');
    }
    setCurrentStep('upload');
    addLog(`Navigated to Upload step. Reset: ${reset}`, 'debug');
  };

  const handleGoToEdit = () => {
    setCurrentStep('edit');
    addLog("Navigated to Edit step (from export/other).", 'debug');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload': return "Step 1 of 3: Upload Files or Generate Subtitles";
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
            <MediaUploader onMediaUpload={handleMediaUpload} disabled={isGeneratingFullTranscription} />
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
            <MediaUploader onMediaUpload={handleMediaUpload} disabled={isGeneratingFullTranscription} />
          )}
        </div>

        <div className="space-y-6 flex flex-col h-full">
          {currentStep === 'upload' && (
            <>
              <SubtitleUploader onSubtitleUpload={handleSubtitleUpload} disabled={!mediaFile || isGeneratingFullTranscription} />
              {mediaFile && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <WandSparkles className="h-6 w-6 text-accent" />
                      Generate with AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Alternatively, let AI generate subtitles for the entire media file. 
                      This may take several minutes depending on the media length.
                    </p>
                    <Button 
                      onClick={handleGenerateFullTranscription} 
                      disabled={!mediaFile || isGeneratingFullTranscription || isAnyTranscriptionLoading} 
                      className="w-full bg-accent hover:bg-accent/90"
                    >
                      {isGeneratingFullTranscription ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                        </>
                      ) : (
                        "Generate Full Subtitles with AI"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardFooter className="p-4">
                  <Button 
                    onClick={handleProceedToEdit} 
                    disabled={!mediaFile || isGeneratingFullTranscription} 
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
                      onValueChange={(trackId) => {
                        setActiveTrackId(trackId);
                        const selectedTrack = subtitleTracks.find(t => t.id === trackId);
                        addLog(`Active track changed to: ${selectedTrack?.fileName || 'None'}`, 'debug');
                      }}
                      disabled={!mediaFile || subtitleTracks.length === 0 || isGeneratingFullTranscription || isAnyTranscriptionLoading}
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
                    <Label htmlFor="transcription-language-select">Transcription Language (for AI)</Label>
                    <Select
                      value={transcriptionLanguage}
                      onValueChange={(value) => {
                        setTranscriptionLanguage(value as LanguageCode | "auto-detect");
                        localStorage.setItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, value); // Also save selection as new default for convenience
                        addLog(`Transcription language changed to: ${value}`, 'debug');
                      }}
                      disabled={!mediaFile || isGeneratingFullTranscription || isAnyTranscriptionLoading}
                    >
                      <SelectTrigger id="transcription-language-select" className="w-full">
                        <SelectValue placeholder="Select transcription language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
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
                  isAnyTranscriptionLoading={isAnyTranscriptionLoading || isGeneratingFullTranscription}
                />
              </div>
              <Card>
                <CardFooter className="p-4 flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={() => handleGoToUpload(false)} 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    disabled={isGeneratingFullTranscription || isAnyTranscriptionLoading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Uploads
                  </Button>
                  <Button 
                    onClick={handleProceedToExport} 
                    disabled={!activeTrack || !activeTrack.entries.length || isGeneratingFullTranscription || isAnyTranscriptionLoading}
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
                addLog={addLog}
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
      
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full shadow-lg"
          onClick={() => {
            setIsDebugLogDialogOpen(true);
            addLog("Debug log dialog opened.", "debug");
          }}
          aria-label="Open Debug Logs"
          title="Open Debug Logs"
        >
          <ClipboardList className="h-5 w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full shadow-lg"
          onClick={() => {
            setIsSettingsDialogOpen(true);
            addLog("Settings dialog opened.", "debug");
          }}
          aria-label="Open Settings"
          title="Open Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </div>

      <SettingsDialog 
        isOpen={isSettingsDialogOpen} 
        onClose={() => {
          setIsSettingsDialogOpen(false);
          addLog("Settings dialog closed.", "debug");
        }}
        addLog={addLog}
      />
      <DebugLogDialog
        isOpen={isDebugLogDialogOpen}
        onClose={() => {
          setIsDebugLogDialogOpen(false);
          addLog("Debug log dialog closed.", "debug");
        }}
        logs={logEntries}
        onClearLogs={clearLogs}
      />
    </div>
  );
}
