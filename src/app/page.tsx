
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
import { CheatsheetDialog } from '@/components/cheatsheet-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, RotateCcw, SettingsIcon, Loader2, ClipboardList, WandSparkles, HelpCircle, Languages, FileText } from 'lucide-react';
import { transcribeAudioSegment } from '@/ai/flows/transcribe-segment-flow';
import { sliceAudioToDataURI } from '@/lib/subtitle-utils';
import { cn } from '@/lib/utils';

const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
const OPENAI_MODEL_KEY = 'app-settings-openai-model';
const DEFAULT_TRANSCRIPTION_LANGUAGE_KEY = 'app-settings-default-transcription-language';

const CHUNK_DURATION_SECONDS = 5 * 60; // 5 minutes for full transcription chunks


type AppStep = 'upload' | 'edit' | 'export';

interface FullTranscriptionProgress {
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  currentStage: string | null;
}

export default function SubtitleSyncPage() {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [currentPlayerTime, setCurrentPlayerTime] = useState(0);
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isDebugLogDialogOpen, setIsDebugLogDialogOpen] = useState(false);
  const [isCheatsheetDialogOpen, setIsCheatsheetDialogOpen] = useState(false);
  const [entryTranscriptionLoading, setEntryTranscriptionLoading] = useState<Record<string, boolean>>({});
  const [isAnyTranscriptionLoading, setIsAnyTranscriptionLoading] = useState<boolean>(false);
  const [isGeneratingFullTranscription, setIsGeneratingFullTranscription] = useState<boolean>(false);
  const [fullTranscriptionProgress, setFullTranscriptionProgress] = useState<FullTranscriptionProgress | null>(null);
  const [editorTranscriptionLanguage, setEditorTranscriptionLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const [fullTranscriptionLanguageOverride, setFullTranscriptionLanguageOverride] = useState<LanguageCode | "auto-detect">("auto-detect");
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
    setLogEntries(prevLogs => [newLogEntry, ...prevLogs.slice(0, 199)]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogEntries([]);
    addLog("Logs cleared.", "debug");
  }, [addLog]);

  useEffect(() => {
    addLog("Application initialized.", "debug");
    const savedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
    if (savedDefaultLang) {
      setEditorTranscriptionLanguage(savedDefaultLang);
      setFullTranscriptionLanguageOverride(savedDefaultLang);
      addLog(`Editor and Full Transcription language override initialized from settings: ${savedDefaultLang}`, "debug");
    } else {
      setEditorTranscriptionLanguage("auto-detect");
      setFullTranscriptionLanguageOverride("auto-detect");
      addLog("No default transcription language in settings, using 'auto-detect' for both.", "debug");
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
    const savedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
    setFullTranscriptionLanguageOverride(savedDefaultLang || "auto-detect");
    addLog(`Full transcription language override reset to settings default: ${savedDefaultLang || "auto-detect"} on new media upload.`, "debug");
    
    const message = `Media Loaded: ${file.name} (Type: ${type}, Duration: ${duration.toFixed(2)}s)`;
    toast({ title: "Media Loaded", description: message, duration: 5000 });
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
    toast({ title: "Subtitle Track Loaded", description: message, duration: 5000 });
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
      toast({ title: "No Active Track", description: msg, variant: "destructive", duration: 5000 });
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
        if (sTime >= mediaDur && mediaDur > 0) {
            sTime = Math.max(0, mediaDur - defaultCueDuration);
            eTime = mediaDur;
        } else if (eTime > mediaDur) {
             eTime = mediaDur;
        }
        
        if (eTime <= sTime && mediaDur > 0) {
             if(mediaDur - sTime < 0.001 && sTime === mediaDur) {
                const errorMsg = `Cannot add subtitle at the very end of media. Times: ${sTime.toFixed(3)}s - ${eTime.toFixed(3)}s`;
                toast({ title: "Error Adding Subtitle", description: errorMsg, variant: "destructive", duration: 5000});
                addLog(errorMsg, 'error');
                return;
             }
             sTime = Math.max(0, mediaDur - 0.1);
             eTime = mediaDur;
             if (sTime < 0) sTime = 0;
             if (eTime <= sTime && mediaDur > 0) {
                 const errorMsg = `Could not determine a valid time range at media end. Times: ${sTime.toFixed(3)}s - ${eTime.toFixed(3)}s`;
                 toast({ title: "Error Adding Subtitle", description: errorMsg, variant: "destructive", duration: 5000});
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

    if (finalEndTime <= finalStartTime) {
        const errorMsg = `Could not determine a valid time range for new subtitle. Start: ${finalStartTime.toFixed(3)}s, End: ${finalEndTime.toFixed(3)}s. Media Duration: ${mediaFile?.duration.toFixed(3)}s`;
        toast({ title: "Error Adding Subtitle", description: errorMsg, variant: "destructive", duration: 5000});
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
    toast({ title: "Subtitle Added", description: successMsg, duration: 5000 });
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
    toast({ title: "Subtitle Deleted", description: "Cue removed from active track.", duration: 5000});
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
    toast({ title: "Subtitles Shifted", description: message, duration: 5000 });
    addLog(message, 'info');
  };

  const handleRegenerateTranscription = async (entryId: string) => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription) {
      const msg = "A transcription process is already running. Please wait.";
      toast({ title: "Transcription Busy", description: msg, variant: "destructive", duration: 5000 });
      addLog(msg, 'warn');
      return;
    }

    addLog(`Transcription regeneration started for entry ID: ${entryId}.`, 'debug');
    if (!mediaFile || !activeTrack) {
      const msg = "Transcription Error: Media file or active track not found.";
      toast({ title: "Error", description: msg, variant: "destructive", duration: 5000 });
      addLog(msg, 'error');
      return;
    }

    const entry = activeTrack.entries.find(e => e.id === entryId);
    if (!entry) {
      const msg = `Transcription Error: Subtitle entry ID ${entryId} not found.`;
      toast({ title: "Error", description: msg, variant: "destructive", duration: 5000 });
      addLog(msg, 'error');
      return;
    }

    const selectedOpenAIModel = localStorage.getItem(OPENAI_MODEL_KEY) as OpenAIModelType || 'whisper-1';
    const openAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);

    if (!openAIToken) {
      const msg = "OpenAI Token Missing. Please set your OpenAI API token in Settings.";
      toast({ title: "OpenAI Token Missing", description: msg, variant: "destructive", duration: 5000 });
      addLog(msg, 'error');
      return;
    }
    
    const langForSegment = editorTranscriptionLanguage === "auto-detect" ? undefined : editorTranscriptionLanguage;
    addLog(`Using OpenAI model: ${selectedOpenAIModel}, Language (for segment): ${langForSegment || 'auto-detect'}. Segment: ${entry.startTime.toFixed(3)}s - ${entry.endTime.toFixed(3)}s.`, 'debug');
    
    setEntryTranscriptionLoading(prev => ({ ...prev, [entryId]: true }));
    setIsAnyTranscriptionLoading(true);

    try {
      const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, entry.startTime, entry.endTime);
      addLog(`Audio segment sliced for transcription (entry ID: ${entryId}). Data URI length: ${audioDataUri.length}`, 'debug');
      
      const result = await transcribeAudioSegment({
        audioDataUri,
        openAIModel: selectedOpenAIModel,
        language: langForSegment,
        openAIApiKey: openAIToken!,
      });

      const regeneratedText = result.segments.map(s => s.text).join(' ').trim() || result.fullText;

      if (regeneratedText) {
        handleSubtitleChange(entryId, { text: regeneratedText });
        const successMsg = `Transcription Updated for entry ${entryId} using ${selectedOpenAIModel}. New text: "${regeneratedText.substring(0, 30)}..."`;
        toast({ title: "Transcription Updated", description: successMsg, duration: 5000 });
        addLog(successMsg, 'success');
      } else {
        const warnMsg = `Transcription for entry ${entryId} resulted in empty text from the AI model.`;
        toast({ title: "Transcription Potentially Failed", description: warnMsg, variant: "destructive", duration: 5000 });
        addLog(warnMsg, 'warn');
         handleSubtitleChange(entryId, { text: "" });
      }
    } catch (error: any) {
      console.error("Transcription regeneration error:", error);
      const errorMsg = `Transcription Error for entry ${entryId}: ${error.message || "Failed to regenerate transcription."}`;
      toast({ title: "Transcription Error", description: errorMsg, variant: "destructive", duration: 5000 });
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
      toast({ title: "Transcription Busy", description: msg, variant: "destructive", duration: 5000 });
      addLog(msg, 'warn');
      return;
    }
    if (!mediaFile) {
      const msg = "Full Transcription Error: No media file loaded.";
      toast({ title: "Error", description: msg, variant: "destructive", duration: 5000 });
      addLog(msg, 'error');
      return;
    }

    const selectedOpenAIModel = localStorage.getItem(OPENAI_MODEL_KEY) as OpenAIModelType || 'whisper-1';
    const openAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);

    if (!openAIToken) {
      const msg = "OpenAI Token Missing. Please set your OpenAI API token in Settings.";
      toast({ title: "OpenAI Token Missing", description: msg, variant: "destructive", duration: 5000 });
      addLog(msg, 'error');
      return;
    }
    
    const langForFullTranscription = fullTranscriptionLanguageOverride === "auto-detect" ? undefined : fullTranscriptionLanguageOverride;

    addLog(`Starting full media transcription with model: ${selectedOpenAIModel}, Language (override): ${langForFullTranscription || 'auto-detect'}. Media: ${mediaFile.name}`, 'info');
    setIsGeneratingFullTranscription(true);
    
    const allSubtitleEntries: SubtitleEntry[] = [];
    const numChunks = Math.ceil(mediaFile.duration / CHUNK_DURATION_SECONDS);
    setFullTranscriptionProgress({ currentChunk: 0, totalChunks: numChunks, percentage: 0, currentStage: null });

    try {
      for (let i = 0; i < numChunks; i++) {
        const chunkStartTime = i * CHUNK_DURATION_SECONDS;
        const chunkEndTime = Math.min((i + 1) * CHUNK_DURATION_SECONDS, mediaFile.duration);
        
        if (chunkStartTime >= chunkEndTime) continue;
        
        const baseProgress = {
          currentChunk: i + 1,
          totalChunks: numChunks,
          percentage: Math.round(((i) / numChunks) * 100), 
        };

        setFullTranscriptionProgress({ ...baseProgress, currentStage: "Slicing audio..." });
        const slicingMsg = `Slicing audio for chunk ${i + 1} of ${numChunks} (${chunkStartTime.toFixed(1)}s - ${chunkEndTime.toFixed(1)}s)...`;
        addLog(slicingMsg, 'debug');
        toast({ title: "Transcription Progress", description: slicingMsg, duration: 2000});

        const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, chunkStartTime, chunkEndTime);
        addLog(`Audio chunk ${i+1} sliced. Data URI length: ${audioDataUri.length}`, 'debug');

        setFullTranscriptionProgress({ ...baseProgress, currentStage: "Transcribing with AI..." });
        const transcribingMsg = `Transcribing chunk ${i + 1} of ${numChunks} with ${selectedOpenAIModel}...`;
        addLog(transcribingMsg, 'debug');
        toast({ title: "Transcription Progress", description: transcribingMsg, duration: 2000 });

        const result = await transcribeAudioSegment({
          audioDataUri,
          openAIModel: selectedOpenAIModel,
          language: langForFullTranscription,
          openAIApiKey: openAIToken!,
        });
        
        setFullTranscriptionProgress({ ...baseProgress, currentStage: "Processing results..." });
        const processingMsg = `Processing results for chunk ${i + 1}...`;
        addLog(processingMsg, 'debug');
        toast({ title: "Transcription Progress", description: processingMsg, duration: 2000 });
        addLog(`Chunk ${i+1} transcribed. Segments received: ${result.segments.length}. Full text from chunk: "${result.fullText.substring(0,50)}..."`, 'debug');

        if (result.segments.length > 0) {
          result.segments.forEach(segment => {
            allSubtitleEntries.push({
              id: `gen-${chunkStartTime + segment.start}-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
              startTime: parseFloat((chunkStartTime + segment.start).toFixed(3)),
              endTime: parseFloat((chunkStartTime + segment.end).toFixed(3)),
              text: segment.text,
            });
          });
        } else if (result.fullText) {
          allSubtitleEntries.push({
            id: `gen-chunk-${chunkStartTime}-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
            startTime: parseFloat(chunkStartTime.toFixed(3)),
            endTime: parseFloat(chunkEndTime.toFixed(3)),
            text: result.fullText,
          });
           addLog(`Chunk ${i+1} (GPT-4o like model): Added as a single entry for the chunk.`, 'debug');
        }
         setFullTranscriptionProgress(prev => ({
            ...prev!,
            percentage: Math.round(((i + 1) / numChunks) * 100),
            currentStage: null, 
        }));
      }

      allSubtitleEntries.sort((a, b) => a.startTime - b.startTime);

      const newTrackId = `track-generated-${Date.now()}`;
      const trackLangSuffix = langForFullTranscription || (fullTranscriptionLanguageOverride === "auto-detect" ? "auto" : fullTranscriptionLanguageOverride);
      const newTrackFileName = `${mediaFile.name.substring(0, mediaFile.name.lastIndexOf('.') || mediaFile.name.length)} - ${selectedOpenAIModel}-${trackLangSuffix}.srt`;
      const newTrack: SubtitleTrack = {
        id: newTrackId,
        fileName: newTrackFileName,
        format: 'srt', 
        entries: allSubtitleEntries,
      };

      setSubtitleTracks(prevTracks => [...prevTracks, newTrack]);
      setActiveTrackId(newTrackId);
      
      const successMsg = `Full transcription complete! New track "${newTrackFileName}" added with ${allSubtitleEntries.length} cues.`;
      toast({ title: "Transcription Complete", description: successMsg, duration: 5000 });
      addLog(successMsg, 'success');
      
      setCurrentStep('edit');
      addLog("Automatically navigated to Edit step after full transcription.", 'debug');

    } catch (error: any) {
      console.error("Full transcription error:", error);
      const errorMsg = `Full Transcription Error: ${error.message || "Failed to generate full transcription."}`;
      toast({ title: "Full Transcription Error", description: errorMsg, variant: "destructive", duration: 5000 });
      addLog(errorMsg, 'error');
    } finally {
      setIsGeneratingFullTranscription(false);
      setFullTranscriptionProgress(null);
      addLog("Full media transcription process finished.", 'debug');
    }
  };
  
  const isEntryTranscribing = (entryId: string): boolean => {
    return !!entryTranscriptionLoading[entryId];
  };
  
  const editorDisabled = !mediaFile || !activeTrack || isGeneratingFullTranscription || isAnyTranscriptionLoading;

  const handleProceedToEdit = () => {
    if (!mediaFile) {
      const msg = "Media Required: Please upload a media file first.";
      toast({ title: "Media Required", description: msg, variant: "destructive", duration: 5000 });
      addLog(msg, 'warn');
      return;
    }
    if (subtitleTracks.length === 0) {
       const msg = "No Subtitles Yet: Proceeding to editor. You can add subtitles manually, upload a file, or generate with AI.";
       toast({ title: "No Subtitles Yet", description: msg, variant: "default", duration: 5000 }); 
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
      toast({ title: "No Subtitles to Export", description: msg, variant: "destructive", duration: 5000});
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
      toast({ title: "Project Reset", description: msg, duration: 5000 });
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
      case 'upload': return "Step 1 of 3: Prepare Your Media & Subtitles";
      case 'edit': return "Step 2 of 3: Edit & Refine Subtitles";
      case 'export': return "Step 3 of 3: Export Your Work";
      default: return "Subtitle Sync";
    }
  };
  
  const StepContentWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="space-y-6 flex flex-col h-full animate-fade-in" key={currentStep}>
      {children}
    </div>
  );


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 bg-background text-foreground relative">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-primary tracking-tight">Subtitle Sync</h1>
        <p className="text-muted-foreground">{getStepTitle()}</p>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Media Player / Initial Uploader Section */}
        <div className="space-y-6 flex flex-col h-full">
          {currentStep === 'upload' && !mediaFile && (
            <MediaUploader
              onMediaUpload={handleMediaUpload}
              disabled={isGeneratingFullTranscription}
              className="flex flex-col flex-grow"
            />
          )}
           {mediaFile && (
             <Card className="flex-grow shadow-lg sticky top-6 animate-fade-in"> 
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
            <MediaUploader 
              onMediaUpload={handleMediaUpload} 
              disabled={isGeneratingFullTranscription} 
            />
          )}
        </div>

        {/* Dynamic Content Section - Changes based on currentStep */}
        <StepContentWrapper>
          {currentStep === 'upload' && (
            <>
              <Card className="shadow-lg flex flex-col flex-grow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <FileText className="h-6 w-6 text-primary" />
                        Option 1: Upload Subtitle File
                    </CardTitle>
                    <CardDescription>Upload an existing .SRT or .VTT subtitle file.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SubtitleUploader onSubtitleUpload={handleSubtitleUpload} disabled={!mediaFile || isGeneratingFullTranscription} />
                </CardContent>
              </Card>
              
              <Card className={cn("shadow-lg", !mediaFile && "opacity-60 pointer-events-none")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <WandSparkles className="h-6 w-6 text-accent" />
                    Option 2: Generate with AI
                  </CardTitle>
                  <CardDescription>
                      Let AI generate subtitles for the entire media file.
                      {!mediaFile && " (Upload a media file first)"}
                      {mediaFile && " This may take several minutes."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="full-transcription-language-select" className="flex items-center gap-1 mb-1 text-sm font-medium">
                      <Languages className="h-4 w-4" />
                      Transcription Language
                    </Label>
                    <Select
                      value={fullTranscriptionLanguageOverride}
                      onValueChange={(value) => {
                        const lang = value as LanguageCode | "auto-detect";
                        setFullTranscriptionLanguageOverride(lang);
                        addLog(`Full transcription language override set to: ${lang}`, 'debug');
                      }}
                      disabled={!mediaFile || isGeneratingFullTranscription || isAnyTranscriptionLoading}
                    >
                      <SelectTrigger id="full-transcription-language-select" className="w-full" aria-label="Select transcription language for full generation">
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
                     <p className="text-xs text-muted-foreground mt-1">
                      Uses the language selected here for this generation. Initial value from Settings.
                    </p>
                  </div>
                  
                  {isGeneratingFullTranscription && fullTranscriptionProgress ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-center">
                        Transcription in progress...
                        {fullTranscriptionProgress.currentStage && ` (${fullTranscriptionProgress.currentStage})`}
                      </p>
                      <Progress value={fullTranscriptionProgress.percentage} className="w-full" />
                      <p className="text-xs text-muted-foreground text-center">
                        Chunk {fullTranscriptionProgress.currentChunk} of {fullTranscriptionProgress.totalChunks} ({fullTranscriptionProgress.percentage}%)
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleGenerateFullTranscription}
                      disabled={!mediaFile || isGeneratingFullTranscription || isAnyTranscriptionLoading}
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                      aria-label="Generate Full Subtitles with AI"
                    >
                      {isGeneratingFullTranscription ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {fullTranscriptionProgress ? `Generating (${fullTranscriptionProgress.percentage}%)` : "Generating..." }
                        </>
                      ) : (
                        "Generate Full Subtitles with AI"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Next Step</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        Once your media is loaded and you've either uploaded subtitles or chosen to generate them, proceed to the editor.
                    </p>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    onClick={handleProceedToEdit}
                    disabled={!mediaFile || isGeneratingFullTranscription}
                    className="w-full"
                    aria-label="Proceed to Edit Step"
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
                  <CardTitle className="text-lg">Track & Language Settings</CardTitle>
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
                      <SelectTrigger id="active-track-select" className="w-full" aria-label="Select active subtitle track">
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
                    {subtitleTracks.length === 0 && <p className="text-xs text-muted-foreground mt-1">No subtitle tracks loaded. Go back to Upload to add or generate one.</p>}
                  </div>
                  <div>
                    <Label htmlFor="editor-transcription-language-select" className="flex items-center gap-1 mb-1 text-sm font-medium">
                         <Languages className="h-4 w-4" />
                         Transcription Language (for AI segment regeneration)
                    </Label>
                    <Select
                      value={editorTranscriptionLanguage}
                      onValueChange={(value) => {
                        const lang = value as LanguageCode | "auto-detect";
                        setEditorTranscriptionLanguage(lang);
                        addLog(`Editor transcription language for segment regeneration set to: ${lang}`, 'debug');
                      }}
                      disabled={!mediaFile || isGeneratingFullTranscription || isAnyTranscriptionLoading}
                    >
                      <SelectTrigger id="editor-transcription-language-select" className="w-full" aria-label="Select transcription language for segment regeneration">
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
                    aria-label="Back to Uploads Step"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Uploads
                  </Button>
                  <Button
                    onClick={handleProceedToExport}
                    disabled={!activeTrack || !activeTrack.entries.length || isGeneratingFullTranscription || isAnyTranscriptionLoading}
                    className="w-full sm:flex-1"
                    aria-label="Proceed to Export Step"
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
                  <Button onClick={handleGoToEdit} variant="outline" className="w-full sm:w-auto" aria-label="Go back to Edit Step">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Edit More
                  </Button>
                  <Button onClick={() => handleGoToUpload(true)} variant="destructive" className="w-full sm:flex-1" aria-label="Start Over and Clear All Data">
                     <RotateCcw className="mr-2 h-4 w-4" /> Start Over (Clear Data)
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </StepContentWrapper>
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
            setIsCheatsheetDialogOpen(true);
            addLog("Cheatsheet dialog opened.", "debug");
          }}
          aria-label="Open Keyboard Cheatsheet"
          title="Open Keyboard Cheatsheet"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
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
          const savedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
            if (savedDefaultLang) {
                if (editorTranscriptionLanguage !== savedDefaultLang) {
                    setEditorTranscriptionLanguage(savedDefaultLang);
                    addLog(`Editor transcription language updated from settings change: ${savedDefaultLang}`, "debug");
                }
                if (fullTranscriptionLanguageOverride !== savedDefaultLang) { 
                    setFullTranscriptionLanguageOverride(savedDefaultLang);
                     addLog(`Full transcription override language updated from settings change: ${savedDefaultLang}`, "debug");
                }
            } else { 
                if (editorTranscriptionLanguage !== "auto-detect") {
                    setEditorTranscriptionLanguage("auto-detect");
                    addLog("Editor transcription language reset to 'auto-detect' as default was cleared.", "debug");
                }
                if (fullTranscriptionLanguageOverride !== "auto-detect") {
                    setFullTranscriptionLanguageOverride("auto-detect");
                    addLog("Full transcription override language reset to 'auto-detect' as default was cleared.", "debug");
                }
            }
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
      <CheatsheetDialog
        isOpen={isCheatsheetDialogOpen}
        onClose={() => {
          setIsCheatsheetDialogOpen(false);
          addLog("Cheatsheet dialog closed.", "debug");
        }}
      />
    </div>
  );
}
