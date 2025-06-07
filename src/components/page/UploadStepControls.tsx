
"use client";

import React, { useMemo } from 'react';
import type { MediaFile, SubtitleEntry, SubtitleFormat, LanguageCode, FullTranscriptionProgress } from '@/lib/types';
import { SubtitleUploader } from '@/components/subtitle-uploader';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FileText, WandSparkles, Languages, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_OPTIONS, OPENAI_TOKEN_KEY, AVALAI_TOKEN_KEY, GROQ_TOKEN_KEY } from '@/lib/types';

interface UploadStepControlsProps {
  handleSubtitleUpload: (entries: SubtitleEntry[], fileName: string, format: SubtitleFormat) => void;
  mediaFile: MediaFile | null;
  isGeneratingFullTranscription: boolean;
  isAnyTranscriptionLoading: boolean; // Combined state for any transcription type
  isReplacingMedia: boolean;
  fullTranscriptionLanguageOverride: LanguageCode | "auto-detect";
  handleFullTranscriptionLanguageChange: (value: string) => void;
  fullTranscriptionProgress: FullTranscriptionProgress | null;
  handleGenerateFullTranscription: () => Promise<void>;
  handleProceedToEdit: () => void;
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode;
  dir: 'ltr' | 'rtl';
  subtitleTracksLength: number;
}

export function UploadStepControls({
  handleSubtitleUpload,
  mediaFile,
  isGeneratingFullTranscription,
  isAnyTranscriptionLoading,
  isReplacingMedia,
  fullTranscriptionLanguageOverride,
  handleFullTranscriptionLanguageChange,
  fullTranscriptionProgress,
  handleGenerateFullTranscription,
  handleProceedToEdit,
  t,
  dir,
  subtitleTracksLength
}: UploadStepControlsProps) {

  const RightArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const areRelevantApiKeysMissing = useMemo(() => {
    if (typeof window !== 'undefined') {
      const openAITokenSet = !!localStorage.getItem(OPENAI_TOKEN_KEY);
      const avalaiTokenSet = !!localStorage.getItem(AVALAI_TOKEN_KEY);
      const groqTokenSet = !!localStorage.getItem(GROQ_TOKEN_KEY);
      return !openAITokenSet && !avalaiTokenSet && !groqTokenSet;
    }
    return true; // Assume missing if localStorage is not available (SSR or early client)
  }, []);

  const memoizedSubtitleUploaderCard = useMemo(() => (
    <Card className="shadow-lg flex flex-col flex-grow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-6 w-6 text-primary" />
          {t('subtitleUploader.option1.title') as string}
        </CardTitle>
        <CardDescription>{t('subtitleUploader.option1.description') as string}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SubtitleUploader
          onSubtitleUpload={handleSubtitleUpload}
          disabled={!mediaFile || isGeneratingFullTranscription || isReplacingMedia}
        />
      </CardContent>
    </Card>
  ), [t, handleSubtitleUpload, mediaFile, isGeneratingFullTranscription, isReplacingMedia]);

  const memoizedAIGeneratorCard = useMemo(() => (
    <Card className={cn("shadow-lg", (!mediaFile || isReplacingMedia) && "opacity-60 pointer-events-none")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <WandSparkles className="h-6 w-6 text-accent" />
          {t('aiGenerator.option2.title') as string}
        </CardTitle>
        <CardDescription>
          {(!mediaFile || isReplacingMedia) ? t('aiGenerator.option2.descriptionDisabled') as string : t('aiGenerator.option2.descriptionEnabled') as string}
          {areRelevantApiKeysMissing && (
            <p className="text-destructive mt-1 text-xs">
              {t('aiGenerator.option2.apiKeyNeededMessage') as string}
            </p>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="full-transcription-language-select" className="flex items-center gap-1 mb-1 text-sm font-medium">
            <Languages className="h-4 w-4" />
            {t('aiGenerator.language.label') as string}
          </Label>
          <Select
            value={fullTranscriptionLanguageOverride}
            onValueChange={handleFullTranscriptionLanguageChange}
            disabled={!mediaFile || isReplacingMedia || isGeneratingFullTranscription || isAnyTranscriptionLoading || areRelevantApiKeysMissing}
            dir={dir}
          >
            <SelectTrigger id="full-transcription-language-select" className="w-full" aria-label={t('aiGenerator.language.label') as string}>
              <SelectValue placeholder={t('aiGenerator.language.placeholder') as string} />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((langOpt) => (
                <SelectItem key={langOpt.value} value={langOpt.value}>
                  {langOpt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {t('aiGenerator.language.description') as string}
          </p>
        </div>

        {isGeneratingFullTranscription && fullTranscriptionProgress ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">
              {t('aiGenerator.progress.inProgress') as string}
              {fullTranscriptionProgress.currentStage && ` (${fullTranscriptionProgress.currentStage})`}
            </p>
            <Progress value={fullTranscriptionProgress.percentage} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              {t('aiGenerator.progress.chunkInfo', { currentChunk: fullTranscriptionProgress.currentChunk, totalChunks: fullTranscriptionProgress.totalChunks, percentage: fullTranscriptionProgress.percentage }) as string}
            </p>
          </div>
        ) : (
          <Button
            onClick={handleGenerateFullTranscription}
            disabled={!mediaFile || isReplacingMedia || isGeneratingFullTranscription || isAnyTranscriptionLoading || areRelevantApiKeysMissing}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            aria-label={t('aiGenerator.button.generate') as string}
          >
            {isGeneratingFullTranscription ? (
              <>
                <Loader2 className={cn("h-4 w-4 animate-spin", dir === 'rtl' ? 'ms-2' : 'me-2')} />
                {fullTranscriptionProgress ? t('aiGenerator.button.generating', { percentage: fullTranscriptionProgress.percentage }) : t('aiGenerator.button.generatingSimple') }
              </>
            ) : (
              <>
                <WandSparkles className={cn("h-4 w-4", dir === 'rtl' ? 'ms-2' : 'me-2')} />
                {t('aiGenerator.button.generate') as string}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [t, dir, mediaFile, isReplacingMedia, isGeneratingFullTranscription, isAnyTranscriptionLoading, fullTranscriptionLanguageOverride, handleFullTranscriptionLanguageChange, fullTranscriptionProgress, handleGenerateFullTranscription, areRelevantApiKeysMissing]);

  return (
    <>
      {memoizedSubtitleUploaderCard}
      {memoizedAIGeneratorCard}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('page.nextStep.title') as string}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {t('page.nextStep.description') as string}
          </p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            onClick={handleProceedToEdit}
            disabled={!mediaFile || subtitleTracksLength === 0 || isGeneratingFullTranscription || isReplacingMedia}
            className="w-full"
            aria-label={t('page.button.proceedToEdit') as string}
          >
            {t('page.button.proceedToEdit') as string} <RightArrowIcon className={cn("h-4 w-4", dir === 'rtl' ? 'me-2' : 'ms-2')} />
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}

