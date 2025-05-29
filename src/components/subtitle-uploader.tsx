
"use client";

import type React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
// Button removed as it's not used here
import { Label } from '@/components/ui/label';
// Card, CardContent, CardHeader, CardTitle removed
// FileUp icon removed as the title is now handled by the parent
import { useToast } from '@/hooks/use-toast';
import { parseSrt, parseVtt } from '@/lib/subtitle-utils';
import type { SubtitleEntry, SubtitleFormat } from '@/lib/types';

interface SubtitleUploaderProps {
  onSubtitleUpload: (entries: SubtitleEntry[], fileName: string, format: SubtitleFormat) => void;
  disabled?: boolean;
}

export function SubtitleUploader({ onSubtitleUpload, disabled }: SubtitleUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let entries: SubtitleEntry[];
          let format: SubtitleFormat;

          if (file.name.endsWith('.srt')) {
            entries = parseSrt(content);
            format = 'srt';
          } else if (file.name.endsWith('.vtt')) {
            entries = parseVtt(content);
            format = 'vtt';
          } else {
            toast({ title: "Error", description: "Unsupported file format. Please upload SRT or VTT.", variant: "destructive" });
            return;
          }
          onSubtitleUpload(entries, file.name, format);
          // Toast moved to page.tsx for consistency with other uploads
        } catch (error) {
          toast({ title: "Parsing Error", description: `Failed to parse ${file.name}.`, variant: "destructive" });
          console.error("Parsing error:", error);
        }
      };
      reader.readAsText(file);
    } else {
      setFileName(null);
    }
    // Reset the input field value to allow uploading the same file again if needed
    event.target.value = '';
  };

  return (
    <div className="space-y-3"> {/* Provides internal spacing */}
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="subtitle-file-input" className="font-semibold">Subtitle File (.srt, .vtt)</Label>
        <Input 
          id="subtitle-file-input" 
          type="file" 
          accept=".srt,.vtt" 
          onChange={handleFileChange}
          className="file:text-primary file:font-semibold hover:file:bg-primary/10"
          disabled={disabled}
          aria-describedby="subtitle-file-description"
        />
        <p id="subtitle-file-description" className="text-sm text-muted-foreground sr-only">
          Select an SRT or VTT subtitle file to upload. Press Enter or Space to open file dialog when focused.
        </p>
      </div>
      {fileName && <p className="text-sm text-muted-foreground">Selected: {fileName}</p>}
      {!fileName && (
        <p className="text-sm text-muted-foreground">
          Select a .SRT or .VTT file.
        </p>
      )}
    </div>
  );
}
