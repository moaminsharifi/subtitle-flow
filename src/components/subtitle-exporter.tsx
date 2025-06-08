
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DownloadCloud, Languages, Loader2 } from 'lucide-react';
import { generateSrt, generateVtt } from '@/lib/subtitle-utils';
import type { SubtitleTrack, SubtitleFormat, LogEntry, LanguageCode } from '@/lib/types';
import { LANGUAGE_OPTIONS } from '@/lib/types';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface SubtitleExporterProps {
  activeTrack: SubtitleTrack | null;
  disabled?: boolean;
  addLog: (message: string, type?: LogEntry['type']) => void;
  onTranslateAndExport: (targetLanguageCode: LanguageCode) => Promise<void>;
  isTranslating: boolean;
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode;
  dir: 'ltr' | 'rtl';
}

export function SubtitleExporter({ 
    activeTrack, 
    disabled, 
    addLog, 
    onTranslateAndExport, 
    isTranslating,
    t,
    dir 
}: SubtitleExporterProps) {
  const { toast } = useToast();
  const [targetTranslationLanguage, setTargetTranslationLanguage] = useState<LanguageCode | ''>('');

  const translationLanguageOptions = LANGUAGE_OPTIONS.filter(lang => lang.value !== "auto-detect");

  const handleDirectExport = (format: SubtitleFormat) => {
    if (!activeTrack || activeTrack.entries.length === 0) {
      const msg = t('exporter.toast.nothingToExportDescription') as string;
      toast({ title: t('exporter.toast.nothingToExportTitle') as string, description: msg, variant: "destructive" });
      addLog(msg, 'warn');
      return;
    }

    addLog(`Direct export started for track: ${activeTrack.fileName}, Format: ${format.toUpperCase()}`, 'debug');
    const baseName = activeTrack.fileName ? activeTrack.fileName.substring(0, activeTrack.fileName.lastIndexOf('.') || activeTrack.fileName.length) : 'subtitles';
    const outputFileName = `${baseName}.${format}`;
    
    let content: string;
    if (format === 'srt') {
      content = generateSrt(activeTrack.entries);
    } else { // vtt
      content = generateVtt(activeTrack.entries);
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const successMsg = t('exporter.toast.directExportSuccessDescription', { fileName: outputFileName, count: activeTrack.entries.length }) as string;
    toast({ title: t('exporter.toast.directExportSuccessTitle') as string, description: successMsg });
    addLog(successMsg, 'success');
  };

  const handleTranslateAndExportClick = () => {
    if (!targetTranslationLanguage) {
        toast({ title: t('exporter.toast.selectLanguageTitle') as string, description: t('exporter.toast.selectLanguageDescription') as string, variant: "destructive" });
        return;
    }
    onTranslateAndExport(targetTranslationLanguage as LanguageCode);
  };

  const activeTrackFileName = activeTrack?.fileName || t('exporter.noActiveTrackName') as string;
  const activeTrackFormat = activeTrack?.format.toUpperCase() || 'N/A';
  const activeTrackCues = activeTrack?.entries.length || 0;

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <DownloadCloud className="h-6 w-6 text-primary" />
            {t('exporter.directExport.title') as string}
          </CardTitle>
          <CardDescription>
            {t('exporter.directExport.description', { 
                fileName: activeTrackFileName, 
                format: activeTrackFormat, 
                count: activeTrackCues 
            }) as string}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => handleDirectExport('srt')} className="flex-1" disabled={disabled || isTranslating}>
              {t('exporter.button.exportSRT') as string}
            </Button>
            <Button onClick={() => handleDirectExport('vtt')} className="flex-1" disabled={disabled || isTranslating}>
              {t('exporter.button.exportVTT') as string}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg mt-6 border-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Languages className="h-6 w-6 text-accent" />
            {t('exporter.translateExport.title') as string}
          </CardTitle>
           <CardDescription>
             {t('exporter.translateExport.description', { 
                fileName: activeTrackFileName, 
                count: activeTrackCues 
            }) as string}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="translate-language-select" className="mb-1 block">
                {t('exporter.translateExport.selectLanguageLabel') as string}
            </Label>
            <Select
              value={targetTranslationLanguage}
              onValueChange={(value) => setTargetTranslationLanguage(value as LanguageCode | '')}
              disabled={disabled || isTranslating || !activeTrack || activeTrack.entries.length === 0}
              dir={dir}
            >
              <SelectTrigger id="translate-language-select" className="w-full" aria-label={t('exporter.translateExport.selectLanguageLabel') as string}>
                <SelectValue placeholder={t('exporter.translateExport.selectLanguagePlaceholder') as string} />
              </SelectTrigger>
              <SelectContent>
                {translationLanguageOptions.map((langOpt) => (
                  <SelectItem key={langOpt.value} value={langOpt.value}>
                    {langOpt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleTranslateAndExportClick} 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" 
            disabled={disabled || isTranslating || !activeTrack || activeTrack.entries.length === 0 || !targetTranslationLanguage}
          >
            {isTranslating ? (
              <>
                <Loader2 className={cn("h-4 w-4 animate-spin", dir === 'rtl' ? 'ms-2' : 'me-2')} />
                {t('exporter.button.translating') as string}
              </>
            ) : (
              <>
                <Languages className={cn("h-4 w-4", dir === 'rtl' ? 'ms-2' : 'me-2')} />
                {t('exporter.button.translateAndExportSRT') as string}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
