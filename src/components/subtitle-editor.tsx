
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress'; 
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Trash2, PlusCircle, CaptionsIcon, Wand2, Loader2, PlayCircle, Languages } from 'lucide-react';
import type { SubtitleEntry, SubtitleTrack } from '@/lib/types';
import { LANGUAGE_OPTIONS } from '@/lib/types'; 
import { useTranslation } from '@/contexts/LanguageContext';


interface SubtitleEditorProps {
  LLM_PROVIDER_KEY: string | null; 
  activeTrack: SubtitleTrack | null;
  onSubtitleChange: (entryId: string, newEntryData: Partial<Omit<SubtitleEntry, 'id'>>) => void;
  onSubtitleAdd: () => void;
  onSubtitleDelete: (entryId: string) => void;
  onRegenerateTranscription: (entryId: string) => void;
  isEntryTranscribing: (entryId: string) => boolean; // Indicates if a specific entry is being transcribed
  isAnyTranscriptionLoading?: boolean; // Indicates if any AI task (full or segment) is running
  currentTime: number;
  disabled?: boolean; // General disable state for editor (e.g., no media, or full transcription running)
  onTranslateSubtitles: (targetLanguage: string) => Promise<void>; 
  handleSeekPlayer: (timeInSeconds: number) => void;
}


const ENTRIES_PER_PAGE = 100; 

export function SubtitleEditor({
  LLM_PROVIDER_KEY, 
  activeTrack,
  onSubtitleChange,
  onSubtitleAdd,
  onSubtitleDelete,
  onRegenerateTranscription,
  isEntryTranscribing,
  isAnyTranscriptionLoading, // This prop will be used to disable general interactions
  currentTime,
  disabled, // This prop is for fundamental disabling (no media/track or full transcription)
  onTranslateSubtitles, 
  handleSeekPlayer,
}: SubtitleEditorProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  const handleFieldChange = (entryId: string, field: keyof Omit<SubtitleEntry, 'id'>, value: string | number) => {
    if (field === 'startTime' || field === 'endTime') {
      const numValue = parseFloat(value as string);
      if (!isNaN(numValue)) {
        onSubtitleChange(entryId, { [field]: Math.max(0, numValue) });
      }
    } else {
      onSubtitleChange(entryId, { [field]: value });
    }
  };

  const startIndex = (currentPage - 1) * ENTRIES_PER_PAGE;
  const endIndex = startIndex + ENTRIES_PER_PAGE;

  const pagedEntries = useMemo(() => {
    if (!activeTrack) return [];
    return activeTrack.entries.slice(startIndex, endIndex);
  }, [activeTrack, startIndex, endIndex]); 

  const entriesToDisplay = pagedEntries;


  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-xl">
          <div className="flex items-center gap-2">
            <CaptionsIcon className="h-6 w-6 text-primary"/>
            {t('subtitleEditor.title') as string} {activeTrack ? `(${activeTrack.fileName})` : ''}
          </div>
          <Button 
            onClick={onSubtitleAdd} 
            size="sm" 
            disabled={disabled || isAnyTranscriptionLoading} // Disable if globally disabled OR any AI task is running
            className="bg-accent hover:bg-accent/90 text-accent-foreground" 
            aria-label={t('subtitleEditor.button.addNew') as string}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> {t('subtitleEditor.button.addNew') as string}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                disabled={disabled || isAnyTranscriptionLoading || !activeTrack || !LLM_PROVIDER_KEY} 
                className="bg-blue-500 hover:bg-blue-600 text-white" 
                aria-label="Translate all subtitles"
              >
                <Languages className="mr-2 h-4 w-4" /> {t('subtitleEditor.button.translateAll') as string || "Translate All"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {LANGUAGE_OPTIONS.filter(langOpt => langOpt.value !== "auto-detect").map((langOpt) => (
                <DropdownMenuItem
                  key={langOpt.value}
                  onClick={() => onTranslateSubtitles(langOpt.value)}
                >
                  {langOpt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          <ScrollBar orientation="vertical" />
          
          {disabled && ( // Global disable (no media, no track, or full transcription)
             <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center">
                    {t('subtitleEditor.placeholder.noTrack') as string}
                </p>
            </div>
          )}

          {!disabled && !activeTrack && ( // Editor is enabled, but no track is active
             <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center">
                    {t('subtitleEditor.placeholder.selectActiveTrack') as string}
                </p>
            </div>
          )}

          {!disabled && activeTrack && entriesToDisplay.length === 0 && ( // Editor enabled, track active, but track is empty
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                    {t('subtitleEditor.placeholder.emptyTrack') as string}
                </p>
            </div>
          )}

          {!disabled && activeTrack && entriesToDisplay.length > 0 && (
            <div className="space-y-4">
              {entriesToDisplay.map((entry, index) => {
                const isActiveInPlayer = currentTime >= entry.startTime && currentTime <= entry.endTime;
                const isThisEntryTranscribing = isEntryTranscribing(entry.id);
                // Controls for this entry are disabled if:
                // 1. Editor is globally disabled (prop `disabled`)
                // 2. Any AI transcription (full or other segment) is loading (`isAnyTranscriptionLoading`)
                // 3. This specific entry is being transcribed (`isThisEntryTranscribing`)
                const controlsDisabledForThisEntry = disabled || isAnyTranscriptionLoading || isThisEntryTranscribing;
                
                const entryLabel = `${t('subtitleEditor.entry.ariaBaseLabel') as string} ${index + 1 + startIndex} ${t('subtitleEditor.entry.ariaTimeLabel', {startTime: entry.startTime.toFixed(3), endTime: entry.endTime.toFixed(3)}) as string}`;
                return (
                  <div 
                    key={entry.id} 
                    className={`p-3 border rounded-lg shadow-sm ${isActiveInPlayer ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
                    aria-labelledby={`entry-label-${entry.id}`}
                  >
                    <span id={`entry-label-${entry.id}`} className="sr-only">{entryLabel}</span>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <label htmlFor={`start-${entry.id}`} className="text-xs font-medium text-muted-foreground">{t('subtitleEditor.entry.startTimeLabel') as string}</label>
                        <Input
                          id={`start-${entry.id}`}
                          type="number"
                          value={entry.startTime.toFixed(3)}
                          onChange={(e) => handleFieldChange(entry.id, 'startTime', e.target.value)}
                          step="0.001"
                          className="h-8 text-sm"
                          disabled={controlsDisabledForThisEntry}
                          aria-label={`${t('subtitleEditor.entry.startTimeLabel') as string} ${t('subtitleEditor.entry.ariaForEntry') as string} ${index + 1 + startIndex}`}
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor={`end-${entry.id}`} className="text-xs font-medium text-muted-foreground">{t('subtitleEditor.entry.endTimeLabel') as string}</label>
                        <Input
                          id={`end-${entry.id}`}
                          type="number"
                          value={entry.endTime.toFixed(3)}
                          onChange={(e) => handleFieldChange(entry.id, 'endTime', e.target.value)}
                          step="0.001"
                          className="h-8 text-sm"
                          disabled={controlsDisabledForThisEntry}
                          aria-label={`${t('subtitleEditor.entry.endTimeLabel') as string} ${t('subtitleEditor.entry.ariaForEntry') as string} ${index + 1 + startIndex}`}
                        />
                      </div>
                      <div className="flex self-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSeekPlayer(entry.startTime)}
                          aria-label={t('subtitleEditor.entry.seekPlayerAriaLabel', {startTime: entry.startTime.toFixed(3)}) as string}
                          className="text-green-500 hover:bg-green-500/10"
                          disabled={disabled || isAnyTranscriptionLoading} // Go to time should be possible even if this entry is transcribing
                          title={t('subtitleEditor.entry.seekPlayerTitle', {startTime: entry.startTime.toFixed(3)}) as string}
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRegenerateTranscription(entry.id)}
                          aria-label={t('subtitleEditor.entry.regenerateAriaLabel', {entryIndex: index + 1 + startIndex}) as string}
                          className="text-blue-500 hover:bg-blue-500/10"
                          disabled={controlsDisabledForThisEntry} // Disabled if this one is loading or any other AI task is loading
                          title={t('subtitleEditor.entry.regenerateTitle') as string}
                        >
                          {isThisEntryTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => onSubtitleDelete(entry.id)}
                          aria-label={t('subtitleEditor.entry.deleteAriaLabel', {entryIndex: index + 1 + startIndex}) as string}
                          className="text-destructive hover:bg-destructive/10"
                          disabled={controlsDisabledForThisEntry}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`text-${entry.id}`} className="text-xs font-medium text-muted-foreground">{t('subtitleEditor.entry.textLabel') as string}</label>
                      <Textarea
                        id={`text-${entry.id}`}
                        value={entry.text}
                        onChange={(e) => handleFieldChange(entry.id, 'text', e.target.value)}
                        rows={entry.text.split('\\n').length > 1 ? entry.text.split('\\n').length : 2} 
                        className="text-sm"
                        disabled={controlsDisabledForThisEntry}
                        aria-label={`${t('subtitleEditor.entry.textLabel') as string} ${t('subtitleEditor.entry.ariaForEntry') as string} ${index + 1 + startIndex}`}
                      />
                    </div>
                    {isThisEntryTranscribing && (
                      <Progress value={100} className="mt-2 h-2 animate-pulse" aria-label={t('subtitleEditor.entry.progressLabel') as string} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {!disabled && activeTrack && activeTrack.entries.length > ENTRIES_PER_PAGE && (
          <div className="flex justify-center items-center gap-4 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isAnyTranscriptionLoading} // Disable pagination if any AI task is running
              aria-label={t('subtitleEditor.pagination.previous') as string}
            >
              {t('subtitleEditor.pagination.previous') as string}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('subtitleEditor.pagination.pageInfo', {currentPage, totalPages: Math.ceil(activeTrack.entries.length / ENTRIES_PER_PAGE)})}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(activeTrack.entries.length / ENTRIES_PER_PAGE), prev + 1))}
              disabled={currentPage === Math.ceil(activeTrack.entries.length / ENTRIES_PER_PAGE) || isAnyTranscriptionLoading} // Disable pagination if any AI task is running
              aria-label={t('subtitleEditor.pagination.next') as string}
            >
              {t('subtitleEditor.pagination.next') as string}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

