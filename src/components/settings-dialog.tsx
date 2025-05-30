
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings, OpenAIModelType, LogEntry, LanguageCode, Theme } from '@/lib/types';
import { LANGUAGE_OPTIONS, THEME_KEY } from '@/lib/types';
import { CheatsheetDialog } from '@/components/cheatsheet-dialog';
import { HelpCircle, Sun, Moon, Laptop } from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
}

const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
const GROQ_TOKEN_KEY = 'app-settings-groq-token'; 
const OPENAI_MODEL_KEY = 'app-settings-openai-model';
const DEFAULT_TRANSCRIPTION_LANGUAGE_KEY = 'app-settings-default-transcription-language';


export function SettingsDialog({ isOpen, onClose, addLog }: SettingsDialogProps) {
  const [openAIToken, setOpenAIToken] = useState('');
  const [groqToken, setGroqToken] = useState('');
  const [openAIModel, setOpenAIModel] = useState<OpenAIModelType>('whisper-1');
  const [defaultTranscriptionLanguage, setDefaultTranscriptionLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const [selectedTheme, setSelectedTheme] = useState<Theme>('system');
  const [isCheatsheetDialogOpen, setIsCheatsheetDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      addLog("Settings dialog opened. Loading saved settings.", "debug");
      const storedOpenAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);
      const storedGroqToken = localStorage.getItem(GROQ_TOKEN_KEY);
      const storedOpenAIModel = localStorage.getItem(OPENAI_MODEL_KEY) as OpenAIModelType | null;
      const storedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
      const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      
      if (storedOpenAIToken) setOpenAIToken(storedOpenAIToken);
      if (storedGroqToken) setGroqToken(storedGroqToken);
      setOpenAIModel(storedOpenAIModel || 'whisper-1');
      setDefaultTranscriptionLanguage(storedDefaultLang || "auto-detect");
      setSelectedTheme(storedTheme || 'system');
      
      addLog(`Settings loaded: OpenAI Model - ${storedOpenAIModel || 'whisper-1 (default)'}. Default Language - ${storedDefaultLang || 'auto-detect'}. Theme - ${storedTheme || 'system'}. OpenAI Token: ${storedOpenAIToken ? 'Set' : 'Not Set'}. Groq Token: ${storedGroqToken ? 'Set' : 'Not Set'}.`, "debug");
    }
  }, [isOpen, addLog]);

  const applyTheme = (theme: Theme) => {
    localStorage.setItem(THEME_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      addLog("Theme changed to Dark.", "debug");
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      addLog("Theme changed to Light.", "debug");
    } else { // system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      addLog("Theme changed to System. Applied system preference.", "debug");
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setSelectedTheme(newTheme);
    // Immediate application handled by save, or could be done here too if desired
  };
  
  const handleSave = () => {
    localStorage.setItem(OPENAI_TOKEN_KEY, openAIToken);
    localStorage.setItem(GROQ_TOKEN_KEY, groqToken);
    localStorage.setItem(OPENAI_MODEL_KEY, openAIModel);
    localStorage.setItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, defaultTranscriptionLanguage);
    applyTheme(selectedTheme); // Apply and save theme
    
    const message = `Settings Saved. Theme: ${selectedTheme}. OpenAI Model: ${openAIModel}. Default Language: ${defaultTranscriptionLanguage}. OpenAI Token: ${openAIToken ? 'Set' : 'Not Set'}. Groq Token: ${groqToken ? 'Set' : 'Not Set'}.`;
    toast({
      title: 'Settings Saved',
      description: 'Your preferences have been saved to browser storage.',
      duration: 5000,
    });
    addLog(message, 'success');
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>Application Settings</DialogTitle>
            <DialogDescription>
              Manage your API tokens, theme, and other preferences here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Theme</Label>
              <RadioGroup
                value={selectedTheme}
                onValueChange={(value: string) => handleThemeChange(value as Theme)}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Laptop },
                ].map((item) => (
                  <Label
                    key={item.value}
                    htmlFor={`theme-${item.value}`}
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <RadioGroupItem value={item.value} id={`theme-${item.value}`} className="sr-only" />
                    <item.icon className="mb-1 h-5 w-5" />
                    {item.label}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-base font-semibold">API & Model Configuration</Label>
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
                  aria-label="OpenAI API Token Input"
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
                  aria-label="Groq API Token Input (optional)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="openai-model-select" className="text-right col-span-1">
                  OpenAI Model
                </Label>
                <Select 
                  value={openAIModel} 
                  onValueChange={(value: string) => setOpenAIModel(value as OpenAIModelType)}
                >
                  <SelectTrigger className="col-span-3" id="openai-model-select" aria-label="Select OpenAI Transcription Model">
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
                  <SelectTrigger className="col-span-3" id="default-language-select" aria-label="Select Default Transcription Language">
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
          </div>
          
          <Separator className="my-2" />
          
          <div className="py-2">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                setIsCheatsheetDialogOpen(true);
                addLog("Cheatsheet dialog opened from settings.", "debug");
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              View Keyboard Cheatsheet
            </Button>
          </div>

          <Separator className="my-2" />

          <div>
              <h3 className="text-lg font-medium mb-2">Credits</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                  <p>This application is proudly built with:</p>
                  <ul className="list-disc list-inside pl-4">
                      <li>Next.js by Vercel</li>
                      <li>React</li>
                      <li>ShadCN UI Components</li>
                      <li>Tailwind CSS</li>
                      <li>OpenAI API for transcription</li>
                  </ul>
                  <p className="mt-2">
                      Developed by the Firebase Studio AI.
                  </p>
              </div>
          </div>

          <DialogFooter className="mt-6">
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
      <CheatsheetDialog 
        isOpen={isCheatsheetDialogOpen} 
        onClose={() => {
          setIsCheatsheetDialogOpen(false);
          addLog("Cheatsheet dialog closed.", "debug");
        }} 
      />
    </>
  );
}
