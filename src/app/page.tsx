
"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { MediaFile, SubtitleEntry, SubtitleFormat, SubtitleTrack, LanguageCode, LogEntry, AppSettings, TranscriptionProvider, LLMProviderType, TranscriptionModelType, LLMModelType, FullTranscriptionProgress, MultiProcessTranscriptionProgress, SimpleLLMProviderType, TranslationLLMModelType, GoogleAILLMModelType } from '@/lib/types';
import { 
  LANGUAGE_OPTIONS, LANGUAGE_KEY, DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, 
  TRANSCRIPTION_PROVIDER_KEY, TRANSCRIPTION_MODEL_KEY, 
  LLM_PROVIDER_KEY, LLM_MODEL_KEY,
  TRANSLATION_LLM_PROVIDER_KEY, TRANSLATION_LLM_MODEL_KEY, 
  OPENAI_TOKEN_KEY, AVALAI_TOKEN_KEY, GOOGLE_API_KEY_KEY, GROQ_TOKEN_KEY, 
  MAX_SEGMENT_DURATION_KEY, TEMPERATURE_KEY,
  OpenAIWhisperModels, AvalAIOpenAIBasedWhisperModels, GroqWhisperModels,
  GoogleGeminiLLModels, OpenAIGPTModels, AvalAIOpenAIBasedGPTModels, GroqLLModels, AvalAIGeminiBasedModels,
  GoogleTranslationLLModels, OpenAITranslationLLModels, GroqTranslationLLModels, AvalAIOpenAITranslationModels, DEFAULT_AVALAI_BASE_URL
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { runTranscriptionTask } from '@/ai/tasks/run-transcription-task';
// import { translateSingleText, type TranslateTextInput } from '@/ai/flows/translate-text-flow'; // No longer used by this button
import { sliceAudioToDataURI, generateSrt } from '@/lib/subtitle-utils';
import { useTranslation } from '@/contexts/LanguageContext';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { getGoogleAIModel, performGoogleAIGeneration } from '@/ai/genkit';
import type { GenerateOptions } from 'genkit';


import { PageHeader } from '@/components/page/PageHeader';
import { MediaDisplay } from '@/components/page/MediaDisplay';
import { UploadStepControls } from '@/components/page/UploadStepControls';
import { EditStepControls } from '@/components/page/EditStepControls';
import { ExportStepControls } from '@/components/page/ExportStepControls';
import { PageActions } from '@/components/page/PageActions';
import { StepContentWrapper } from '@/components/page/StepContentWrapper';


type AppStep = 'upload' | 'edit' | 'export';

const CONCURRENT_REFINEMENT_LIMIT = 3; // Number of segments to refine in parallel for Option 3

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
  
  // State for Option 2: Full Transcription
  const [isGeneratingFullTranscription, setIsGeneratingFullTranscription] = useState<boolean>(false);
  const [fullTranscriptionProgress, setFullTranscriptionProgress] = useState<FullTranscriptionProgress | null>(null);
  
  // State for Option 3: Multi-Process Transcription
  const [isGeneratingMultiProcessTranscription, setIsGeneratingMultiProcessTranscription] = useState<boolean>(false);
  const [multiProcessTranscriptionProgress, setMultiProcessTranscriptionProgress] = useState<MultiProcessTranscriptionProgress | null>(null);

  const [editorLLMLanguage, setEditorLLMLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const [fullTranscriptionLanguageOverride, setFullTranscriptionLanguageOverride] = useState<LanguageCode | "auto-detect">("auto-detect");
  
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isReplacingMedia, setIsReplacingMedia] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);


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
    // Cue/Slice LLM
    const savedLlmProvider = localStorage.getItem(LLM_PROVIDER_KEY) as LLMProviderType | null;
    const finalLlmProvider = savedLlmProvider || 'openai';
    let validLlmModelsForProvider: readonly LLMModelType[];
    switch (finalLlmProvider) {
      case 'googleai': validLlmModelsForProvider = GoogleGeminiLLModels; break;
      case 'openai': validLlmModelsForProvider = OpenAIGPTModels; break;
      case 'avalai_openai': validLlmModelsForProvider = AvalAIOpenAIBasedGPTModels; break;
      case 'avalai_gemini': validLlmModelsForProvider = AvalAIGeminiBasedModels; break;
      case 'groq': validLlmModelsForProvider = GroqLLModels; break;
      default: validLlmModelsForProvider = OpenAIGPTModels;
    }
    const savedLlmModel = localStorage.getItem(LLM_MODEL_KEY) as LLMModelType | null;
    const finalLlmModel = savedLlmModel && (validLlmModelsForProvider as readonly string[]).includes(savedLlmModel) ? savedLlmModel : validLlmModelsForProvider[0];

    // Timestamp Transcription
    const savedTranscriptionProvider = localStorage.getItem(TRANSCRIPTION_PROVIDER_KEY) as TranscriptionProvider | null;
    const finalTranscriptionProvider = savedTranscriptionProvider || 'openai';
    let validTranscriptionModelsForProvider: readonly TranscriptionModelType[];
    switch (finalTranscriptionProvider) {
      case 'openai': validTranscriptionModelsForProvider = OpenAIWhisperModels; break;
      case 'avalai_openai': validTranscriptionModelsForProvider = AvalAIOpenAIBasedWhisperModels; break;
      case 'groq': validTranscriptionModelsForProvider = GroqWhisperModels; break;
      default: validTranscriptionModelsForProvider = OpenAIWhisperModels;
    }
    const savedTranscriptionModel = localStorage.getItem(TRANSCRIPTION_MODEL_KEY) as TranscriptionModelType | null;
    const finalTranscriptionModel = savedTranscriptionModel && (validTranscriptionModelsForProvider as readonly string[]).includes(savedTranscriptionModel) ? savedTranscriptionModel : validTranscriptionModelsForProvider[0];
    
    // Translation LLM
    const savedTranslationLLMProvider = localStorage.getItem(TRANSLATION_LLM_PROVIDER_KEY) as SimpleLLMProviderType | null;
    const finalTranslationLLMProvider = savedTranslationLLMProvider || 'googleai';
    let validTranslationLLMModels: readonly TranslationLLMModelType[];
    switch(finalTranslationLLMProvider) {
      case 'googleai': validTranslationLLMModels = GoogleTranslationLLModels; break;
      case 'openai': validTranslationLLMModels = OpenAITranslationLLModels; break;
      case 'avalai_openai': validTranslationLLMModels = AvalAIOpenAITranslationModels; break;
      case 'groq': validTranslationLLMModels = GroqTranslationLLModels; break;
      default: validTranslationLLMModels = GoogleTranslationLLModels;
    }
    const savedTranslationLLMModel = localStorage.getItem(TRANSLATION_LLM_MODEL_KEY) as TranslationLLMModelType | null;
    const finalTranslationLLMModel = savedTranslationLLMModel && (validTranslationLLMModels as readonly string[]).includes(savedTranslationLLMModel) ? savedTranslationLLMModel : validTranslationLLMModels[0];


    return {
      openAIToken: localStorage.getItem(OPENAI_TOKEN_KEY) || undefined,
      avalaiToken: localStorage.getItem(AVALAI_TOKEN_KEY) || undefined,
      googleApiKey: localStorage.getItem(GOOGLE_API_KEY_KEY) || undefined,
      groqToken: localStorage.getItem(GROQ_TOKEN_KEY) || undefined,
      
      transcriptionProvider: finalTranscriptionProvider,
      transcriptionModel: finalTranscriptionModel,
      
      llmProvider: finalLlmProvider, // For Cue/Slice
      llmModel: finalLlmModel,       // For Cue/Slice

      translationLLMProvider: finalTranslationLLMProvider,
      translationLLMModel: finalTranslationLLMModel,
      
      defaultTranscriptionLanguage: (localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null) || "auto-detect",
      temperature: parseFloat(localStorage.getItem(TEMPERATURE_KEY) || '0.7'),
      maxSegmentDuration: parseInt(localStorage.getItem(MAX_SEGMENT_DURATION_KEY) || '60', 10),
    };
  }, []);


  const handleRegenerateTranscription = useCallback(async (entryId: string) => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription || isGeneratingMultiProcessTranscription) {
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
    const providerForCueSlice = appSettings.llmProvider; 
    const modelForCueSlice = appSettings.llmModel; 

    if (providerForCueSlice === 'openai' && !appSettings.openAIToken) {
      toast({ title: t('toast.openAITokenMissing') as string, description: t('toast.openAITokenMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.openAITokenMissingDescription') as string, 'error'); return;
    }
    if (providerForCueSlice === 'avalai_openai' && !appSettings.avalaiToken) { 
      toast({ title: t('toast.avalaiTokenMissing') as string, description: t('toast.avalaiTokenMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.avalaiTokenMissingDescription') as string, 'error'); return;
    }
    if (providerForCueSlice === 'googleai' && !appSettings.googleApiKey) {
      toast({ title: t('toast.googleApiKeyMissing') as string, description: t('toast.googleApiKeyMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.googleApiKeyMissingDescription') as string, 'error'); return;
    }
    if (providerForCueSlice === 'avalai_gemini' && !appSettings.googleApiKey) { 
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
  }, [isAnyTranscriptionLoading, isGeneratingFullTranscription, isGeneratingMultiProcessTranscription, mediaFile, activeTrack, editorLLMLanguage, getAppSettings, t, toast, addLog, handleSubtitleChange]);

  const handleGenerateFullTranscription = useCallback(async () => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription || isGeneratingMultiProcessTranscription) {
      toast({ title: t('toast.transcriptionBusy') as string, description: t('toast.transcriptionBusyDescription') as string, variant: "destructive" });
      addLog(t('toast.transcriptionBusyDescription') as string, 'warn'); return;
    }
    if (!mediaFile) {
      toast({ title: t('toast.fullTranscriptionError.generic') as string, description: t('toast.fullTranscriptionError.noMedia') as string, variant: "destructive" });
      addLog(t('toast.fullTranscriptionError.noMedia') as string, 'error'); return;
    }

    const appSettings = getAppSettings();
    const providerForFull = appSettings.transcriptionProvider;
    const modelForFull = appSettings.transcriptionModel;

    if (providerForFull === 'openai' && !appSettings.openAIToken) {
      toast({ title: t('toast.openAITokenMissing') as string, description: t('toast.openAITokenMissingDescription') as string, variant: "destructive" });
      addLog(t('toast.openAITokenMissingDescription') as string, 'error'); return;
    }
    if (providerForFull === 'avalai_openai' && !appSettings.avalaiToken) { 
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
    setIsAnyTranscriptionLoading(true);


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
      setIsAnyTranscriptionLoading(false);
      addLog("Full media transcription process finished.", 'debug');
    }
  }, [isAnyTranscriptionLoading, isGeneratingFullTranscription, isGeneratingMultiProcessTranscription, mediaFile, fullTranscriptionLanguageOverride, getAppSettings, t, toast, addLog]);

  const handleGenerateMultiProcessTranscription = useCallback(async () => {
    if (isAnyTranscriptionLoading || isGeneratingFullTranscription || isGeneratingMultiProcessTranscription) {
      toast({ title: t('toast.transcriptionBusy') as string, description: t('toast.transcriptionBusyDescription') as string, variant: "destructive" });
      addLog(t('toast.transcriptionBusyDescription') as string, 'warn'); return;
    }
    if (!mediaFile) {
      toast({ title: t('toast.fullTranscriptionError.generic') as string, description: t('toast.fullTranscriptionError.noMedia') as string, variant: "destructive" });
      addLog(t('toast.fullTranscriptionError.noMedia') as string, 'error'); return;
    }

    const appSettings = getAppSettings();
    const initialProvider = appSettings.transcriptionProvider;
    const initialModel = appSettings.transcriptionModel;
    const refinementProvider = appSettings.llmProvider; // For Cue/Slice
    const refinementModel = appSettings.llmModel;       // For Cue/Slice

    // API Key Checks
    if ((initialProvider === 'openai' || refinementProvider === 'openai') && !appSettings.openAIToken) {
        toast({ title: t('toast.openAITokenMissing') as string, description: t('toast.openAITokenMissingDescription') as string, variant: "destructive" }); return;
    }
    if ((initialProvider === 'avalai_openai' || refinementProvider === 'avalai_openai') && !appSettings.avalaiToken) {
        toast({ title: t('toast.avalaiTokenMissing') as string, description: t('toast.avalaiTokenMissingDescription') as string, variant: "destructive" }); return;
    }
    if (refinementProvider === 'googleai' && !appSettings.googleApiKey) {
        toast({ title: t('toast.googleApiKeyMissing') as string, description: t('toast.googleApiKeyMissingDescription') as string, variant: "destructive" }); return;
    }
    if (refinementProvider === 'avalai_gemini' && !appSettings.googleApiKey) {
        toast({ title: t('toast.googleApiKeyMissingForAvalAI') as string, description: t('toast.googleApiKeyMissingForAvalAIDescription') as string, variant: "destructive" }); return;
    }
    if ((initialProvider === 'groq' || refinementProvider === 'groq') && !appSettings.groqToken) {
        toast({ title: t('toast.groqTokenMissing') as string, description: t('toast.groqTokenMissingDescription') as string, variant: "destructive" }); return;
    }

    setIsGeneratingMultiProcessTranscription(true);
    setIsAnyTranscriptionLoading(true);
    setMultiProcessTranscriptionProgress({
        stage: 'initial_transcription',
        statusMessage: t('multiProcess.status.stage1Init') as string,
        initialTranscriptionProgress: { currentChunk: 0, totalChunks: 0, percentage: 0, currentStage: null },
        segmentRefinementProgress: null,
    });

    let initialSegments: SubtitleEntry[] = [];
    const langForTranscription = fullTranscriptionLanguageOverride === "auto-detect" ? undefined : fullTranscriptionLanguageOverride;

    try {
        // Stage 1: Initial Timestamped Transcription
        addLog(`Multi-Process Stage 1: Initial timestamp transcription. Provider: ${initialProvider}, Model: ${initialModel}, Lang: ${langForTranscription || 'auto'}`, 'info');
        const maxSegmentDuration = appSettings.maxSegmentDuration || 60;
        const numChunks = Math.ceil(mediaFile.duration / maxSegmentDuration);
        
        setMultiProcessTranscriptionProgress(prev => ({
            ...prev!,
            statusMessage: t('multiProcess.status.stage1Progress', { model: initialModel }) as string,
            initialTranscriptionProgress: { currentChunk: 0, totalChunks: numChunks, percentage: 0, currentStage: t('aiGenerator.progress.stage.slicing') as string },
        }));

        for (let i = 0; i < numChunks; i++) {
            const chunkStartTime = i * maxSegmentDuration;
            const chunkEndTime = Math.min((i + 1) * maxSegmentDuration, mediaFile.duration);
            if (chunkStartTime >= chunkEndTime) continue;

            const currentChunkNum = i + 1;
            setMultiProcessTranscriptionProgress(prev => ({
                ...prev!,
                initialTranscriptionProgress: {
                    ...prev!.initialTranscriptionProgress!,
                    currentChunk: currentChunkNum,
                    percentage: Math.round((i / numChunks) * 100),
                    currentStage: t('aiGenerator.progress.stage.slicing') as string,
                },
            }));
            
            const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, chunkStartTime, chunkEndTime);
            setMultiProcessTranscriptionProgress(prev => ({ ...prev!, initialTranscriptionProgress: { ...prev!.initialTranscriptionProgress!, currentStage: t('aiGenerator.progress.stage.transcribing') as string } }));

            const result = await runTranscriptionTask({
                audioDataUri, provider: initialProvider!, modelName: initialModel!, language: langForTranscription, task: 'timestamp', appSettings
            }, (chunkProgress, chunkMessage) => {
                 setMultiProcessTranscriptionProgress(prev => ({
                    ...prev!,
                    initialTranscriptionProgress: {
                        ...prev!.initialTranscriptionProgress!,
                        percentage: Math.round(((i + chunkProgress / 100) / numChunks) * 100),
                        chunkProgress, chunkMessage
                    }
                }));
            });
            
            setMultiProcessTranscriptionProgress(prev => ({ ...prev!, initialTranscriptionProgress: { ...prev!.initialTranscriptionProgress!, currentStage: t('aiGenerator.progress.stage.processing') as string } }));
            if (result.segments && result.segments.length > 0) {
                result.segments.forEach(seg => initialSegments.push({
                    id: `init-${chunkStartTime + seg.start}-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
                    startTime: parseFloat((chunkStartTime + seg.start).toFixed(3)),
                    endTime: parseFloat((chunkStartTime + seg.end).toFixed(3)),
                    text: seg.text,
                }));
            } else if (result.fullText) {
                initialSegments.push({
                    id: `init-chunk-${chunkStartTime}-${Date.now()}`,
                    startTime: parseFloat(chunkStartTime.toFixed(3)),
                    endTime: parseFloat(chunkEndTime.toFixed(3)),
                    text: result.fullText,
                });
            }
        }
        initialSegments.sort((a, b) => a.startTime - b.startTime);
        addLog(`Multi-Process Stage 1 Complete. Generated ${initialSegments.length} initial segments.`, 'success');
        
        if (initialSegments.length === 0) {
          throw new Error(t('multiProcess.error.noInitialSegments') as string);
        }

        // Stage 2: Parallel Segment Refinement
        setMultiProcessTranscriptionProgress(prev => ({
            ...prev!,
            stage: 'segment_refinement',
            statusMessage: t('multiProcess.status.stage2Init', { count: initialSegments.length, model: refinementModel}) as string,
            segmentRefinementProgress: {
                totalSegments: initialSegments.length,
                processedSegments: 0,
                completedSegments: 0,
                refinedSuccessfully: 0,
                failedToRefine: 0,
            },
        }));
        addLog(`Multi-Process Stage 2: Refining ${initialSegments.length} segments. Provider: ${refinementProvider}, Model: ${refinementModel}`, 'info');

        const finalSubtitleEntries: SubtitleEntry[] = [];
        const segmentTasks = initialSegments.map((segment, index) => async () => {
            try {
                setMultiProcessTranscriptionProgress(prev => {
                    const currentSRP = prev!.segmentRefinementProgress!;
                    return {
                        ...prev!,
                        statusMessage: t('multiProcess.status.stage2Progress', { current: currentSRP.processedSegments + 1, total: currentSRP.totalSegments, model: refinementModel }) as string,
                        segmentRefinementProgress: { ...currentSRP, processedSegments: currentSRP.processedSegments + 1 }
                    };
                });

                const audioDataUri = await sliceAudioToDataURI(mediaFile.rawFile, segment.startTime, segment.endTime);
                const refinedResult = await runTranscriptionTask({
                    audioDataUri, provider: refinementProvider!, modelName: refinementModel!, language: langForTranscription, task: 'cue_slice', appSettings
                });
                
                const refinedText = refinedResult.fullText.trim();
                finalSubtitleEntries.push({ ...segment, text: refinedText || segment.text }); // Use original if refinement is empty
                
                setMultiProcessTranscriptionProgress(prev => {
                    const currentSRP = prev!.segmentRefinementProgress!;
                    return {
                        ...prev!,
                        segmentRefinementProgress: {
                             ...currentSRP,
                             completedSegments: currentSRP.completedSegments + 1,
                             refinedSuccessfully: currentSRP.refinedSuccessfully + (refinedText ? 1 : 0),
                             failedToRefine: currentSRP.failedToRefine + (refinedText ? 0 : 1)
                        }
                    };
                });
                if (!refinedText) addLog(`Segment ${index+1} (${segment.id}) refinement resulted in empty text. Using original.`, 'warn');
            } catch (err: any) {
                addLog(`Error refining segment ${index+1} (${segment.id}): ${err.message}`, 'error');
                finalSubtitleEntries.push(segment); // Use original on error
                 setMultiProcessTranscriptionProgress(prev => {
                    const currentSRP = prev!.segmentRefinementProgress!;
                    return {
                        ...prev!,
                        segmentRefinementProgress: {
                             ...currentSRP,
                             completedSegments: currentSRP.completedSegments + 1,
                             failedToRefine: currentSRP.failedToRefine + 1
                        }
                    };
                });
            }
        });
        
        for (let i = 0; i < segmentTasks.length; i += CONCURRENT_REFINEMENT_LIMIT) {
            const batch = segmentTasks.slice(i, i + CONCURRENT_REFINEMENT_LIMIT);
            await Promise.allSettled(batch.map(task => task()));
        }

        finalSubtitleEntries.sort((a,b) => a.startTime - b.startTime);
        const newTrackId = `track-multi-${Date.now()}`;
        const trackLangSuffix = langForTranscription || (fullTranscriptionLanguageOverride === "auto-detect" ? "auto" : fullTranscriptionLanguageOverride);
        const newTrackFileName = `${mediaFile.name.substring(0, mediaFile.name.lastIndexOf('.') || mediaFile.name.length)} - MultiProcess-${initialModel}-${refinementModel}-${trackLangSuffix}.srt`;
        
        const newTrack: SubtitleTrack = { id: newTrackId, fileName: newTrackFileName, format: 'srt', entries: finalSubtitleEntries };
        setSubtitleTracks(prevTracks => [...prevTracks, newTrack]);
        setActiveTrackId(newTrackId);
        
        const successMessage = t('multiProcess.status.complete', { trackName: newTrackFileName, count: finalSubtitleEntries.length }) as string;
        toast({ title: t('multiProcess.toast.completeTitle') as string, description: successMessage });
        addLog(successMessage, 'success');
        
        setMultiProcessTranscriptionProgress(prev => ({ ...prev!, stage: 'complete', statusMessage: successMessage }));
        setCurrentStep('edit');

    } catch (error: any) {
      console.error("Multi-Process transcription error:", error);
      const errorMsg = t('multiProcess.error.generic', { errorMessage: error.message });
      toast({ title: t('multiProcess.toast.errorTitle') as string, description: errorMsg as string, variant: "destructive" });
      addLog(errorMsg as string, 'error');
      setMultiProcessTranscriptionProgress(prev => ({ ...prev!, stage: 'error', statusMessage: errorMsg as string }));
    } finally {
      setIsGeneratingMultiProcessTranscription(false);
      setIsAnyTranscriptionLoading(false);
      // Don't nullify multiProcessTranscriptionProgress here, so user can see final status/error
      addLog("Multi-Process transcription attempt finished.", 'debug');
    }

  }, [isAnyTranscriptionLoading, isGeneratingFullTranscription, isGeneratingMultiProcessTranscription, mediaFile, fullTranscriptionLanguageOverride, getAppSettings, t, toast, addLog]);

  const handleTranslateAndExportSubtitles = useCallback(async (targetLanguageCode: LanguageCode) => {
    if (!activeTrack || activeTrack.entries.length === 0) {
      toast({ title: t('exporter.toast.nothingToTranslateTitle') as string, description: t('exporter.toast.nothingToTranslateDescription') as string, variant: "destructive" });
      addLog(t('exporter.toast.nothingToTranslateDescription') as string, 'warn');
      return;
    }
    if (isTranslating) {
      toast({ title: t('exporter.toast.translationInProgressTitle') as string, description: t('exporter.toast.translationInProgressDescription') as string, variant: "destructive" });
      addLog(t('exporter.toast.translationInProgressDescription') as string, 'warn');
      return;
    }

    const appSettings = getAppSettings();
    const translationProvider = appSettings.translationLLMProvider || 'googleai';
    const translationModelForProvider = appSettings.translationLLMModel || (
        translationProvider === 'googleai' ? GoogleTranslationLLModels[0] :
        translationProvider === 'openai' ? OpenAITranslationLLModels[0] :
        translationProvider === 'avalai_openai' ? AvalAIOpenAITranslationModels[0] : // Added AvalAI here
        GroqTranslationLLModels[0] // Default for Groq
    );

    let apiKeyMissing = false;
    let missingKeyMessage = '';

    if (translationProvider === 'googleai' && !appSettings.googleApiKey) {
        apiKeyMissing = true;
        missingKeyMessage = t('toast.googleApiKeyMissingDescription') as string;
    } else if (translationProvider === 'openai' && !appSettings.openAIToken) {
        apiKeyMissing = true;
        missingKeyMessage = t('toast.openAITokenMissingDescription') as string;
    } else if (translationProvider === 'avalai_openai' && !appSettings.avalaiToken) {
        apiKeyMissing = true;
        missingKeyMessage = t('toast.avalaiTokenMissingDescription') as string;
    } else if (translationProvider === 'groq' && !appSettings.groqToken) {
        apiKeyMissing = true;
        missingKeyMessage = t('toast.groqTokenMissingDescription') as string;
    }
    
    if (apiKeyMissing || !translationProvider || !translationModelForProvider) {
         toast({ title: t('exporter.toast.apiKeyNeededForTranslationTitle') as string, description: missingKeyMessage || t('exporter.toast.apiKeyNeededForTranslationDescriptionV2', { provider: translationProvider || "selected provider"}) as string, variant: "destructive" });
         addLog(missingKeyMessage || t('exporter.toast.apiKeyNeededForTranslationDescriptionV2', { provider: translationProvider || "selected provider"}) as string, 'error');
         return;
    }
    
    setIsTranslating(true);
    const targetLanguage = LANGUAGE_OPTIONS.find(l => l.value === targetLanguageCode);
    const targetLanguageName = targetLanguage ? targetLanguage.label.split(" (")[0] : targetLanguageCode;
    
    const modelIdForClientCall = translationModelForProvider;

    addLog(`Client-side translation started for track: ${activeTrack.fileName} to ${targetLanguageName} (${targetLanguageCode}) using ${translationProvider}/${modelIdForClientCall}`, 'info');
    toast({ title: t('exporter.toast.translationStartingTitle') as string, description: t('exporter.toast.translationStartingDescriptionV2', { language: targetLanguageName, model: `${translationProvider}/${modelIdForClientCall}` }) as string });

    const translatedEntries: SubtitleEntry[] = [];
    let translationErrors = 0;

    for (const entry of activeTrack.entries) {
        const textToTranslate = entry.text;
        const textToTranslateTrimmed = textToTranslate.trim();

        if (textToTranslateTrimmed.length < 2 || textToTranslateTrimmed === "..." || textToTranslateTrimmed.toLowerCase() === "new subtitle text..." || textToTranslateTrimmed.toLowerCase() === "null") {
            translatedEntries.push({ ...entry, text: textToTranslate });
            continue;
        }

        const translationPromptContent = `Translate the following text into ${targetLanguageName}.
Respond *only* with the translated text. Do not add any extra explanations, apologies, or conversational filler.
If the input text is a common placeholder like "New subtitle text...", "...", "null", or appears to be already in ${targetLanguageName}, please return the original text unchanged.
Do not translate proper nouns or entities that should remain in their original language unless contextually appropriate for ${targetLanguageName}.

Original text:
'''
${textToTranslate}
'''`;
        let translatedText = textToTranslate;

        try {
            if (translationProvider === 'googleai') {
                const genkitModel = await getGoogleAIModel(modelIdForClientCall as GoogleAILLMModelType);
                const generateOptions: GenerateOptions = {
                    model: genkitModel,
                    prompt: translationPromptContent,
                    config: { temperature: appSettings.temperature || 0.2 },
                };
                const result = await performGoogleAIGeneration(generateOptions);
                translatedText = result.text?.trim() || textToTranslate;
            } else if (translationProvider === 'openai') {
                const openaiClient = new OpenAI({ apiKey: appSettings.openAIToken!, dangerouslyAllowBrowser: true });
                const completion = await openaiClient.chat.completions.create({
                    model: modelIdForClientCall,
                    messages: [{ role: "user", content: translationPromptContent }],
                    temperature: appSettings.temperature || 0.2,
                });
                translatedText = completion.choices[0]?.message?.content?.trim() || textToTranslate;
            } else if (translationProvider === 'avalai_openai') {
                const avalaiClient = new OpenAI({ apiKey: appSettings.avalaiToken!, baseURL: DEFAULT_AVALAI_BASE_URL, dangerouslyAllowBrowser: true });
                const completion = await avalaiClient.chat.completions.create({
                    model: modelIdForClientCall,
                    messages: [{ role: "user", content: translationPromptContent }],
                    temperature: appSettings.temperature || 0.2,
                });
                translatedText = completion.choices[0]?.message?.content?.trim() || textToTranslate;
            } else if (translationProvider === 'groq') {
                const groqClient = new Groq({ apiKey: appSettings.groqToken!, dangerouslyAllowBrowser: true });
                const completion = await groqClient.chat.completions.create({
                    model: modelIdForClientCall,
                    messages: [{ role: "user", content: translationPromptContent }],
                    temperature: appSettings.temperature || 0.2,
                });
                translatedText = completion.choices[0]?.message?.content?.trim() || textToTranslate;
            }

            if (!translatedText.trim() || translatedText.trim().toLowerCase() === textToTranslate.trim().toLowerCase()) {
                 if (!(textToTranslateTrimmed.length < 2 || textToTranslateTrimmed === "..." || textToTranslateTrimmed.toLowerCase() === "new subtitle text..." || textToTranslateTrimmed.toLowerCase() === "null")) {
                    addLog(`Translation for "${textToTranslate.substring(0,20)}..." resulted in empty or identical text. Using original.`, 'debug');
                 }
                 translatedText = textToTranslate;
            }

        } catch (error: any) {
            translationErrors++;
            console.error(`Error translating entry ID ${entry.id} with ${translationProvider}:`, error);
            addLog(`Error translating entry ${entry.id} ("${entry.text.substring(0,20)}...") with ${translationProvider}: ${error.message}`, 'error');
            translatedText = textToTranslate;
        }
        translatedEntries.push({ ...entry, text: translatedText });
    }

    const originalFileName = activeTrack.fileName.substring(0, activeTrack.fileName.lastIndexOf('.') || activeTrack.fileName.length);
    const translatedFileName = `${originalFileName}.${targetLanguageCode}.srt`;
    const srtContent = generateSrt(translatedEntries);

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = translatedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (translationErrors > 0) {
      if (translationErrors === activeTrack.entries.length) {
        toast({
          title: t('exporter.toast.translationErrorTitle') as string,
          description: t('exporter.toast.translationErrorDescription', { error: `All ${translationErrors} translations failed.` }) as string,
          variant: "destructive"
        });
        addLog(`All ${translationErrors} translations failed for track ${activeTrack.fileName} to ${targetLanguageName}`, 'error');
      } else {
        toast({
          title: t('exporter.toast.translationErrorTitle') as string,
          description: t('exporter.toast.translationPartialErrorDescription', { count: translationErrors, total: activeTrack.entries.length }) as string,
          variant: "destructive"
        });
        addLog(`${translationErrors} out of ${activeTrack.entries.length} translations failed for track ${activeTrack.fileName} to ${targetLanguageName}. The rest exported to ${translatedFileName}.`, 'warn');
      }
    } else {
      toast({ title: t('exporter.toast.translationSuccessTitle') as string, description: t('exporter.toast.translationSuccessDescription', { fileName: translatedFileName }) as string });
      addLog(`Successfully translated and exported ${translatedFileName}`, 'success');
    }

    setIsTranslating(false);
  }, [activeTrack, isTranslating, getAppSettings, t, toast, addLog]);


  const isEntryTranscribing = (entryId: string): boolean => {
    return !!entryTranscriptionLoading[entryId];
  };

  const editorDisabled = !mediaFile || !activeTrack || isGeneratingFullTranscription || isGeneratingMultiProcessTranscription;


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
    // Reset progress states if navigating back to upload
    setIsGeneratingFullTranscription(false);
    setFullTranscriptionProgress(null);
    setIsGeneratingMultiProcessTranscription(false);
    setMultiProcessTranscriptionProgress(null);
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
              isGeneratingFullTranscription={isGeneratingFullTranscription || isGeneratingMultiProcessTranscription}
              addLog={addLog}
              t={t}
              dir={dir}
            />
          </div>

          <StepContentWrapper key={currentStep}>
            {currentStep === 'upload' && (
              <UploadStepControls
                handleSubtitleUpload={handleSubtitleUpload}
                mediaFile={mediaFile}
                isGeneratingFullTranscription={isGeneratingFullTranscription}
                isGeneratingMultiProcessTranscription={isGeneratingMultiProcessTranscription}
                isAnyTranscriptionLoading={isAnyTranscriptionLoading}
                isReplacingMedia={isReplacingMedia}
                fullTranscriptionLanguageOverride={fullTranscriptionLanguageOverride}
                handleFullTranscriptionLanguageChange={handleFullTranscriptionLanguageChange}
                fullTranscriptionProgress={fullTranscriptionProgress}
                multiProcessTranscriptionProgress={multiProcessTranscriptionProgress}
                handleGenerateFullTranscription={handleGenerateFullTranscription}
                handleGenerateMultiProcessTranscription={handleGenerateMultiProcessTranscription}
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
                isGeneratingFullTranscription={isGeneratingFullTranscription || isGeneratingMultiProcessTranscription}
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
                onTranslateAndExport={handleTranslateAndExportSubtitles}
                isTranslating={isTranslating}
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

    
