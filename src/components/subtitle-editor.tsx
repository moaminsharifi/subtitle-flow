"use client";

import type React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle, Sparkles, Loader2 } from 'lucide-react';
import type { SubtitleEntry } from '@/lib/types';

interface SubtitleEditorProps {
  subtitles: SubtitleEntry[];
  onSubtitleChange: (index: number, newEntry: SubtitleEntry) => void;
  onSubtitleAdd: () => void;
  onSubtitleDelete: (index: number) => void;
  onAIAssist: (subtitleId: string) => Promise<void>;
  currentTime: number;
  isLoadingAIForId: string | null;
  disabled?: boolean;
}

export function SubtitleEditor({
  subtitles,
  onSubtitleChange,
  onSubtitleAdd,
  onSubtitleDelete,
  onAIAssist,
  currentTime,
  isLoadingAIForId,
  disabled
}: SubtitleEditorProps) {

  const handleFieldChange = (index: number, field: keyof SubtitleEntry, value: string | number) => {
    const entry = subtitles[index];
    if (field === 'startTime' || field === 'endTime') {
      const numValue = parseFloat(value as string);
      if (!isNaN(numValue)) {
        onSubtitleChange(index, { ...entry, [field]: Math.max(0, numValue) });
      }
    } else {
      onSubtitleChange(index, { ...entry, [field]: value });
    }
  };

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-xl">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12 6.52N.02 6.52C.02 6.52.02 6.52.02 6.52c-2.76 0-5 2.24-5 5s2.24 5 5 5h1c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1H2.5c-1.02 0-1.94-.73-2.4-1.69M19.5 22c-2.76 0-5-2.24-5-5s2.24-5 5-5h1c.55 0 1-.45 1-1V9c0-.55.45-1 1-1h2.5c1.02 0 1.94.73 2.4 1.69M12 2N12 2h12M2 12N2 12v12"/></svg>
            Subtitle Editor
          </div>
          <Button onClick={onSubtitleAdd} size="sm" disabled={disabled} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {subtitles.length === 0 ? (
             <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                    {disabled ? "Upload media first" : "Upload a subtitle file or add new entries."}
                </p>
            </div>
          ) : (
          <div className="space-y-4">
            {subtitles.map((entry, index) => {
              const isActive = currentTime >= entry.startTime && currentTime <= entry.endTime;
              return (
                <div key={entry.id} className={`p-3 border rounded-lg shadow-sm ${isActive ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <label htmlFor={`start-${entry.id}`} className="text-xs font-medium text-muted-foreground">Start (s)</label>
                      <Input
                        id={`start-${entry.id}`}
                        type="number"
                        value={entry.startTime.toFixed(3)}
                        onChange={(e) => handleFieldChange(index, 'startTime', e.target.value)}
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
                        onChange={(e) => handleFieldChange(index, 'endTime', e.target.value)}
                        step="0.001"
                        className="h-8 text-sm"
                        disabled={disabled}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onSubtitleDelete(index)} aria-label="Delete subtitle" className="self-end text-destructive hover:bg-destructive/10" disabled={disabled}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <label htmlFor={`text-${entry.id}`} className="text-xs font-medium text-muted-foreground">Text</label>
                    <Textarea
                      id={`text-${entry.id}`}
                      value={entry.text}
                      onChange={(e) => handleFieldChange(index, 'text', e.target.value)}
                      rows={2}
                      className="text-sm"
                      disabled={disabled}
                    />
                  </div>
                  <Button
                    onClick={() => onAIAssist(entry.id)}
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full text-accent-foreground border-accent hover:bg-accent/10"
                    disabled={disabled || isLoadingAIForId === entry.id}
                  >
                    {isLoadingAIForId === entry.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4 text-accent" />
                    )}
                    AI Timing Assist
                  </Button>
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
