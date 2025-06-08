
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import type { MediaFile, SubtitleEntry, SubtitleFormat, LanguageCode, FullTranscriptionProgress, MultiProcessTranscriptionProgress } from '@/lib/types';
import { SubtitleUploader } from '@/components/subtitle-uploader';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FileText, WandSparkles, Languages, Loader2, ArrowRight, ArrowLeft, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_OPTIONS, OPENAI_TOKEN_KEY, AVALAI_TOKEN_KEY, GOOGLE_API_KEY_KEY, GROQ_TOKEN_KEY } from '@/lib/types';

interface UploadStepControlsProps {
  handleSubtitleUpload: (entries: SubtitleEntry[], fileName: string, format: SubtitleFormat) => void;
  mediaFile: MediaFile | null;
  isGeneratingFullTranscription: boolean;
  isGeneratingMultiProcessTranscription: boolean; // New prop
  isAnyTranscriptionLoading: boolean;
  isReplacingMedia: boolean;
  fullTranscriptionLanguageOverride: LanguageCode | "auto-detect";
  handleFullTranscriptionLanguageChange: (value: string) => void;
  fullTranscriptionProgress: FullTranscriptionProgress | null;
  multiProcessTranscriptionProgress: MultiProcessTranscriptionProgress | null; // New prop
  handleGenerateFullTranscription: () => Promise<void>;
  handleGenerateMultiProcessTranscription: () => Promise<void>; // New prop
  handleProceedToEdit: () => void;
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode;
  dir: 'ltr' | 'rtl';
  subtitleTracksLength: number;
}

export function UploadStepControls({
  handleSubtitleUpload,
  mediaFile,
  isGeneratingFullTranscription,
  isGeneratingMultiProcessTranscription,
  isAnyTranscriptionLoading,
  isReplacingMedia,
  fullTranscriptionLanguageOverride,
  handleFullTranscriptionLanguageChange,
  fullTranscriptionProgress,
  multiProcessTranscriptionProgress,
  handleGenerateFullTranscription,
  handleGenerateMultiProcessTranscription,
  handleProceedToEdit,
  t,
  dir,
  subtitleTracksLength
}: UploadStepControlsProps) {

  const RightArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const [disableGenerateButtonDueToApiKeys, setDisableGenerateButtonDueToApiKeys] = useState(true);

  useEffect(() => {
    const openAITokenSet = !!localStorage.getItem(OPENAI_TOKEN_KEY);
    const avalaiTokenSet = !!localStorage.getItem(AVALAI_TOKEN_KEY);
    const googleApiKeySet = !!localStorage.getItem(GOOGLE_API_KEY_KEY);
    const groqTokenSet = !!localStorage.getItem(GROQ_TOKEN_KEY);
    const keysMissing = !openAITokenSet && !avalaiTokenSet && !googleApiKeySet && !groqTokenSet;

    setShowApiKeyWarning(keysMissing);
    setDisableGenerateButtonDueToApiKeys(keysMissing);
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
          disabled={!mediaFile || isGeneratingFullTranscription || isGeneratingMultiProcessTranscription || isReplacingMedia}
        />
      </CardContent>
    </Card>
  ), [t, handleSubtitleUpload, mediaFile, isGeneratingFullTranscription, isGeneratingMultiProcessTranscription, isReplacingMedia]);

  const memoizedAIGeneratorCard = useMemo(() => (
    <Card className={cn("shadow-lg", (!mediaFile || isReplacingMedia) && "opacity-60 pointer-events-none")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <WandSparkles className="h-6 w-6 text-accent" />
          {t('aiGenerator.option2.title') as string}
        </CardTitle>
        <CardDescription>
          {(!mediaFile || isReplacingMedia) ? t('aiGenerator.option2.descriptionDisabled') as string : t('aiGenerator.option2.descriptionEnabled') as string}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showApiKeyWarning && (
          <p className="text-destructive mt-1 text-xs">
            {t('aiGenerator.option2.apiKeyNeededMessage') as string}
          </p>
        )}
        <div>
          <Label htmlFor="full-transcription-language-select" className="flex items-center gap-1 mb-1 text-sm font-medium">
            <Languages className="h-4 w-4" />
            {t('aiGenerator.language.label') as string}
          </Label>
          <Select
            value={fullTranscriptionLanguageOverride}
            onValueChange={handleFullTranscriptionLanguageChange}
            disabled={!mediaFile || isReplacingMedia || isGeneratingFullTranscription || isAnyTranscriptionLoading || disableGenerateButtonDueToApiKeys}
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
             {fullTranscriptionProgress.chunkMessage && <p className="text-xs text-muted-foreground text-center">{fullTranscriptionProgress.chunkMessage}</p>}
          </div>
        ) : (
          <Button
            onClick={handleGenerateFullTranscription}
            disabled={!mediaFile || isReplacingMedia || isAnyTranscriptionLoading || disableGenerateButtonDueToApiKeys}
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
  ), [t, dir, mediaFile, isReplacingMedia, isGeneratingFullTranscription, isAnyTranscriptionLoading, fullTranscriptionLanguageOverride, handleFullTranscriptionLanguageChange, fullTranscriptionProgress, handleGenerateFullTranscription, showApiKeyWarning, disableGenerateButtonDueToApiKeys]);

  const memoizedMultiProcessGeneratorCard = useMemo(() => (
    <Card className={cn("shadow-lg", (!mediaFile || isReplacingMedia) && "opacity-60 pointer-events-none")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Zap className="h-6 w-6 text-purple-500" />
          {t('multiProcess.option3.title') as string}
        </CardTitle>
        <CardDescription>
          {(!mediaFile || isReplacingMedia) ? t('multiProcess.option3.descriptionDisabled') as string : t('multiProcess.option3.descriptionEnabled') as string}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showApiKeyWarning && (
          <p className="text-destructive mt-1 text-xs">
            {t('aiGenerator.option2.apiKeyNeededMessage') as string}
          </p>
        )}
        {/* Language selection for initial transcription is reused from Option 2's controls */}
        {isGeneratingMultiProcessTranscription && multiProcessTranscriptionProgress ? (
           <div className="space-y-2">
            <p className="text-sm font-medium text-center">
                {multiProcessTranscriptionProgress.statusMessage || t('multiProcess.status.initializing') as string}
            </p>
            {multiProcessTranscriptionProgress.stage === 'initial_transcription' && multiProcessTranscriptionProgress.initialTranscriptionProgress && (
                <>
                    <Progress value={multiProcessTranscriptionProgress.initialTranscriptionProgress.percentage} className="w-full" />
                    <p className="text-xs text-muted-foreground text-center">
                        {t('aiGenerator.progress.chunkInfo', { 
                            currentChunk: multiProcessTranscriptionProgress.initialTranscriptionProgress.currentChunk, 
                            totalChunks: multiProcessTranscriptionProgress.initialTranscriptionProgress.totalChunks, 
                            percentage: multiProcessTranscriptionProgress.initialTranscriptionProgress.percentage 
                        }) as string}
                        {multiProcessTranscriptionProgress.initialTranscriptionProgress.currentStage && ` (${multiProcessTranscriptionProgress.initialTranscriptionProgress.currentStage})`}
                    </p>
                </>
            )}
            {multiProcessTranscriptionProgress.stage === 'segment_refinement' && multiProcessTranscriptionProgress.segmentRefinementProgress && (
                <>
                    <Progress value={
                        (multiProcessTranscriptionProgress.segmentRefinementProgress.completedSegments / multiProcessTranscriptionProgress.segmentRefinementProgress.totalSegments) * 100
                    } className="w-full" />
                     <p className="text-xs text-muted-foreground text-center">
                        {t('multiProcess.status.stage2ProgressDetailed', { 
                            completed: multiProcessTranscriptionProgress.segmentRefinementProgress.completedSegments, 
                            total: multiProcessTranscriptionProgress.segmentRefinementProgress.totalSegments,
                            successful: multiProcessTranscriptionProgress.segmentRefinementProgress.refinedSuccessfully,
                            failed: multiProcessTranscriptionProgress.segmentRefinementProgress.failedToRefine,
                        }) as string}
                    </p>
                </>
            )}
            {(multiProcessTranscriptionProgress.stage === 'complete' || multiProcessTranscriptionProgress.stage === 'error') && (
                <p className="text-sm text-center text-muted-foreground">{multiProcessTranscriptionProgress.statusMessage}</p>
            )}
          </div>
        ) : (
          <Button
            onClick={handleGenerateMultiProcessTranscription}
            disabled={!mediaFile || isReplacingMedia || isAnyTranscriptionLoading || disableGenerateButtonDueToApiKeys}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
            aria-label={t('multiProcess.button.generate') as string}
          >
            {isGeneratingMultiProcessTranscription ? (
              <>
                <Loader2 className={cn("h-4 w-4 animate-spin", dir === 'rtl' ? 'ms-2' : 'me-2')} />
                {t('multiProcess.button.generatingSimple') as string}
              </>
            ) : (
              <>
                <Zap className={cn("h-4 w-4", dir === 'rtl' ? 'ms-2' : 'me-2')} />
                {t('multiProcess.button.generate') as string}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [t, dir, mediaFile, isReplacingMedia, isGeneratingMultiProcessTranscription, isAnyTranscriptionLoading, fullTranscriptionLanguageOverride, handleFullTranscriptionLanguageChange, multiProcessTranscriptionProgress, handleGenerateMultiProcessTranscription, showApiKeyWarning, disableGenerateButtonDueToApiKeys]);


  return (
    <>
      {memoizedSubtitleUploaderCard}
      {memoizedAIGeneratorCard}
      {memoizedMultiProcessGeneratorCard}
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
            disabled={!mediaFile || subtitleTracksLength === 0 || isGeneratingFullTranscription || isGeneratingMultiProcessTranscription || isReplacingMedia}
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
