
"use client";

import { useState, useEffect } from 'react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings, OpenAIModelType, LogEntry, LanguageCode } from '@/lib/types';
import { LANGUAGE_OPTIONS } from '@/lib/types';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
}

const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
const GROQ_TOKEN_KEY = 'app-settings-groq-token'; // Kept for consistency if other features use it
const OPENAI_MODEL_KEY = 'app-settings-openai-model';
const DEFAULT_TRANSCRIPTION_LANGUAGE_KEY = 'app-settings-default-transcription-language';

export function SettingsDialog({ isOpen, onClose, addLog }: SettingsDialogProps) {
  const [openAIToken, setOpenAIToken] = useState('');
  const [groqToken, setGroqToken] = useState('');
  const [openAIModel, setOpenAIModel] = useState<OpenAIModelType>('whisper-1');
  const [defaultTranscriptionLanguage, setDefaultTranscriptionLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      addLog("Settings dialog opened. Loading saved settings.", "debug");
      const storedOpenAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);
      const storedGroqToken = localStorage.getItem(GROQ_TOKEN_KEY);
      const storedOpenAIModel = localStorage.getItem(OPENAI_MODEL_KEY) as OpenAIModelType | null;
      const storedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
      
      if (storedOpenAIToken) setOpenAIToken(storedOpenAIToken);
      if (storedGroqToken) setGroqToken(storedGroqToken);
      if (storedOpenAIModel) {
        setOpenAIModel(storedOpenAIModel);
      } else {
        setOpenAIModel('whisper-1'); 
      }
      if (storedDefaultLang) {
        setDefaultTranscriptionLanguage(storedDefaultLang);
      } else {
        setDefaultTranscriptionLanguage("auto-detect");
      }
      addLog(`Settings loaded: OpenAI Model - ${storedOpenAIModel || 'whisper-1 (default)'}. Default Language - ${storedDefaultLang || 'auto-detect'}. Token statuses: OpenAI - ${storedOpenAIToken ? 'Set' : 'Not Set'}, Groq - ${storedGroqToken ? 'Set' : 'Not Set'}.`, "debug");
    }
  }, [isOpen, addLog]);

  const handleSave = () => {
    localStorage.setItem(OPENAI_TOKEN_KEY, openAIToken);
    localStorage.setItem(GROQ_TOKEN_KEY, groqToken);
    localStorage.setItem(OPENAI_MODEL_KEY, openAIModel);
    localStorage.setItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, defaultTranscriptionLanguage);
    const message = `Settings Saved. OpenAI Model: ${openAIModel}. Default Language: ${defaultTranscriptionLanguage}. OpenAI Token: ${openAIToken ? 'Set' : 'Not Set'}. Groq Token: ${groqToken ? 'Set' : 'Not Set'}.`;
    toast({
      title: 'Settings Saved',
      description: 'Your API tokens and preferences have been saved to browser storage.',
    });
    addLog(message, 'success');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Manage your API tokens and preferences here. They will be stored securely in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="openai-token" className="text-right col-span-1">
              OpenAI Token
            </Label>
            <Input
              id="openai-token"
              type="password"
              value={openAIToken}
              onChange={(e) => setOpenAIToken(e.target.value)}
              className="col-span-3"
              placeholder="sk-..."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="groq-token" className="text-right col-span-1">
              Groq Token
            </Label>
            <Input
              id="groq-token"
              type="password"
              value={groqToken}
              onChange={(e) => setGroqToken(e.target.value)}
              className="col-span-3"
              placeholder="gsk_..."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="openai-model-select" className="text-right col-span-1">
              OpenAI Model
            </Label>
            <Select 
              value={openAIModel} 
              onValueChange={(value: OpenAIModelType) => setOpenAIModel(value)}
            >
              <SelectTrigger className="col-span-3" id="openai-model-select">
                <SelectValue placeholder="Select OpenAI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whisper-1">whisper-1</SelectItem>
                <SelectItem value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</SelectItem>
                <SelectItem value="gpt-4o-transcribe">gpt-4o-transcribe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="default-language-select" className="text-right col-span-1">
              Default Language
            </Label>
            <Select
              value={defaultTranscriptionLanguage}
              onValueChange={(value) => setDefaultTranscriptionLanguage(value as LanguageCode | "auto-detect")}
            >
              <SelectTrigger className="col-span-3" id="default-language-select">
                <SelectValue placeholder="Select default transcription language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => addLog("Settings changes cancelled.", "debug")}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
