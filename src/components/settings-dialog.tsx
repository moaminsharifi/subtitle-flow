
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings, OpenAIModelType, LogEntry, LanguageCode, Theme, Language } from '@/lib/types';
import { LANGUAGE_OPTIONS, THEME_KEY, LANGUAGE_KEY, OPENAI_MODEL_KEY as MODEL_KEY_FOR_OPENAI, DEFAULT_TRANSCRIPTION_LANGUAGE_KEY } from '@/lib/types'; // Added specific keys
import { CheatsheetDialog } from '@/components/cheatsheet-dialog';
import { HelpCircle, Sun, Moon, Laptop, Languages } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
const GROQ_TOKEN_KEY = 'app-settings-groq-token';
// OPENAI_MODEL_KEY and DEFAULT_TRANSCRIPTION_LANGUAGE_KEY are already imported from types.ts


interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
}

export function SettingsDialog({ isOpen, onClose, addLog }: SettingsDialogProps) {
  const { t, language: currentAppLanguage, setLanguage: setAppLanguage, dir } = useTranslation();

  const [openAIToken, setOpenAIToken] = useState('');
  const [groqToken, setGroqToken] = useState('');
  const [openAIModel, setOpenAIModel] = useState<OpenAIModelType>('whisper-1');
  const [defaultTranscriptionLanguage, setDefaultTranscriptionLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const [selectedTheme, setSelectedTheme] = useState<Theme>('system');
  const [selectedAppLanguage, setSelectedAppLanguage] = useState<Language>(currentAppLanguage);
  const [isCheatsheetDialogOpen, setIsCheatsheetDialogOpen] = useState(false);
  const { toast } = useToast();

  const applyTheme = (themeToApply: Theme) => {
    localStorage.setItem(THEME_KEY, themeToApply);
    if (themeToApply === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeToApply === 'light') {
      document.documentElement.classList.remove('dark');
    } else { // system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    // addLog(`Theme changed to ${themeToApply}.`, "debug"); // Logging done by handleThemeChange
  };

  useEffect(() => {
    if (isOpen) {
      addLog("Settings dialog opened. Loading saved settings.", "debug");
      const storedOpenAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);
      const storedGroqToken = localStorage.getItem(GROQ_TOKEN_KEY);
      const storedOpenAIModel = localStorage.getItem(MODEL_KEY_FOR_OPENAI) as OpenAIModelType | null;
      const storedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
      const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      const storedAppLanguage = localStorage.getItem(LANGUAGE_KEY) as Language | null;

      if (storedOpenAIToken) setOpenAIToken(storedOpenAIToken);
      if (storedGroqToken) setGroqToken(storedGroqToken);
      setOpenAIModel(storedOpenAIModel || 'whisper-1');
      setDefaultTranscriptionLanguage(storedDefaultLang || "auto-detect");
      setSelectedTheme(storedTheme || 'system');
      setSelectedAppLanguage(storedAppLanguage || 'en');

      addLog(`Settings loaded: OpenAI Model - ${storedOpenAIModel || 'whisper-1 (default)'}. Default Transcription Language - ${storedDefaultLang || 'auto-detect'}. Theme - ${storedTheme || 'system'}. App Language - ${storedAppLanguage || 'en'}. OpenAI Token: ${storedOpenAIToken ? 'Set' : 'Not Set'}. Groq Token: ${storedGroqToken ? 'Set' : 'Not Set'}.`, "debug");
    }
  }, [isOpen, addLog]);


  const handleThemeChange = (newTheme: Theme) => {
    setSelectedTheme(newTheme);
    applyTheme(newTheme); // Apply theme immediately on selection
    addLog(`Theme selection changed to ${newTheme} and applied.`, "debug");
  };

  const handleAppLanguageChange = (newLang: Language) => {
    setSelectedAppLanguage(newLang);
    // No immediate application here for app language, will be applied on save
    addLog(`App language selection changed to ${newLang}.`, "debug");
  };

  const handleSave = () => {
    localStorage.setItem(OPENAI_TOKEN_KEY, openAIToken);
    localStorage.setItem(GROQ_TOKEN_KEY, groqToken);
    localStorage.setItem(MODEL_KEY_FOR_OPENAI, openAIModel);
    localStorage.setItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, defaultTranscriptionLanguage);
    
    // Theme is already applied and saved by handleThemeChange, but ensure it's saved if not touched
    localStorage.setItem(THEME_KEY, selectedTheme);

    if (currentAppLanguage !== selectedAppLanguage) {
      setAppLanguage(selectedAppLanguage); // This will update context and save to localStorage
    } else {
      // Ensure it's saved even if it wasn't "changed" from the initial load of the dialog
      // but might be different from a previous session's save if user only changes language
      localStorage.setItem(LANGUAGE_KEY, selectedAppLanguage);
    }

    const message = `Settings Saved. Theme: ${selectedTheme}. App Language: ${selectedAppLanguage}. OpenAI Model: ${openAIModel}. Default Language: ${defaultTranscriptionLanguage}. OpenAI Token: ${openAIToken ? 'Set' : 'Not Set'}. Groq Token: ${groqToken ? 'Set' : 'Not Set'}.`;
    toast({
      title: t('settings.toast.saved'),
      description: t('settings.toast.savedDescription'),
      duration: 5000,
    });
    addLog(message, 'success');
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[85vh]" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('settings.title')}</DialogTitle>
            <DialogDescription>
              {t('settings.description')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-grow my-1 pr-2">
            {/* Single wrapper div for all scrollable content */}
            <div>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{t('settings.theme.label')}</Label>
                  <RadioGroup
                    value={selectedTheme}
                    onValueChange={(value: string) => handleThemeChange(value as Theme)}
                    className="grid grid-cols-3 gap-2"
                    dir={dir}
                  >
                    {[
                      { value: 'light', label: t('settings.theme.light'), icon: Sun },
                      { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
                      { value: 'system', label: t('settings.theme.system'), icon: Laptop },
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
                  <Label className="text-base font-semibold flex items-center gap-1">
                      <Languages className="h-5 w-5"/>
                      {t('settings.language.label')}
                  </Label>
                  <Select
                      value={selectedAppLanguage}
                      onValueChange={(value) => handleAppLanguageChange(value as Language)}
                      dir={dir}
                  >
                      <SelectTrigger className="w-full" aria-label={t('settings.language.label')}>
                          <SelectValue placeholder="Select application language" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="en">{t('settings.language.english')}</SelectItem>
                          <SelectItem value="fa">{t('settings.language.persian')}</SelectItem>
                      </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-base font-semibold">{t('settings.apiConfig.label')}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                    <Label htmlFor="openai-token" className="md:text-right col-span-1">
                      {t('settings.apiConfig.openAIToken')}
                    </Label>
                    <Input
                      id="openai-token"
                      type="password"
                      value={openAIToken}
                      onChange={(e) => setOpenAIToken(e.target.value)}
                      className="col-span-1 md:col-span-3"
                      placeholder="sk-..."
                      aria-label={t('settings.apiConfig.openAIToken')}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                    <Label htmlFor="groq-token" className="md:text-right col-span-1">
                      {t('settings.apiConfig.groqToken')}
                    </Label>
                    <Input
                      id="groq-token"
                      type="password"
                      value={groqToken}
                      onChange={(e) => setGroqToken(e.target.value)}
                      className="col-span-1 md:col-span-3"
                      placeholder="gsk_..."
                      aria-label={t('settings.apiConfig.groqToken')}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                    <Label htmlFor="openai-model-select" className="md:text-right col-span-1">
                      {t('settings.apiConfig.openAIModel')}
                    </Label>
                    <Select
                      value={openAIModel}
                      onValueChange={(value: string) => setOpenAIModel(value as OpenAIModelType)}
                      dir={dir}
                    >
                      <SelectTrigger className="col-span-1 md:col-span-3" id="openai-model-select" aria-label={t('settings.apiConfig.openAIModel')}>
                        <SelectValue placeholder="Select OpenAI model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whisper-1">whisper-1</SelectItem>
                        <SelectItem value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</SelectItem>
                        <SelectItem value="gpt-4o-transcribe">gpt-4o-transcribe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                    <Label htmlFor="default-language-select" className="md:text-right col-span-1">
                      {t('settings.apiConfig.defaultLanguage')}
                    </Label>
                    <Select
                      value={defaultTranscriptionLanguage}
                      onValueChange={(value) => setDefaultTranscriptionLanguage(value as LanguageCode | "auto-detect")}
                      dir={dir}
                    >
                      <SelectTrigger className="col-span-1 md:col-span-3" id="default-language-select" aria-label={t('settings.apiConfig.defaultLanguage')}>
                        <SelectValue placeholder="Select default transcription language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((langOpt) => (
                          <SelectItem key={langOpt.value} value={langOpt.value}>
                            {langOpt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="py-2 px-1">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsCheatsheetDialogOpen(true);
                    addLog("Cheatsheet dialog opened from settings.", "debug");
                  }}
                >
                  <HelpCircle className={dir === 'rtl' ? 'ms-2' : 'me-2'} />
                  {t('settings.cheatsheet.button')}
                </Button>
              </div>

              <Separator className="my-2" />

              <div className="px-1">
                  <h3 className="text-lg font-medium mb-2">{t('settings.credits.title')}</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                      <p>{t('settings.credits.builtWith')}</p>
                      <ul className="list-disc list-inside ps-4">
                          <li>Next.js by Vercel</li>
                          <li>React</li>
                          <li>ShadCN UI Components</li>
                          <li>Tailwind CSS</li>
                          <li>OpenAI API for transcription</li>
                      </ul>
                      <p className="mt-2">
                          {t('settings.credits.developedByFS')}
                      </p>
                      <p className="mt-2" dangerouslySetInnerHTML={{ __html: t('settings.credits.createdByAS', { '0': '<a href="https://github.com/moaminsharifi" target="_blank" rel="noopener noreferrer" class="underline hover:text-primary">' }) }} />
                  </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-auto pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => addLog("Settings changes cancelled.", "debug")}>
                {t('settings.buttons.cancel')}
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSave}>
              {t('settings.buttons.save')}
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
