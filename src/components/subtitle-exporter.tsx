
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DownloadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateSrt, generateVtt } from '@/lib/subtitle-utils';
import type { SubtitleTrack, SubtitleFormat } from '@/lib/types';

interface SubtitleExporterProps {
  activeTrack: SubtitleTrack | null;
  disabled?: boolean;
}

export function SubtitleExporter({ activeTrack, disabled }: SubtitleExporterProps) {
  const { toast } = useToast();

  const handleExport = (format: SubtitleFormat) => {
    if (!activeTrack || activeTrack.entries.length === 0) {
      toast({ title: "Nothing to export", description: "Please select an active track with subtitles.", variant: "destructive" });
      return;
    }

    const baseName = activeTrack.fileName ? activeTrack.fileName.substring(0, activeTrack.fileName.lastIndexOf('.')) || activeTrack.fileName : 'subtitles';
    const outputFileName = `${baseName}.${format}`;
    
    let content: string;
    if (format === 'srt') {
      content = generateSrt(activeTrack.entries);
    } else {
      content = generateVtt(activeTrack.entries);
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
          Export Active Subtitle Track
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Export your edited subtitles for the active track ({activeTrack?.fileName || 'N/A'}).
          Original format was {activeTrack ? `.${activeTrack.format.toUpperCase()}` : 'N/A'}.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('srt')} className="flex-1" disabled={disabled}>
            Export as .SRT
          </Button>
          <Button onClick={() => handleExport('vtt')} className="flex-1" disabled={disabled}>
            Export as .VTT
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
