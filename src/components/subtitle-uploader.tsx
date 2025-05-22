
"use client";

import type React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp } from 'lucide-react';
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
          toast({ title: "Success", description: `${file.name} uploaded and parsed.` });
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
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileUp className="h-6 w-6 text-primary" />
          Upload Existing Subtitle File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="subtitle-file" className="font-semibold">Subtitle File (.srt, .vtt)</Label>
          <Input 
            id="subtitle-file" 
            type="file" 
            accept=".srt,.vtt" 
            onChange={handleFileChange}
            className="file:text-primary file:font-semibold hover:file:bg-primary/10"
            disabled={disabled}
          />
        </div>
        {fileName && <p className="text-sm text-muted-foreground">Selected for upload: {fileName}</p>}
         {!fileName && <p className="text-sm text-muted-foreground">Or use the AI generation option below if media is loaded.</p>}
      </CardContent>
    </Card>
  );
}
