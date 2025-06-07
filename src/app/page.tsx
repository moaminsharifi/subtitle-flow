
"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { MediaFile, SubtitleEntry, SubtitleFormat, SubtitleTrack, LanguageCode, LogEntry, AppSettings, TranscriptionProvider, LLMProviderType, TranscriptionModelType, LLMModelType } from '@/lib/types';
import { 
  LANGUAGE_OPTIONS, LANGUAGE_KEY, DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, 
  TRANSCRIPTION_MODEL_KEY, TRANSCRIPTION_PROVIDER_KEY, 
  LLM_MODEL_KEY, LLM_PROVIDER_KEY,
  OPENAI_TOKEN_KEY, AVALAI_TOKEN_KEY, GOOGLE_API_KEY_KEY, GROQ_TOKEN_KEY, // Added GROQ_TOKEN_KEY back
  MAX_SEGMENT_DURATION_KEY, TEMPERATURE_KEY 
} from '@/lib/types';
// MediaUploader is no longer directly used here for initial upload
import { useToast } from '@/hooks/use-toast';
import { runTranscriptionTask } from '@/ai/tasks/run-transcription-task';
import { sliceAudioToDataURI } from '@/lib/subtitle-utils';
import { useTranslation } from '@/contexts/LanguageContext';

// New Page Layout Components
import { PageHeader } from '@/components/page/PageHeader';
import { MediaDisplay } from '@/components/page/MediaDisplay';
import { UploadStepControls } from '@/components/page/UploadStepControls';
import { EditStepControls } from '@/components/page/EditStepControls';
import { ExportStepControls } from '@/components/page/ExportStepControls';
import { PageActions } from '@/components/page/PageActions';
import { StepContentWrapper } from '@/components/page/StepContentWrapper'; // Import new component


type AppStep = 'upload' | 'edit' | 'export';

interface FullTranscriptionProgress {
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  currentStage: string | null;
  chunkProgress?: number; // Progress within the current chunk
  chunkMessage?: string; // Message for current chunk progress
}

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
  
  const [editorLLMLanguage, setEditorLLMLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
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
      setEditorLLMLanguage(savedDefaultLang); 
      setFullTranscriptionLanguageOverride(savedDefaultLang); 
      addLog(`Default transcription language initialized from settings: ${savedDefaultLang}`, "debug");
    } else {
      setEditorLLMLanguage("auto-detect");
      setFullTranscriptionLanguageOverride("auto-detect");
      addLog("No default transcription language in settings, using 'auto-detect'.", "debug");
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
    setIsReplacingMedia(false); // Ensure this is reset after upload
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
    return {
      openAIToken: localStorage.getItem(OPENAI_TOKEN_KEY) || undefined,
      avalaiToken: localStorage.getItem(AVALAI_TOKEN_KEY) || undefined,
      googleApiKey: localStorage.getItem(GOOGLE_API_KEY_KEY) || undefined,
      groqToken: localStorage.getItem(GROQ_TOKEN_KEY) || undefined,
      
      transcriptionProvider: (localStorage.getItem(TRANSCRIPTION_PROVIDER_KEY) as TranscriptionProvider | null) || 'openai',
      transcriptionModel: (localStorage.getItem(TRANSCRIPTION_MODEL_KEY) as TranscriptionModelType | null) || 'whisper-1',
      
      llmProvider: (localStorage.getItem(LLM_PROVIDER_KEY) as LLMProviderType | null) || 'openai',
      llmModel: (localStorage.getItem(LLM_MODEL_KEY) as LLMModelType | null) || 'gpt-4o-mini',
      
      defaultTranscriptionLanguage: (localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null) || "auto-detect",
      temperature: parseFloat(localStorage.getItem(TEMPERATURE_KEY) || '0.7'),
      maxSegmentDuration: parseInt(localStorage.getItem(MAX_SEGMENT_DURATION_KEY) || '60', 10),
    };
  }, []);

  const handleRegenerateTranscription = useCallback(async (entryId: string) => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription) {
      const msg = t('toast.transcriptionBusyDescription');
      toast({ title: t('toast.transcriptionBusy') as string, description: msg as string, variant: "destructive", duration: 5000 });
      addLog(msg as string, 'warn');
      return;
    }

    addLog(`Cue/slice transcription started for entry ID: ${entryId}.`, 'debug');
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
    const providerForCueSlice = appSettings.llmProvider || 'openai'; 
    const modelForCueSlice = appSettings.llmModel || 'gpt-4o-mini'; 

    if (providerForCueSlice === 'openai' && !appSettings.openAIToken) {
      toast({ title: t('toast.openAITokenMissing') as string, description: t('toast.openAITokenMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.openAITokenMissingDescription') as string, 'error'); return;
    }
    if (providerForCueSlice === 'avalai_openai' && !appSettings.avalaiToken) { // Changed from 'avalai'
      toast({ title: t('toast.avalaiTokenMissing') as string, description: t('toast.avalaiTokenMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.avalaiTokenMissingDescription') as string, 'error'); return;
    }
    if (providerForCueSlice === 'googleai' && !appSettings.googleApiKey) {
      toast({ title: t('toast.googleApiKeyMissing') as string, description: t('toast.googleApiKeyMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.googleApiKeyMissingDescription') as string, 'error'); return;
    }
    if (providerForCueSlice === 'avalai_gemini' && !appSettings.googleApiKey) { // For AvalAI Gemini, still check Google API key as per current setup
        toast({ title: t('toast.googleApiKeyMissingForAvalAI') as string, description: t('toast.googleApiKeyMissingForAvalAIDescription') as string, variant: "destructive" });
        addLog(t('toast.googleApiKeyMissingForAvalAIDescription') as string, 'error'); return;
    }
    if (providerForCueSlice === 'groq' && !appSettings.groqToken) {
      toast({ title: t('toast.groqTokenMissing') as string, description: t('toast.groqTokenMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.groqTokenMissingDescription') as string, 'error'); return;
    }
    
    const langForSegment = editorLLMLanguage === "auto-detect" ? undefined : editorLLMLanguage;
    addLog(`Using Provider (for cue/slice): ${providerForCueSlice}, Model: ${modelForCueSlice}, Language: ${langForSegment || 'auto-detect'}. Segment: ${entry.startTime.toFixed(3)}s - ${entry.endTime.toFixed(3)}s.`, 'debug');

    setEntryTranscriptionLoading(prev => ({ ...prev, [entryId]: true }));
    setIsAnyTranscriptionLoading(true);

    try {
      const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, entry.startTime, entry.endTime);
      addLog(`Audio segment sliced for cue/slice transcription (entry ID: ${entryId}).`, 'debug');

      const result = await runTranscriptionTask({
        audioDataUri,
        provider: providerForCueSlice,
        modelName: modelForCueSlice,
        language: langForSegment,
        task: 'cue_slice',
        appSettings,
      });

      const regeneratedText = result.fullText.trim();

      if (regeneratedText) {
        handleSubtitleChange(entryId, { text: regeneratedText });
        const successMsg = t('toast.transcriptionUpdatedDescription', { entryId, model: modelForCueSlice, text: regeneratedText.substring(0, 30) });
        toast({ title: t('toast.transcriptionUpdated') as string, description: successMsg as string, duration: 5000 });
        addLog(successMsg as string, 'success');
      } else {
        const warnMsg = t('toast.transcriptionPotentiallyFailedDescription', { entryId });
        toast({ title: t('toast.transcriptionPotentiallyFailed') as string, description: warnMsg as string, variant: "destructive", duration: 5000 });
        addLog(warnMsg as string, 'warn');
        handleSubtitleChange(entryId, { text: "" });
      }
    } catch (error: any) {
      console.error("Cue/slice transcription error:", error);
      const errorMsgKey = 'toast.transcriptionError.genericDescription';
      const errorMsg = t(errorMsgKey, { entryId, errorMessage: error.message || "Failed to regenerate transcription for cue."});
      toast({ title: t('toast.transcriptionError.generic') as string, description: errorMsg as string, variant: "destructive", duration: 5000 });
      addLog(errorMsg as string, 'error');
    } finally {
      setEntryTranscriptionLoading(prev => ({ ...prev, [entryId]: false }));
      setIsAnyTranscriptionLoading(false);
      addLog(`Cue/slice transcription finished for entry ID: ${entryId}.`, 'debug');
    }
  }, [isAnyTranscriptionLoading, isGeneratingFullTranscription, mediaFile, activeTrack, editorLLMLanguage, getAppSettings, t, toast, addLog, handleSubtitleChange]);

  const handleGenerateFullTranscription = useCallback(async () => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription) {
      toast({ title: t('toast.transcriptionBusy') as string, description: t('toast.transcriptionBusyDescription') as string, variant: "destructive" });
      addLog(t('toast.transcriptionBusyDescription') as string, 'warn'); return;
    }
    if (!mediaFile) {
      toast({ title: t('toast.fullTranscriptionError.generic') as string, description: t('toast.fullTranscriptionError.noMedia') as string, variant: "destructive" });
      addLog(t('toast.fullTranscriptionError.noMedia') as string, 'error'); return;
    }

    const appSettings = getAppSettings();
    const providerForFull = appSettings.transcriptionProvider || 'openai';
    const modelForFull = appSettings.transcriptionModel || 'whisper-1';

    if (providerForFull === 'openai' && !appSettings.openAIToken) {
      toast({ title: t('toast.openAITokenMissing') as string, description: t('toast.openAITokenMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.openAITokenMissingDescription') as string, 'error'); return;
    }
    if (providerForFull === 'avalai_openai' && !appSettings.avalaiToken) { // Changed from 'avalai'
      toast({ title: t('toast.avalaiTokenMissing') as string, description: t('toast.avalaiTokenMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.avalaiTokenMissingDescription') as string, 'error'); return;
    }
    if (providerForFull === 'groq' && !appSettings.groqToken) {
      toast({ title: t('toast.groqTokenMissing') as string, description: t('toast.groqTokenMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.groqTokenMissingDescription') as string, 'error'); return;
    }
        
    const langForFull = fullTranscriptionLanguageOverride === "auto-detect" ? undefined : fullTranscriptionLanguageOverride;
    addLog(`Starting full media timestamp transcription with provider: ${providerForFull}, model: ${modelForFull}, Language: ${langForFull || 'auto-detect'}. Media: ${mediaFile.name}`, 'info');
    setIsGeneratingFullTranscription(true);

    const allSubtitleEntries: SubtitleEntry[] = [];
    const maxSegmentDuration = appSettings.maxSegmentDuration || 60;
    const numChunks = Math.ceil(mediaFile.duration / maxSegmentDuration);
    setFullTranscriptionProgress({ currentChunk: 0, totalChunks: numChunks, percentage: 0, currentStage: null });

    try {
      for (let i = 0; i < numChunks; i++) {
        const chunkStartTime = i * maxSegmentDuration;
        const chunkEndTime = Math.min((i + 1) * maxSegmentDuration, mediaFile.duration);

        if (chunkStartTime >= chunkEndTime) continue;

        const chunkProgressCallback = (progress: number, message: string) => {
          setFullTranscriptionProgress(prev => ({
            ...prev!,
            percentage: Math.round(((i + progress / 100) / numChunks) * 100),
            chunkProgress: progress,
            chunkMessage: message,
          }));
        };
        
        setFullTranscriptionProgress(prev => ({ 
            ...prev!, 
            currentChunk: i + 1,
            totalChunks: numChunks,
            percentage: Math.round(((i) / numChunks) * 100),
            currentStage: t('aiGenerator.progress.stage.slicing') as string,
            chunkProgress: 0,
            chunkMessage: '',
        }));
        
        const slicingMsg = t('toast.fullTranscriptionProgress.slicing', { currentChunk: i + 1, totalChunks: numChunks, startTime: chunkStartTime.toFixed(1), endTime: chunkEndTime.toFixed(1) });
        addLog(slicingMsg as string, 'debug');
        
        const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, chunkStartTime, chunkEndTime);
        addLog(`Audio chunk ${i+1} sliced.`, 'debug');

        setFullTranscriptionProgress(prev => ({ ...prev!, currentStage: t('aiGenerator.progress.stage.transcribing') as string }));
        const transcribingMsg = t('toast.fullTranscriptionProgress.transcribing', { currentChunk: i + 1, totalChunks: numChunks, model: modelForFull });
        addLog(transcribingMsg as string, 'debug');

        const result = await runTranscriptionTask({
          audioDataUri,
          provider: providerForFull,
          modelName: modelForFull,
          language: langForFull,
          task: 'timestamp',
          appSettings,
        }, chunkProgressCallback);
        
        setFullTranscriptionProgress(prev => ({ ...prev!, currentStage: t('aiGenerator.progress.stage.processing') as string, chunkProgress: 0, chunkMessage: '' }));
        const processingMsg = t('toast.fullTranscriptionProgress.processing', { currentChunk: i + 1 });
        addLog(processingMsg as string, 'debug');
        addLog(`Chunk ${i+1} transcribed. Segments: ${result.segments?.length || 0}. Full text: "${result.fullText.substring(0,50)}..."`, 'debug');

        if (result.segments && result.segments.length > 0) {
          result.segments.forEach(segment => {
            allSubtitleEntries.push({
              id: `gen-${chunkStartTime + segment.start}-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
              startTime: parseFloat((chunkStartTime + segment.start).toFixed(3)),
              endTime: parseFloat((chunkStartTime + segment.end).toFixed(3)),
              text: segment.text,
            });
          });
        } else if (result.fullText) { 
          const warningMsg = `Timestamped segments not returned for chunk ${i+1} (${chunkStartTime.toFixed(1)}s-${chunkEndTime.toFixed(1)}s) using ${providerForFull}/${modelForFull}. Using full text for this chunk.`;
          addLog(warningMsg, 'warn');
          toast({
            title: t('toast.fullTranscriptionWarning.noTimestampsTitle') as string,
            description: t('toast.fullTranscriptionWarning.noTimestampsDescription', { chunk: i + 1, provider: providerForFull, model: modelForFull }) as string,
            variant: "destructive",
            duration: 7000
          });
          allSubtitleEntries.push({
            id: `gen-chunk-${chunkStartTime}-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
            startTime: parseFloat(chunkStartTime.toFixed(3)),
            endTime: parseFloat(chunkEndTime.toFixed(3)),
            text: result.fullText,
          });
           addLog(`Chunk ${i+1} (no segments from provider, fallback): Added as a single entry.`, 'debug');
        } else {
            const errorMsgForToast = `No output (segments or text) returned for chunk ${i+1} (${chunkStartTime.toFixed(1)}s-${chunkEndTime.toFixed(1)}s) using ${providerForFull}/${modelForFull}. Skipping chunk.`;
            addLog(errorMsgForToast, 'error');
            toast({
                title: t('toast.fullTranscriptionError.noOutputTitle') as string,
                description: t('toast.fullTranscriptionError.noOutputDescription', { chunk: i + 1, provider: providerForFull, model: modelForFull }) as string,
                variant: "destructive",
                duration: 7000
            });
        }
         setFullTranscriptionProgress(prev => ({
            ...prev!,
            percentage: Math.round(((i + 1) / numChunks) * 100),
            currentStage: null,
            chunkProgress: 100, 
            chunkMessage: 'Chunk complete',
        }));
      }

      allSubtitleEntries.sort((a, b) => a.startTime - b.startTime);

      const newTrackId = `track-generated-${Date.now()}`;
      const trackLangSuffix = langForFull || (fullTranscriptionLanguageOverride === "auto-detect" ? "auto" : fullTranscriptionLanguageOverride);
      const newTrackFileName = `${mediaFile.name.substring(0, mediaFile.name.lastIndexOf('.') || mediaFile.name.length)} - ${providerForFull}-${modelForFull}-${trackLangSuffix}.srt`;
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
      toast({ title: t('toast.mediaRequired') as string, description: t('toast.mediaRequiredDescription') as string, variant: "destructive" });
      addLog(t('toast.mediaRequiredDescription') as string, 'warn'); return;
    }
    if (subtitleTracks.length === 0) {
       toast({ title: t('toast.subtitlesRequired') as string, description: t('toast.subtitlesRequiredDescription') as string, variant: "destructive" });
       addLog(t('toast.subtitlesRequiredDescription') as string, 'warn'); return;
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
      toast({ title: t('toast.noSubtitlesToExport') as string, description: t('toast.noSubtitlesToExportDescription') as string, variant: "destructive"});
      addLog(t('toast.noSubtitlesToExportDescription') as string, 'warn'); return;
    }
    setCurrentStep('export');
    addLog("Navigated to Export step.", 'debug');
  }, [activeTrack, t, toast, addLog]);

  const handleSeekPlayer = useCallback((timeInSeconds: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = timeInSeconds;
      if (playerRef.current.paused) {
        playerRef.current.play().catch(e => console.warn("Player play on seek failed:", e));
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
      toast({ title: t('toast.projectReset') as string, description: t('toast.projectResetDescription') as string });
      addLog(t('toast.projectResetDescription') as string, 'info');
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
        if (editorLLMLanguage !== savedDefaultLang) {
            setEditorLLMLanguage(savedDefaultLang);
            addLog(`Editor LLM language updated from settings change: ${savedDefaultLang}`, "debug");
        }
        if (fullTranscriptionLanguageOverride !== savedDefaultLang && currentStep === 'upload') {
            setFullTranscriptionLanguageOverride(savedDefaultLang);
            addLog(`Full transcription language override updated from settings change: ${savedDefaultLang}`, "debug");
        }
    } else { 
        if (editorLLMLanguage !== "auto-detect") {
            setEditorLLMLanguage("auto-detect");
            addLog("Editor LLM language reset to 'auto-detect' as default was cleared.", "debug");
        }
        if (fullTranscriptionLanguageOverride !== "auto-detect" && currentStep === 'upload') {
            setFullTranscriptionLanguageOverride("auto-detect");
            addLog("Full transcription language override reset to 'auto-detect' as default was cleared.", "debug");
        }
    }
  }, [editorLLMLanguage, fullTranscriptionLanguageOverride, currentStep, addLog]);


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 bg-background text-foreground relative">
      <PageHeader appTitle={t('app.title') as string} stepTitle={getStepTitle()} />

      <main className="flex-grow flex flex-col gap-6">
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Media Display */}
          <div className="space-y-6 flex flex-col h-full">
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
          </div>

          {/* Column 2: Step Controls */}
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
                editorLLMLanguage={editorLLMLanguage} 
                setEditorLLMLanguage={setEditorLLMLanguage} 
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


    