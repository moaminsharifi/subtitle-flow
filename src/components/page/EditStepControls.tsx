
"use client";

import type React from 'react';
import type { MediaFile, SubtitleEntry, SubtitleTrack, LanguageCode, LogEntry } from '@/lib/types';
import { SubtitleEditor } from '@/components/subtitle-editor';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_OPTIONS } from '@/lib/types';

interface EditStepControlsProps {
  activeTrackId: string | null;
  subtitleTracks: SubtitleTrack[];
  setActiveTrackId: (trackId: string) => void;
  editorLLMLanguage: LanguageCode | "auto-detect"; // Changed from editorTranscriptionLanguage
  setEditorLLMLanguage: (lang: LanguageCode | "auto-detect") => void; // Changed setter name
  mediaFile: MediaFile | null;
  isGeneratingFullTranscription: boolean;
  isAnyTranscriptionLoading: boolean;
  activeTrack: SubtitleTrack | null;
  handleSubtitleChange: (entryId: string, newEntryData: Partial<Omit<SubtitleEntry, 'id'>>) => void;
  handleSubtitleAdd: () => void;
  handleSubtitleDelete: (entryId: string) => void;
  handleRegenerateTranscription: (entryId: string) => Promise<void>;
  isEntryTranscribing: (entryId: string) => boolean;
  currentPlayerTime: number;
  editorDisabled: boolean;
  handleGoToUpload: (reset?: boolean) => void;
  handleSeekPlayer: (timeInSeconds: number) => void;
  handleProceedToExport: () => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode;
  dir: 'ltr' | 'rtl';
}

export function EditStepControls({
  activeTrackId,
  subtitleTracks,
  setActiveTrackId,
  editorLLMLanguage, // Use new prop name
  setEditorLLMLanguage, // Use new setter name
  mediaFile,
  isGeneratingFullTranscription,
  isAnyTranscriptionLoading,
  activeTrack,
  handleSubtitleChange,
  handleSubtitleAdd,
  handleSubtitleDelete,
  handleRegenerateTranscription,
  isEntryTranscribing,
  currentPlayerTime,
  editorDisabled,
  handleGoToUpload,
  handleSeekPlayer,
  handleProceedToExport,
  addLog,
  t,
  dir,
}: EditStepControlsProps) {

  const LeftArrowIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const RightArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">{t('editor.trackLanguage.title') as string}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="active-track-select">{t('editor.trackLanguage.activeTrackLabel') as string}</Label>
            <Select
              value={activeTrackId || ""}
              onValueChange={(trackId) => {
                setActiveTrackId(trackId);
                const selectedTrack = subtitleTracks.find(st => st.id === trackId);
                addLog(`Active track changed to: ${selectedTrack?.fileName || 'None'}`, 'debug');
              }}
              disabled={!mediaFile || subtitleTracks.length === 0 || isGeneratingFullTranscription || isAnyTranscriptionLoading}
              dir={dir}
            >
              <SelectTrigger id="active-track-select" className="w-full" aria-label={t('editor.trackLanguage.activeTrackLabel') as string}>
                <SelectValue placeholder={t('editor.trackLanguage.activeTrackPlaceholder') as string} />
              </SelectTrigger>
              <SelectContent>
                {subtitleTracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.fileName} ({track.format.toUpperCase()}, {track.entries.length} {t('editor.trackLanguage.cuesLabel') as string})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subtitleTracks.length === 0 && <p className="text-xs text-muted-foreground mt-1">{t('editor.trackLanguage.noTracks') as string}</p>}
          </div>
          <div>
            <Label htmlFor="editor-llm-language-select" className="flex items-center gap-1 mb-1 text-sm font-medium">
                <Languages className="h-4 w-4" />
                {t('editor.trackLanguage.cueSliceLanguageLabel') as string} {/* Updated Label */}
            </Label>
            <Select
              value={editorLLMLanguage}
              onValueChange={(value) => {
                const lang = value as LanguageCode | "auto-detect";
                setEditorLLMLanguage(lang); // Use new setter
                addLog(`Editor LLM language for cue/slice regeneration set to: ${lang}`, 'debug');
              }}
              disabled={!mediaFile || isGeneratingFullTranscription || isAnyTranscriptionLoading}
              dir={dir}
            >
              <SelectTrigger id="editor-llm-language-select" className="w-full" aria-label={t('editor.trackLanguage.cueSliceLanguageLabel') as string}>
                <SelectValue placeholder={t('editor.trackLanguage.segmentLanguagePlaceholder') as string} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((langOpt) => (
                  <SelectItem key={langOpt.value} value={langOpt.value}>
                    {langOpt.label}
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
          handleSeekPlayer={handleSeekPlayer}
          LLM_PROVIDER_KEY={null} // This prop is not used in SubtitleEditor based on current files, can be removed if not needed
          onTranslateSubtitles={async (targetLang) => { console.warn("Translate subtitles feature not implemented yet.", targetLang)}} // Placeholder
        />

      </div>
      <Card>
        <CardFooter className="p-4 flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => handleGoToUpload(false)}
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isGeneratingFullTranscription || isAnyTranscriptionLoading}
            aria-label={t('page.button.backToUploads') as string}
          >
            <LeftArrowIcon className={cn("h-4 w-4", dir === 'rtl' ? 'ms-2' : 'me-2')} /> {t('page.button.backToUploads') as string}
          </Button>
          <Button
            onClick={handleProceedToExport}
            disabled={!activeTrack || !activeTrack.entries.length || isGeneratingFullTranscription || isAnyTranscriptionLoading}
            className="w-full sm:flex-1"
            aria-label={t('page.button.proceedToExport') as string}
          >
              {t('page.button.proceedToExport') as string} <RightArrowIcon className={cn("h-4 w-4", dir === 'rtl' ? 'me-2' : 'ms-2')} />
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
