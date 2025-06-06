
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

interface SubtitleEditorProps {
  LLM_PROVIDER_KEY: string | null; // Add LLM provider key
  activeTrack: SubtitleTrack | null;
  onSubtitleChange: (entryId: string, newEntryData: Partial<Omit<SubtitleEntry, 'id'>>) => void;
  onSubtitleAdd: () => void;
  onSubtitleDelete: (entryId: string) => void;
  onRegenerateTranscription: (entryId: string) => void;
  isEntryTranscribing: (entryId: string) => boolean;
  isAnyTranscriptionLoading?: boolean;
  currentTime: number;
  disabled?: boolean; // General disable state for editor
  onTranslateSubtitles: (targetLanguage: string) => Promise<void>; // Add translation function
}

// const EDITOR_WINDOW_SECONDS = 5; // Show 5 seconds before and 5 after current time - No longer needed with full pagination

const ENTRIES_PER_PAGE = 100; // Number of entries to display per page

// SubtitleEditor component definition
export function SubtitleEditor({
  LLM_PROVIDER_KEY, // Destructure LLM provider key
  activeTrack,
  onSubtitleChange,
  onSubtitleAdd,
  onSubtitleDelete,
  onRegenerateTranscription,
  isEntryTranscribing,
  isAnyTranscriptionLoading,
  currentTime,
 disabled,
  onTranslateSubtitles, // Destructure translation function
  handleSeekPlayer,
}: SubtitleEditorProps) {

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
  }, [activeTrack, startIndex, endIndex]); // Added startIndex and endIndex to dependencies

  // This was `entriesToDisplay`, changed to `pagedEntries` to reflect the pagination
  const entriesToDisplay = pagedEntries;


  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-xl">
          <div className="flex items-center gap-2">
            <CaptionsIcon className="h-6 w-6 text-primary"/>
            Subtitle Editor {activeTrack ? `(${activeTrack.fileName})` : ''}
          </div>
          <Button onClick={onSubtitleAdd} size="sm" disabled={disabled || isAnyTranscriptionLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground" aria-label="Add new subtitle cue">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
          {/* One-Click Translate Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={disabled || isAnyTranscriptionLoading || !activeTrack || !LLM_PROVIDER_KEY} className="bg-blue-500 hover:bg-blue-600 text-white" aria-label="Translate all subtitles">
                <Languages className="mr-2 h-4 w-4" /> Translate All
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
          <ScrollBar orientation="vertical" /> {/* Ensure vertical scroll bar */}
          {disabled && !activeTrack && (
             <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center">
                    Upload media and select a subtitle track to begin editing.
                </p>
            </div>
          )}
          {!disabled && activeTrack && entriesToDisplay.length === 0 && (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                    No subtitles found or currently displayed.
                </p>
            </div>
          )}
          {!disabled && activeTrack && entriesToDisplay.length > 0 && (
            <div className="space-y-4">
              {entriesToDisplay.map((entry, index) => {
                const isActiveInPlayer = currentTime >= entry.startTime && currentTime <= entry.endTime;
                const isTranscribingThisEntry = isEntryTranscribing(entry.id);
                const disableRegenerate = disabled || isTranscribingThisEntry || isAnyTranscriptionLoading;
                const entryLabel = `Subtitle entry ${index + 1 + startIndex} from ${entry.startTime.toFixed(3)}s to ${entry.endTime.toFixed(3)}s`; // Adjusted index for pagination
                return (
                  <div 
                    key={entry.id} 
                    className={`p-3 border rounded-lg shadow-sm ${isActiveInPlayer ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
                    aria-labelledby={`entry-label-${entry.id}`}
 >
                    <span id={`entry-label-${entry.id}`} className="sr-only">{entryLabel}</span>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <label htmlFor={`start-${entry.id}`} className="text-xs font-medium text-muted-foreground">Start (s)</label>
                        <Input
                          id={`start-${entry.id}`}
                          type="number"
                          value={entry.startTime.toFixed(3)}
                          onChange={(e) => handleFieldChange(entry.id, 'startTime', e.target.value)}
                          step="0.001"
                          className="h-8 text-sm"
                          disabled={disabled || isTranscribingThisEntry || isAnyTranscriptionLoading}
                          aria-label={`Start time for ${entryLabel}`}
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor={`end-${entry.id}`} className="text-xs font-medium text-muted-foreground">End (s)</label>
                        <Input
                          id={`end-${entry.id}`}
                          type="number"
                          value={entry.endTime.toFixed(3)}
                          onChange={(e) => handleFieldChange(entry.id, 'endTime', e.target.value)}
                          step="0.001"
                          className="h-8 text-sm"
                          disabled={disabled || isTranscribingThisEntry || isAnyTranscriptionLoading}
                          aria-label={`End time for ${entryLabel}`}
                        />
                      </div>
                      <div className="flex self-end space-x-1">
                        {/* Go to Timestamp Button */}
 <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSeekPlayer(entry.startTime)}
                          aria-label={`Go to start time ${entry.startTime.toFixed(3)}s for ${entryLabel}`}
                          className="text-green-500 hover:bg-green-500/10"
                          disabled={disabled || isAnyTranscriptionLoading}
                          title={`Go to ${entry.startTime.toFixed(3)}s`}
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRegenerateTranscription(entry.id)}
                          aria-label={`Regenerate transcription for ${entryLabel}`}
                          className="text-blue-500 hover:bg-blue-500/10"
                          disabled={disableRegenerate}
                          title="Regenerate transcription for this segment"
                        >
                          {isTranscribingThisEntry ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => onSubtitleDelete(entry.id)}
                          aria-label={`Delete ${entryLabel}`}
                          className="text-destructive hover:bg-destructive/10"
                          disabled={disabled || isTranscribingThisEntry || isAnyTranscriptionLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`text-${entry.id}`} className="text-xs font-medium text-muted-foreground">Text</label>
                      <Textarea
                        id={`text-${entry.id}`}
                        value={entry.text}
                        onChange={(e) => handleFieldChange(entry.id, 'text', e.target.value)}
                        rows={entry.text.split('\\n').length > 1 ? entry.text.split('\\n').length : 2} // Adjust rows based on line breaks
                        className="text-sm"
                        disabled={disabled || isTranscribingThisEntry || isAnyTranscriptionLoading}
                        aria-label={`Text for ${entryLabel}`}
                      />
                    </div>
                    {isTranscribingThisEntry && (
                      <Progress value={100} className="mt-2 h-2 animate-pulse" aria-label="Transcription in progress" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {/* Pagination Controls */}
        {!disabled && activeTrack && activeTrack.entries.length > ENTRIES_PER_PAGE && (
          <div className="flex justify-center items-center gap-4 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || disabled || isAnyTranscriptionLoading}
              aria-label="Go to previous page"
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {Math.ceil(activeTrack.entries.length / ENTRIES_PER_PAGE)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(activeTrack.entries.length / ENTRIES_PER_PAGE), prev + 1))}
              disabled={currentPage === Math.ceil(activeTrack.entries.length / ENTRIES_PER_PAGE) || disabled || isAnyTranscriptionLoading}
              aria-label="Go to next page"
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

