"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DownloadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateSrt, generateVtt } from '@/lib/subtitle-utils';
import type { SubtitleEntry, SubtitleFormat } from '@/lib/types';

interface SubtitleExporterProps {
  subtitles: SubtitleEntry[];
  fileName: string | null;
  originalFormat: SubtitleFormat | null;
  disabled?: boolean;
}

export function SubtitleExporter({ subtitles, fileName, originalFormat, disabled }: SubtitleExporterProps) {
  const { toast } = useToast();

  const handleExport = (format: SubtitleFormat) => {
    if (subtitles.length === 0) {
      toast({ title: "Nothing to export", description: "Please add or upload subtitles first.", variant: "destructive" });
      return;
    }

    const baseName = fileName ? fileName.substring(0, fileName.lastIndexOf('.')) || fileName : 'subtitles';
    const outputFileName = `${baseName}.${format}`;
    
    let content: string;
    if (format === 'srt') {
      content = generateSrt(subtitles);
    } else {
      content = generateVtt(subtitles);
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Export Successful", description: `${outputFileName} downloaded.` });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <DownloadCloud className="h-6 w-6 text-primary" />
          Export Subtitles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Export your edited subtitles. The original format was {originalFormat ? `.${originalFormat.toUpperCase()}` : 'N/A'}.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('srt')} className="flex-1" disabled={disabled || subtitles.length === 0}>
            Export as .SRT
          </Button>
          <Button onClick={() => handleExport('vtt')} className="flex-1" disabled={disabled || subtitles.length === 0}>
            Export as .VTT
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
