
"use client";

import type React from 'react';
import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle, CaptionsIcon } from 'lucide-react'; // Using CaptionsIcon as a generic icon
import type { SubtitleEntry, SubtitleTrack } from '@/lib/types';

interface SubtitleEditorProps {
  activeTrack: SubtitleTrack | null;
  onSubtitleChange: (entryId: string, newEntryData: Partial<Omit<SubtitleEntry, 'id'>>) => void;
  onSubtitleAdd: () => void;
  onSubtitleDelete: (entryId: string) => void;
  currentTime: number;
  disabled?: boolean;
}

const EDITOR_WINDOW_SECONDS = 5; // Show 5 seconds before and 5 after current time

export function SubtitleEditor({
  activeTrack,
  onSubtitleChange,
  onSubtitleAdd,
  onSubtitleDelete,
  currentTime,
  disabled
}: SubtitleEditorProps) {

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

  const entriesToDisplay = useMemo(() => {
    if (!activeTrack) return [];
    const windowStart = Math.max(0, currentTime - EDITOR_WINDOW_SECONDS);
    const windowEnd = currentTime + EDITOR_WINDOW_SECONDS;

    return activeTrack.entries
      .filter(entry => entry.endTime >= windowStart && entry.startTime <= windowEnd)
      .sort((a, b) => a.startTime - b.startTime); // Ensure sorted display within the window
  }, [activeTrack, currentTime]);

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-xl">
          <div className="flex items-center gap-2">
            <CaptionsIcon className="h-6 w-6 text-primary"/>
            Subtitle Editor {activeTrack ? `(${activeTrack.fileName})` : ''}
          </div>
          <Button onClick={onSubtitleAdd} size="sm" disabled={disabled} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {disabled && !activeTrack && (
             <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                    Upload media and select a subtitle track to begin editing.
                </p>
            </div>
          )}
          {!disabled && activeTrack && entriesToDisplay.length === 0 && (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                    No subtitles in the current time window ({EDITOR_WINDOW_SECONDS*2}s). <br/>
                    Try adding a new subtitle or adjust media playback time.
                </p>
            </div>
          )}
          {!disabled && activeTrack && entriesToDisplay.length > 0 && (
            <div className="space-y-4">
              {entriesToDisplay.map((entry) => {
                const isActiveInPlayer = currentTime >= entry.startTime && currentTime <= entry.endTime;
                return (
                  <div 
                    key={entry.id} 
                    className={`p-3 border rounded-lg shadow-sm ${isActiveInPlayer ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
                  >
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
                          disabled={disabled}
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
                          disabled={disabled}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onSubtitleDelete(entry.id)} 
                        aria-label="Delete subtitle" 
                        className="self-end text-destructive hover:bg-destructive/10" 
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <label htmlFor={`text-${entry.id}`} className="text-xs font-medium text-muted-foreground">Text</label>
                      <Textarea
                        id={`text-${entry.id}`}
                        value={entry.text}
                        onChange={(e) => handleFieldChange(entry.id, 'text', e.target.value)}
                        rows={2}
                        className="text-sm"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
