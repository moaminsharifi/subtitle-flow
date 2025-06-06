
"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { MediaFile, OpenAIModelType, SubtitleEntry, SubtitleFormat, SubtitleTrack, LanguageCode, LogEntry, Segment, AppSettings, TranscriptionProvider } from '@/lib/types';
import { LANGUAGE_OPTIONS, LANGUAGE_KEY, DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, TRANSCRIPTION_MODEL_KEY, OPENAI_TOKEN_KEY, GROQ_TOKEN_KEY, TRANSCRIPTION_PROVIDER_KEY, AVALAI_TOKEN_KEY } from '@/lib/types';
import { MediaUploader } from '@/components/media-uploader';
import { useToast } from '@/hooks/use-toast';
import { transcribeAudioSegment } from '@/ai/flows/transcribe-segment-flow';
import { sliceAudioToDataURI } from '@/lib/subtitle-utils';
import { useTranslation } from '@/contexts/LanguageContext';

// New Page Layout Components
import { PageHeader } from '@/components/page/PageHeader';
import { MediaDisplay } from '@/components/page/MediaDisplay';
import { UploadStepControls } from '@/components/page/UploadStepControls';
import { EditStepControls } from '@/components/page/EditStepControls';
import { ExportStepControls } from '@/components/page/ExportStepControls';
import { PageActions } from '@/components/page/PageActions';


type AppStep = 'upload' | 'edit' | 'export';

interface FullTranscriptionProgress {
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  currentStage: string | null;
}

const StepContentWrapper = React.memo(({ children }: { children: React.ReactNode }) => (
  <div className="space-y-6 flex flex-col h-full animate-fade-in">
    {children}
  </div>
));
StepContentWrapper.displayName = 'StepContentWrapper';


export default function SubtitleSyncPage() {
  const { t, dir, language } = useTranslation();

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
  const [isReplacingMedia, setIsReplacingMedia] = useState<boolean>(false);

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
    addLog(t('debugLog.logsCleared') as string, "debug");
  }, [addLog, t]);

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
    document.title = t('app.title') as string;
  }, [addLog, t, language]);

  const activeTrack = useMemo(() => {
    return subtitleTracks.find(track => track.id === activeTrackId) || null;
  }, [subtitleTracks, activeTrackId]);

  const handleMediaUpload = useCallback((file: File, url: string, type: 'audio' | 'video', duration: number) => {
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

    const message = t('toast.mediaLoadedDescription', { fileName: file.name, type, duration: duration.toFixed(2) });
    toast({ title: t('toast.mediaLoaded') as string, description: message as string, duration: 5000 });
    addLog(message as string, 'success');
    setIsReplacingMedia(false);
  }, [addLog, t, toast]);

  const handleSubtitleUpload = useCallback((entries: SubtitleEntry[], fileName: string, format: SubtitleFormat) => {
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
    const message = t('toast.subtitleTrackLoadedDescription', { fileName, format: format.toUpperCase(), count: entries.length });
    toast({ title: t('toast.subtitleTrackLoaded') as string, description: message as string, duration: 5000 });
    addLog(message as string, 'success');
  }, [addLog, t, toast]);

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

  const handleSubtitleAdd = useCallback(() => {
    if (!activeTrackId || !activeTrack) {
      const msg = t('toast.noActiveTrackDescription');
      toast({ title: t('toast.noActiveTrack') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'warn');
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
                const errorMsg = t('toast.errorAddingSubtitle.atEnd', { startTime: sTime.toFixed(3), endTime: eTime.toFixed(3) });
                toast({ title: t('toast.errorAddingSubtitle') as string, description: errorMsg as string, variant: "destructive", duration: 5000});
                addLog(errorMsg as string, 'error');
                return;
             }
             sTime = Math.max(0, mediaDur - 0.1);
             eTime = mediaDur;
             if (sTime < 0) sTime = 0;
             if (eTime <= sTime && mediaDur > 0) {
                 const errorMsg = t('toast.errorAddingSubtitle.invalidRange', { startTime: sTime.toFixed(3), endTime: eTime.toFixed(3), duration: mediaFile?.duration.toFixed(3) || 'N/A' });
                 toast({ title: t('toast.errorAddingSubtitle') as string, description: errorMsg as string, variant: "destructive", duration: 5000});
                 addLog(errorMsg as string, 'error');
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
        const errorMsg = t('toast.errorAddingSubtitle.invalidRange', { startTime: finalStartTime.toFixed(3), endTime: finalEndTime.toFixed(3), duration: mediaFile?.duration.toFixed(3) || 'N/A' });
        toast({ title: t('toast.errorAddingSubtitle') as string, description: errorMsg as string, variant: "destructive", duration: 5000});
        addLog(errorMsg as string, 'error');
        return;
    }

    const newEntry: SubtitleEntry = {
      id: newId,
      startTime: finalStartTime,
      endTime: finalEndTime,
      text: t('subtitleEditor.newSubtitleTextPlaceholder') as string,
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
    const successMsg = t('toast.subtitleAddedDescription', { startTime: finalStartTime.toFixed(3), endTime: finalEndTime.toFixed(3) });
    toast({ title: t('toast.subtitleAdded') as string, description: successMsg as string, duration: 5000 });
    addLog(successMsg as string, 'success');
  }, [activeTrack, activeTrackId, currentPlayerTime, mediaFile, t, toast, addLog]);

  const handleSubtitleDelete = useCallback((entryId: string) => {
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
    const message = t('toast.subtitleDeletedDescriptionSimple', {entryId});
    toast({ title: t('toast.subtitleDeleted') as string, description: t('toast.subtitleDeletedDescription') as string, duration: 5000});
    addLog(message as string, 'info');
  }, [activeTrackId, t, toast, addLog]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentPlayerTime(time);
  }, []);

  const handleShiftTime = useCallback((offset: number) => {
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
    const message = t('toast.subtitlesShiftedDescription', { offset: offset.toFixed(1), trackName: activeTrack.fileName });
    toast({ title: t('toast.subtitlesShifted') as string, description: message as string, duration: 5000 });
    addLog(message as string, 'info');
  }, [activeTrackId, activeTrack, mediaFile, t, toast, addLog]);

  const getAppSettings = useCallback((): AppSettings => {
    const openAIToken = localStorage.getItem(OPENAI_TOKEN_KEY) || undefined;
    const groqToken = localStorage.getItem(GROQ_TOKEN_KEY) || undefined;
    const transcriptionProvider = (localStorage.getItem(TRANSCRIPTION_PROVIDER_KEY) as TranscriptionProvider | null) || 'openai';
    const avalaiToken = localStorage.getItem(AVALAI_TOKEN_KEY) || undefined;
    const openAIModel = (localStorage.getItem(TRANSCRIPTION_MODEL_KEY) as OpenAIModelType | null) || 'whisper-1'; // Use new key
    const defaultTranscriptionLanguage = (localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null) || "auto-detect";
    
    return {
      openAIToken,
      groqToken,
      transcriptionProvider,
      avalaiToken,
      transcriptionModel: openAIModel,
      defaultTranscriptionLanguage,
    
    };
  }, []);


  const handleRegenerateTranscription = useCallback(async (entryId: string) => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription) {
      const msg = t('toast.transcriptionBusyDescription');
      toast({ title: t('toast.transcriptionBusy') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'warn');
      return;
    }

    addLog(`Transcription regeneration started for entry ID: ${entryId}.`, 'debug');
    if (!mediaFile || !activeTrack) {
      const msg = t('toast.transcriptionError.mediaOrTrackMissing');
      toast({ title: t('toast.transcriptionError.generic') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'error');
      return;
    }

    const entry = activeTrack.entries.find(e => e.id === entryId);
    if (!entry) {
      const msg = t('toast.transcriptionError.entryNotFound', { entryId });
      toast({ title: t('toast.transcriptionError.generic') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'error');
      return;
    }

    const appSettings = getAppSettings();
    const selectedOpenAIModel = appSettings.openAIModel || 'whisper-1';


    if (appSettings.transcriptionProvider === 'openai' && !appSettings.openAIToken) {
      const msg = t('toast.openAITokenMissingDescription');
      toast({ title: t('toast.openAITokenMissing') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'error');
      return;
    }
    if (appSettings.transcriptionProvider === 'avalai' && !appSettings.avalaiToken) {
      const msg = t('toast.avalaiTokenMissingDescription');
      toast({ title: t('toast.avalaiTokenMissing') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'error');
      return;
    }

    const langForSegment = editorTranscriptionLanguage === "auto-detect" ? undefined : editorTranscriptionLanguage;
    addLog(`Using Provider: ${appSettings.transcriptionProvider}, Model: ${selectedOpenAIModel}, Language (for segment): ${langForSegment || 'auto-detect'}. Segment: ${entry.startTime.toFixed(3)}s - ${entry.endTime.toFixed(3)}s.`, 'debug');

    setEntryTranscriptionLoading(prev => ({ ...prev, [entryId]: true }));
    setIsAnyTranscriptionLoading(true);

    try {
      const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, entry.startTime, entry.endTime);
      addLog(`Audio segment sliced for transcription (entry ID: ${entryId}). Data URI length: ${audioDataUri.length}`, 'debug');

      const result = await transcribeAudioSegment({
        audioDataUri,
        openAIModel: selectedOpenAIModel,
        language: langForSegment,
      }, appSettings);

      const regeneratedText = result.segments.map(s => s.text).join(' ').trim() || result.fullText;

      if (regeneratedText) {
        handleSubtitleChange(entryId, { text: regeneratedText });
        const successMsg = t('toast.transcriptionUpdatedDescription', { entryId, model: selectedOpenAIModel, text: regeneratedText.substring(0, 30) });
        toast({ title: t('toast.transcriptionUpdated') as string, description: successMsg as string, duration: 5000 });
        addLog(successMsg as string, 'success');
      } else {
        const warnMsg = t('toast.transcriptionPotentiallyFailedDescription', { entryId });
        toast({ title: t('toast.transcriptionPotentiallyFailed') as string, description: warnMsg as string, variant: "destructive", duration: 5000 });
        addLog(warnMsg as string, 'warn');
         handleSubtitleChange(entryId, { text: "" });
      }
    } catch (error: any) {
      console.error("Transcription regeneration error:", error);
      const errorMsgKey = 'toast.transcriptionError.genericDescription';
      const errorMsg = t(errorMsgKey, { entryId, errorMessage: error.message || "Failed to regenerate transcription."});
      toast({ title: t('toast.transcriptionError.generic') as string, description: errorMsg as string, variant: "destructive", duration: 5000 });
      addLog(errorMsg as string, 'error');
    } finally {
      setEntryTranscriptionLoading(prev => ({ ...prev, [entryId]: false }));
      setIsAnyTranscriptionLoading(false);
      addLog(`Transcription regeneration finished for entry ID: ${entryId}.`, 'debug');
    }
  }, [isAnyTranscriptionLoading, isGeneratingFullTranscription, mediaFile, activeTrack, editorTranscriptionLanguage, getAppSettings, t, toast, addLog, handleSubtitleChange]);

  const handleGenerateFullTranscription = useCallback(async () => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription) {
      const msg = t('toast.transcriptionBusyDescription');
      toast({ title: t('toast.transcriptionBusy') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'warn');
      return;
    }
    if (!mediaFile) {
      const msg = t('toast.fullTranscriptionError.noMedia');
      toast({ title: t('toast.fullTranscriptionError.generic') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'error');
      return;
    }

    const appSettings = getAppSettings();
    const selectedOpenAIModel = appSettings.openAIModel || 'whisper-1';

    if (appSettings.transcriptionProvider === 'openai' && !appSettings.openAIToken) {
      const msg = t('toast.openAITokenMissingDescription');
      toast({ title: t('toast.openAITokenMissing') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'error');
      return;
    }
    if (appSettings.transcriptionProvider === 'avalai' && !appSettings.avalaiToken) {
      const msg = t('toast.avalaiTokenMissingDescription');
      toast({ title: t('toast.avalaiTokenMissing') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'error');
      return;
    }
    
    const langForFullTranscription = fullTranscriptionLanguageOverride === "auto-detect" ? undefined : fullTranscriptionLanguageOverride;

    addLog(`Starting full media transcription with provider: ${appSettings.transcriptionProvider}, model: ${selectedOpenAIModel}, Language (override): ${langForFullTranscription || 'auto-detect'}. Media: ${mediaFile.name}`, 'info');
    setIsGeneratingFullTranscription(true);

    const allSubtitleEntries: SubtitleEntry[] = [];
    // Use the max segment duration from app settings, default to 60 seconds if not set
    const maxSegmentDuration = appSettings.maxSegmentDuration || 60;
    const numChunks = Math.ceil(mediaFile.duration / maxSegmentDuration);
    setFullTranscriptionProgress({ currentChunk: 0, totalChunks: numChunks, percentage: 0, currentStage: null });

    try {
      for (let i = 0; i < numChunks; i++) {
        const chunkStartTime = i * maxSegmentDuration;
        const chunkEndTime = Math.min((i + 1) * maxSegmentDuration, mediaFile.duration);

        if (chunkStartTime >= chunkEndTime) continue;

        const baseProgress = {
          currentChunk: i + 1,
          totalChunks: numChunks,
          percentage: Math.round(((i) / numChunks) * 100),
        };

        setFullTranscriptionProgress({ ...baseProgress, currentStage: t('aiGenerator.progress.stage.slicing') as string });
        const slicingMsg = t('toast.fullTranscriptionProgress.slicing', { currentChunk: i + 1, totalChunks: numChunks, startTime: chunkStartTime.toFixed(1), endTime: chunkEndTime.toFixed(1) });
        addLog(slicingMsg as string, 'debug');
        toast({ title: t('aiGenerator.progress.inProgress') as string, description: slicingMsg as string, duration: 2000});

        const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, chunkStartTime, chunkEndTime);
        addLog(`Audio chunk ${i+1} sliced. Data URI length: ${audioDataUri.length}`, 'debug');

        setFullTranscriptionProgress({ ...baseProgress, currentStage: t('aiGenerator.progress.stage.transcribing') as string });
        const transcribingMsg = t('toast.fullTranscriptionProgress.transcribing', { currentChunk: i + 1, totalChunks: numChunks, model: selectedOpenAIModel });
        addLog(transcribingMsg as string, 'debug');
        toast({ title: t('aiGenerator.progress.inProgress') as string, description: transcribingMsg as string, duration: 2000 });

        const result = await transcribeAudioSegment({
          audioDataUri,
          openAIModel: selectedOpenAIModel,
          language: langForFullTranscription,
        }, appSettings);

        setFullTranscriptionProgress({ ...baseProgress, currentStage: t('aiGenerator.progress.stage.processing') as string });
        const processingMsg = t('toast.fullTranscriptionProgress.processing', { currentChunk: i + 1 });
        addLog(processingMsg as string, 'debug');
        toast({ title: t('aiGenerator.progress.inProgress') as string, description: processingMsg as string, duration: 2000 });
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
           addLog(`Chunk ${i+1} (GPT-4o like model or provider without segments): Added as a single entry for the chunk.`, 'debug');
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
      const providerSuffix = appSettings.transcriptionProvider || 'ai';
      const newTrackFileName = `${mediaFile.name.substring(0, mediaFile.name.lastIndexOf('.') || mediaFile.name.length)} - ${providerSuffix}-${selectedOpenAIModel}-${trackLangSuffix}.srt`;
      const newTrack: SubtitleTrack = {
        id: newTrackId,
        fileName: newTrackFileName,
        format: 'srt',
        entries: allSubtitleEntries,
      };

      setSubtitleTracks(prevTracks => [...prevTracks, newTrack]);
      setActiveTrackId(newTrackId);

      const successMsg = t('toast.fullTranscriptionCompleteDescription', { trackName: newTrackFileName, count: allSubtitleEntries.length });
      toast({ title: t('toast.fullTranscriptionComplete') as string, description: successMsg as string, duration: 5000 });
      addLog(successMsg as string, 'success');

      setCurrentStep('edit');
      addLog("Automatically navigated to Edit step after full transcription.", 'debug');

    } catch (error: any) {
      console.error("Full transcription error:", error);
      const errorMsg = t('toast.fullTranscriptionError.genericDescription', { errorMessage: error.message || "Failed to generate full transcription."});
      toast({ title: t('toast.fullTranscriptionError.generic') as string, description: errorMsg as string, variant: "destructive", duration: 5000 });
      addLog(errorMsg as string, 'error');
    } finally {
      setIsGeneratingFullTranscription(false);
      setFullTranscriptionProgress(null);
      addLog("Full media transcription process finished.", 'debug');
    }
  }, [isAnyTranscriptionLoading, isGeneratingFullTranscription, mediaFile, fullTranscriptionLanguageOverride, getAppSettings, t, toast, addLog]);

  const isEntryTranscribing = (entryId: string): boolean => {
    return !!entryTranscriptionLoading[entryId];
  };

  const editorDisabled = !mediaFile || !activeTrack || isGeneratingFullTranscription || isAnyTranscriptionLoading;

  const handleProceedToEdit = useCallback(() => {
    if (!mediaFile) {
      const msg = t('toast.mediaRequiredDescription');
      toast({ title: t('toast.mediaRequired') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'warn');
      return;
    }
    if (subtitleTracks.length === 0) {
       const msg = t('toast.subtitlesRequiredDescription');
       toast({ title: t('toast.subtitlesRequired') as string, description: msg as string, variant: "destructive", duration: 5000 });
       addLog(msg as string, 'warn');
       return;
    }
    if (!activeTrackId && subtitleTracks.length > 0) {
      setActiveTrackId(subtitleTracks[0].id);
      addLog(`Auto-selected first track: ${subtitleTracks[0].fileName} as active.`, 'debug');
    }
    setCurrentStep('edit');
    addLog("Navigated to Edit step.", 'debug');
  }, [mediaFile, subtitleTracks, activeTrackId, t, toast, addLog]);

  const handleProceedToExport = useCallback(() => {
    if (!activeTrack || activeTrack.entries.length === 0) {
      const msg = t('toast.noSubtitlesToExportDescription');
      toast({ title: t('toast.noSubtitlesToExport') as string, description: msg as string, variant: "destructive", duration: 5000});
      addLog(msg as string, 'warn');
      return;
    }
    setCurrentStep('export');
    addLog("Navigated to Export step.", 'debug');
  }, [activeTrack, t, toast, addLog]);

  const handleSeekPlayer = useCallback((timeInSeconds: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = timeInSeconds;
      if (playerRef.current.paused) {
        playerRef.current.play();
      }
    }
    addLog(`Seeked player to ${timeInSeconds.toFixed(3)} seconds.`, 'debug');
  }, [addLog]);

  const handleGoToUpload = useCallback((reset: boolean = false) => {
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
      const msg = t('toast.projectResetDescription');
      toast({ title: t('toast.projectReset') as string, description: msg as string, duration: 5000 });
      addLog(msg as string, 'info');
    }
    setCurrentStep('upload');
    setIsReplacingMedia(false);
    addLog(`Navigated to Upload step. Reset: ${reset}`, 'debug');
  }, [t, toast, addLog]);

  const handleGoToEdit = useCallback(() => {
    setCurrentStep('edit');
    addLog("Navigated to Edit step (from export/other).", 'debug');
  }, [addLog]);

  const getStepTitle = useCallback(() => {
    switch (currentStep) {
      case 'upload': return t('page.steps.upload') as string;
      case 'edit': return t('page.steps.edit') as string;
      case 'export': return t('page.steps.export') as string;
      default: return t('app.title') as string;
    }
  }, [currentStep, t]);

  const handleFullTranscriptionLanguageChange = useCallback((value: string) => {
    const lang = value as LanguageCode | "auto-detect";
    setFullTranscriptionLanguageOverride(lang);
    addLog(`Full transcription language override set to: ${lang}`, 'debug');
  }, [addLog]);
  
  const handleSettingsDialogClose = useCallback(() => {
    const savedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
    if (savedDefaultLang) {
        if (editorTranscriptionLanguage !== savedDefaultLang) {
            setEditorTranscriptionLanguage(savedDefaultLang);
            addLog(`Editor transcription language updated from settings change: ${savedDefaultLang}`, "debug");
        }
        if (fullTranscriptionLanguageOverride !== savedDefaultLang && currentStep === 'upload') {
            setFullTranscriptionLanguageOverride(savedDefaultLang);
            addLog(`Full transcription override language updated from settings change: ${savedDefaultLang}`, "debug");
        }
    } else {
        if (editorTranscriptionLanguage !== "auto-detect") {
            setEditorTranscriptionLanguage("auto-detect");
            addLog("Editor transcription language reset to 'auto-detect' as default was cleared.", "debug");
        }
        if (fullTranscriptionLanguageOverride !== "auto-detect" && currentStep === 'upload') {
            setFullTranscriptionLanguageOverride("auto-detect");
            addLog("Full transcription override language reset to 'auto-detect' as default was cleared.", "debug");
        }
    }
  }, [editorTranscriptionLanguage, fullTranscriptionLanguageOverride, currentStep, addLog]);


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 bg-background text-foreground relative">
      <PageHeader appTitle={t('app.title') as string} stepTitle={getStepTitle()} />

      <main className="flex-grow flex flex-col gap-6">
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6 flex flex-col h-full">
            {currentStep === 'upload' && !mediaFile && (
              <div className="h-full">
                <MediaUploader
                  onMediaUpload={handleMediaUpload}
                  disabled={isGeneratingFullTranscription}
                  className="flex flex-col flex-grow h-full"
                />
              </div>
            )}
            {mediaFile && (
              <MediaDisplay
                mediaFile={mediaFile}
                activeSubtitlesToDisplay={activeTrack ? activeTrack.entries : []}
                onTimeUpdate={handleTimeUpdate}
                onShiftTime={handleShiftTime}
                playerRef={playerRef}
                currentStep={currentStep}
                isReplacingMedia={isReplacingMedia}
                setIsReplacingMedia={setIsReplacingMedia}
                onMediaUpload={handleMediaUpload}
                isGeneratingFullTranscription={isGeneratingFullTranscription}
                addLog={addLog}
                t={t}
                dir={dir}
              />
            )}
          </div>

          <StepContentWrapper key={currentStep}>
            {currentStep === 'upload' && (
              <UploadStepControls
                handleSubtitleUpload={handleSubtitleUpload}
                mediaFile={mediaFile}
                isGeneratingFullTranscription={isGeneratingFullTranscription}
                isAnyTranscriptionLoading={isAnyTranscriptionLoading}
                isReplacingMedia={isReplacingMedia}
                fullTranscriptionLanguageOverride={fullTranscriptionLanguageOverride}
                handleFullTranscriptionLanguageChange={handleFullTranscriptionLanguageChange}
                fullTranscriptionProgress={fullTranscriptionProgress}
                handleGenerateFullTranscription={handleGenerateFullTranscription}
                handleProceedToEdit={handleProceedToEdit}
                t={t}
                dir={dir}
                subtitleTracksLength={subtitleTracks.length}
              />
            )}

            {currentStep === 'edit' && (
              <EditStepControls
                activeTrackId={activeTrackId}
                subtitleTracks={subtitleTracks}
                setActiveTrackId={setActiveTrackId}
                editorTranscriptionLanguage={editorTranscriptionLanguage}
                setEditorTranscriptionLanguage={setEditorTranscriptionLanguage}
                mediaFile={mediaFile}
                isGeneratingFullTranscription={isGeneratingFullTranscription}
                isAnyTranscriptionLoading={isAnyTranscriptionLoading}
                activeTrack={activeTrack}
                handleSubtitleChange={handleSubtitleChange}
                handleSubtitleAdd={handleSubtitleAdd}
                handleSubtitleDelete={handleSubtitleDelete}
                handleRegenerateTranscription={handleRegenerateTranscription}
                isEntryTranscribing={isEntryTranscribing}
                currentPlayerTime={currentPlayerTime}
                editorDisabled={editorDisabled}
                handleGoToUpload={handleGoToUpload}
 handleSeekPlayer={handleSeekPlayer}
                handleProceedToExport={handleProceedToExport}
                addLog={addLog}
                t={t}
                dir={dir}
              />
            )}

            {currentStep === 'export' && (
              <ExportStepControls
                activeTrack={activeTrack}
                handleGoToEdit={handleGoToEdit}
                handleGoToUpload={handleGoToUpload}
                addLog={addLog}
                t={t}
                dir={dir}
              />
            )}
          </StepContentWrapper>
        </div>
      </main>
      
      <PageActions
        isSettingsDialogOpen={isSettingsDialogOpen}
        setIsSettingsDialogOpen={setIsSettingsDialogOpen}
        isDebugLogDialogOpen={isDebugLogDialogOpen}
        setIsDebugLogDialogOpen={setIsDebugLogDialogOpen}
        isCheatsheetDialogOpen={isCheatsheetDialogOpen}
        setIsCheatsheetDialogOpen={setIsCheatsheetDialogOpen}
        logEntries={logEntries}
        clearLogs={clearLogs}
        addLog={addLog}
        t={t}
        onSettingsDialogClose={handleSettingsDialogClose}
      />
    </div>
  );
}
