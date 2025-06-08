
"use client";

import type React from 'react';
import type { SubtitleTrack, LogEntry, LanguageCode } from '@/lib/types';
import { SubtitleExporter } from '@/components/subtitle-exporter';
import { Card, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportStepControlsProps {
  activeTrack: SubtitleTrack | null;
  handleGoToEdit: () => void;
  handleGoToUpload: (reset?: boolean) => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode;
  dir: 'ltr' | 'rtl';
  onTranslateAndExport: (targetLanguageCode: LanguageCode) => Promise<void>;
  isTranslating: boolean;
}

export function ExportStepControls({
  activeTrack,
  handleGoToEdit,
  handleGoToUpload,
  addLog,
  t,
  dir,
  onTranslateAndExport,
  isTranslating,
}: ExportStepControlsProps) {

  const LeftArrowIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <>
      <SubtitleExporter
        activeTrack={activeTrack}
        disabled={!activeTrack || !activeTrack.entries.length || isTranslating}
        addLog={addLog}
        onTranslateAndExport={onTranslateAndExport}
        isTranslating={isTranslating}
        t={t}
        dir={dir}
      />
      <Card>
        <CardFooter className="p-4 flex flex-col sm:flex-row gap-2">
          <Button onClick={handleGoToEdit} variant="outline" className="w-full sm:w-auto" aria-label={t('page.button.editMore') as string} disabled={isTranslating}>
            <LeftArrowIcon className={cn("h-4 w-4", dir === 'rtl' ? 'ms-2' : 'me-2')} /> {t('page.button.editMore') as string}
          </Button>
          <Button onClick={() => handleGoToUpload(true)} variant="destructive" className="w-full sm:flex-1" aria-label={t('page.button.startOver') as string} disabled={isTranslating}>
            <RotateCcw className={cn("h-4 w-4", dir === 'rtl' ? 'ms-2' : 'me-2')} /> {t('page.button.startOver') as string}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
