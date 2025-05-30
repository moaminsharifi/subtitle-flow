
"use client";

import type React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext'; // Import useTranslation

interface MediaUploaderProps {
  onMediaUpload: (file: File, url: string, type: 'audio' | 'video', duration: number) => void;
  disabled?: boolean;
  className?: string;
}

export function MediaUploader({ onMediaUpload, disabled, className }: MediaUploaderProps) {
  const { t, dir } = useTranslation(); // Use translation hook
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('audio') ? 'audio' : 'video';
      
      const mediaElement = document.createElement(type);
      mediaElement.src = url;
      mediaElement.onloadedmetadata = () => {
        onMediaUpload(file, url, type, mediaElement.duration);
      };
      mediaElement.onerror = () => {
        // Fallback if duration can't be read, e.g. for some audio types immediately
        onMediaUpload(file, url, type, 0);
      }
    }
  };

  return (
    <Card className={cn("shadow-lg", className)} dir={dir}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <UploadCloud className="h-6 w-6 text-primary" />
          {t('mediaUploader.title')}
        </CardTitle>
        <CardDescription>{t('mediaUploader.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="media-file-input" className="font-semibold">{t('mediaUploader.label')}</Label>
          <Input 
            id="media-file-input" 
            type="file" 
            accept="audio/*,video/*" 
            onChange={handleFileChange} 
            className="file:text-primary file:font-semibold hover:file:bg-primary/10"
            disabled={disabled}
            aria-describedby="media-file-description" 
          />
           <p id="media-file-description" className="text-sm text-muted-foreground sr-only">
            {t('mediaUploader.description')}
          </p>
        </div>
        {fileName && <p className="text-sm text-muted-foreground">{t('mediaUploader.selected', { fileName })}</p>}
      </CardContent>
    </Card>
  );
}


    