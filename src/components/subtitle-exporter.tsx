
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, DownloadCloud } from 'lucide-react';
import { generateSrt, generateVtt } from '@/lib/subtitle-utils';
import type { SubtitleTrack, SubtitleFormat, LogEntry } from '@/lib/types';

interface SubtitleExporterProps {
  activeTrack: SubtitleTrack | null;
  disabled?: boolean;
  addLog: (message: string, type?: LogEntry['type']) => void;
}

export function SubtitleExporter({ activeTrack, disabled, addLog }: SubtitleExporterProps) {
  const { toast } = useToast();
  // Placeholder for available languages. In a real app, this might come from an API or config.
  const availableLanguages = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ja', name: 'Japanese' },
  ];

  const handleExport = (format: SubtitleFormat) => {
    if (!activeTrack || activeTrack.entries.length === 0) {
      const msg = "Nothing to export: Please select an active track with subtitles.";
      toast({ title: "Nothing to export", description: msg, variant: "destructive" });
      addLog(msg, 'warn');
      return;
    }

    addLog(`Export started for track: ${activeTrack.fileName}, Format: ${format.toUpperCase()}`, 'debug');
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

    const successMsg = `Export Successful: ${outputFileName} downloaded. Cues: ${activeTrack.entries.length}`;
    toast({ title: "Export Successful", description: successMsg });
    addLog(successMsg, 'success');
  };

  const handleTranslateAndExport = async (targetLanguageCode: string, targetLanguageName: string) => {
    if (!activeTrack || activeTrack.entries.length === 0) {
      const msg = "Nothing to translate: Please select an active track with subtitles.";
      toast({ title: "Nothing to translate", description: msg, variant: "destructive" });
      addLog(msg, 'warn');
      return;
    }

    addLog(`Translation started for track: ${activeTrack.fileName} to ${targetLanguageName}`, 'debug');
    // Placeholder for translation logic. This is where you would call your LLM.
    // This is a mock implementation that just appends the language code.
    const translatedEntries = activeTrack.entries.map(entry => ({
      ...entry,
      text: `${entry.text} [Translated to ${targetLanguageCode}]` // Replace with actual translation
    }));

    const baseName = activeTrack.fileName ? activeTrack.fileName.substring(0, activeTrack.fileName.lastIndexOf('.')) || activeTrack.fileName : 'subtitles';
    const outputFileName = `${baseName}.${targetLanguageCode}.srt`;
    const content = generateSrt(translatedEntries);

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const successMsg = `Translated and Exported: ${outputFileName} downloaded. Cues: ${translatedEntries.length}`;
    toast({ title: "Translation Successful", description: successMsg });
    addLog(successMsg, 'success');
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
          Contains {activeTrack?.entries.length || 0} cues.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('srt')} className="flex-1" disabled={disabled}>
            Export as .SRT
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex-1" disabled={disabled}>
                Export Translated .SRT <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {availableLanguages.map(lang => (
                <DropdownMenuItem key={lang.code} onClick={() => handleTranslateAndExport(lang.code, lang.name)}>
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => handleExport('vtt')} className="flex-1" disabled={disabled}>
            Export as .VTT
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
