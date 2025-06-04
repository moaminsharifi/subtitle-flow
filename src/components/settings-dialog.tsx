
"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import type { AppSettings, TranscriptionModelType, LogEntry, LanguageCode, Theme, Language, TranscriptionProvider } from '@/lib/types';
import { LANGUAGE_OPTIONS, THEME_KEY, LANGUAGE_KEY, TRANSCRIPTION_MODEL_KEY, DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, OPENAI_TOKEN_KEY, GROQ_TOKEN_KEY, TRANSCRIPTION_PROVIDER_KEY, AVALAI_TOKEN_KEY } from '@/lib/types';

import { HelpCircle, Sun, Moon, Laptop, Languages, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
}

export function SettingsDialog({ isOpen, onClose, addLog }: SettingsDialogProps) {
  const { t, language: currentAppLanguage, setLanguage: setAppLanguage, dir } = useTranslation();

  const [openAIToken, setOpenAIToken] = useState('');
  const [groqToken, setGroqToken] = useState('');
  const [transcriptionProvider, setTranscriptionProvider] = useState<TranscriptionProvider>('openai');
  const [avalaiToken, setAvalaiToken] = useState('');
  const [transcriptionModel, setTranscriptionModel] = useState<TranscriptionModelType>('whisper-1');
  const [defaultTranscriptionLanguage, setDefaultTranscriptionLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const [selectedTheme, setSelectedTheme] = useState<Theme>('system');
  const [selectedAppLanguage, setSelectedAppLanguage] = useState<Language>(currentAppLanguage);
  const [isCheatsheetDialogOpen, setIsCheatsheetDialogOpen] = useState(false);

  const [showOpenAIToken, setShowOpenAIToken] = useState(false);
  const [showGroqToken, setShowGroqToken] = useState(false);
  const [showAvalAIToken, setShowAvalAIToken] = useState(false);

  const [maxSegmentDuration, setMaxSegmentDuration] = useState(60); // Default max segment duration
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [temperature, setTemperature] = useState(0.7); // Default temperature

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
  };

  useEffect(() => {
    if (isOpen) {
      addLog("Settings dialog opened. Loading saved settings.", "debug");
      const storedOpenAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);
      const storedGroqToken = localStorage.getItem(GROQ_TOKEN_KEY);
      const storedTranscriptionProvider = localStorage.getItem(TRANSCRIPTION_PROVIDER_KEY) as TranscriptionProvider | null;
      const storedAvalaiToken = localStorage.getItem(AVALAI_TOKEN_KEY);
      const storedTranscriptionModel = localStorage.getItem(TRANSCRIPTION_MODEL_KEY) as TranscriptionModelType | null;
      const storedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
      const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      const storedMaxSegmentDuration = localStorage.getItem('app-settings-max-segment-duration'); // Assuming the key is defined elsewhere or use a literal
      const storedAppLanguage = localStorage.getItem(LANGUAGE_KEY) as Language | null;

      if (storedOpenAIToken) setOpenAIToken(storedOpenAIToken);
      if (storedGroqToken) setGroqToken(storedGroqToken);
      setTranscriptionProvider(storedTranscriptionProvider || 'openai');
      if (storedAvalaiToken) setAvalaiToken(storedAvalaiToken);
      setTranscriptionModel(storedTranscriptionModel || 'whisper-1');
      setDefaultTranscriptionLanguage(storedDefaultLang || "auto-detect");
      setMaxSegmentDuration(storedMaxSegmentDuration ? parseInt(storedMaxSegmentDuration, 10) : 60);
      const initialTheme = storedTheme || 'system';
      setSelectedTheme(initialTheme); 
      
      setSelectedAppLanguage(storedAppLanguage || currentAppLanguage);
      addLog(`Settings loaded: Provider - ${storedTranscriptionProvider || 'openai (default)'}, Model - ${storedTranscriptionModel || 'whisper-1 (default)'}. Default Transcription Language - ${storedDefaultLang || 'auto-detect'}. Theme - ${initialTheme}. App Language - ${storedAppLanguage || currentAppLanguage}. OpenAI Token: ${storedOpenAIToken ? 'Set' : 'Not Set'}. Groq Token: ${storedGroqToken ? 'Set' : 'Not Set'}. AvalAI Token: ${storedAvalaiToken ? 'Set' : 'Not Set'}.`, "debug");
    }
  }, [isOpen, addLog, currentAppLanguage]);


  const handleThemeChange = (newTheme: Theme) => {
    setSelectedTheme(newTheme);
    applyTheme(newTheme);
    addLog(`Theme selection changed to ${newTheme} and applied.`, "debug");
  };

  const handleAppLanguageChange = (newLang: Language) => {
    setSelectedAppLanguage(newLang);
    addLog(`App language selection changed to ${newLang}. Will apply on save.`, "debug");
  };

  const transcriptionModels = useMemo(() => {
    if (transcriptionProvider === 'groq') {
      return ['whisper-1'] as TranscriptionModelType[];
    }
    // Add other providers and their specific models here if needed
    return ['whisper-1', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe'] as TranscriptionModelType[];
  }, [transcriptionProvider]);

  useEffect(() => {
    if (!transcriptionModels.includes(transcriptionModel)) {
      setTranscriptionModel(transcriptionModels[0] || 'whisper-1');
    }
  }, [transcriptionProvider, transcriptionModel, transcriptionModels]);

  const handleSave = () => {
    localStorage.setItem(TRANSCRIPTION_PROVIDER_KEY, transcriptionProvider);
    localStorage.setItem(TRANSCRIPTION_MODEL_KEY, transcriptionModel);

    localStorage.setItem('app-settings-max-segment-duration', maxSegmentDuration.toString()); // Save max segment duration

    localStorage.removeItem(OPENAI_TOKEN_KEY);
    localStorage.removeItem(AVALAI_TOKEN_KEY);
    localStorage.removeItem(GROQ_TOKEN_KEY);
    
    if (transcriptionProvider === 'openai' && openAIToken) {
      localStorage.setItem(OPENAI_TOKEN_KEY, openAIToken);
    } else if (transcriptionProvider === 'avalai' && avalaiToken) {
      localStorage.setItem(AVALAI_TOKEN_KEY, avalaiToken);
    } else if (transcriptionProvider === 'groq' && groqToken) {
      localStorage.setItem(GROQ_TOKEN_KEY, groqToken);
    }
    
    localStorage.setItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, defaultTranscriptionLanguage);
    localStorage.setItem(THEME_KEY, selectedTheme);

    if (currentAppLanguage !== selectedAppLanguage) {
      setAppLanguage(selectedAppLanguage); 
    } else {
       localStorage.setItem(LANGUAGE_KEY, selectedAppLanguage); 
    }
    
    const savedMessageKey = 'settings.toast.savedDescription'; 
    const toastDesc = t(savedMessageKey, {
      theme: selectedTheme,
      appLanguage: selectedAppLanguage,
      transcriptionProvider: transcriptionProvider,
      transcriptionModel: transcriptionModel,
      defaultLanguage: defaultTranscriptionLanguage,
      openAITokenStatus: transcriptionProvider === 'openai' && openAIToken ? 'Set' : 'Not Set',
      avalaiTokenStatus: transcriptionProvider === 'avalai' && avalaiToken ? 'Set' : 'Not Set',
      groqTokenStatus: transcriptionProvider === 'groq' && groqToken ? 'Set' : 'Not Set'
    });

    toast({
      title: t('settings.toast.saved') as string,
      description: typeof toastDesc === 'string' ? toastDesc : "Preferences saved.", 
      duration: 5000,
 });
    addLog(`Settings saved. Details: ${typeof toastDesc === 'string' ? toastDesc : JSON.stringify({transcriptionProvider, transcriptionModel, defaultTranscriptionLanguage, selectedTheme, selectedAppLanguage}) }`, 'success');
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[85vh] min-h-[70vh]" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('settings.title')}</DialogTitle>
            <DialogDescription>
              {t('settings.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="my-1 flex-grow overflow-y-auto px-2 pr-3 min-h-0">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-6 py-4">
                
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{t('settings.theme.label')}</Label>
                  <RadioGroup
                    value={selectedTheme}
                    onValueChange={(value: string) => handleThemeChange(value as Theme)}
                    className="grid grid-cols-3 gap-2"
                    dir={dir}
                  >
                    {[
                      { value: 'light', label: t('settings.theme.light') as string, icon: Sun },
                      { value: 'dark', label: t('settings.theme.dark') as string, icon: Moon },
                      { value: 'system', label: t('settings.theme.system') as string, icon: Laptop },
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
                      <SelectTrigger className="w-full" aria-label={t('settings.language.label') as string}>
                          <SelectValue placeholder="Select application language" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="en">{t('settings.language.english')}</SelectItem>
                          <SelectItem value="fa">{t('settings.language.persian')}</SelectItem>
                      </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base font-semibold">{t('settings.apiConfig.label')}</Label>
                   <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                      <Label htmlFor="transcription-provider-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                        {t('settings.apiConfig.transcriptionProvider.label')}
                      </Label>
                      <Select
                          value={transcriptionProvider}
                          onValueChange={(value: string) => setTranscriptionProvider(value as TranscriptionProvider)}
                          dir={dir}
                      >
                          <SelectTrigger id="transcription-provider-select" className="col-span-1 md:col-span-3" aria-label={t('settings.apiConfig.transcriptionProvider.label') as string}>
                              <SelectValue placeholder="Select transcription provider" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="openai">{t('settings.apiConfig.transcriptionProvider.openai')}</SelectItem>
                              <SelectItem value="avalai">{t('settings.apiConfig.transcriptionProvider.avalai')}</SelectItem>
                              <SelectItem value="groq">{t('settings.apiConfig.transcriptionProvider.groq')}</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>

                  {transcriptionProvider === 'openai' && (
                      <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                          <Label htmlFor="openai-token" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                              {t('settings.apiConfig.openAIToken')}
                          </Label>
                          <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                              <Input
                                  id="openai-token"
                                  type={showOpenAIToken ? 'text' : 'password'}
                                  value={openAIToken}
                                  onChange={(e) => setOpenAIToken(e.target.value)}
                                  className="flex-grow"
                                  placeholder="sk-..."
                                  aria-label={t('settings.apiConfig.openAIToken') as string}
                                  dir={dir}
                              />
                              <Button variant="ghost" size="icon" onClick={() => setShowOpenAIToken(!showOpenAIToken)} aria-label={showOpenAIToken ? "Hide OpenAI token" : "Show OpenAI token"}>
                                  {showOpenAIToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </Button>
                          </div>
                      </div>
                  )}

                   {transcriptionProvider === 'avalai' && (
                      <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4" dir={dir}>
                          <Label htmlFor="avalai-token" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                              {t('settings.apiConfig.avalaiToken')}
                          </Label>
                          <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                              <Input
                                  id="avalai-token"
                                  type={showAvalAIToken ? 'text' : 'password'}
                                  value={avalaiToken || ''}
                                  onChange={(e) => setAvalaiToken(e.target.value)}
                                  className="flex-grow"
                                  placeholder={t('settings.apiConfig.avalaiTokenPlaceholder')as string}
                                  aria-label={t('settings.apiConfig.avalaiToken') as string}
                                  dir={dir}
                              />
                               <Button variant="ghost" size="icon" onClick={() => setShowAvalAIToken(!showAvalAIToken)} aria-label={showAvalAIToken ? "Hide AvalAI token" : "Show AvalAI token"}>
                                  {showAvalAIToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </Button>
                          </div>
                      </div>
                  )}

                  {transcriptionProvider === 'groq' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                      <Label htmlFor="groq-token" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                        {t('settings.apiConfig.groqToken')}
                      </Label>
                      <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                        <Input
                          id="groq-token"
                          type={showGroqToken ? 'text' : 'password'}
                          value={groqToken}
                          onChange={(e) => setGroqToken(e.target.value)}
                          className="flex-grow"
                          placeholder="gsk_..."
                          aria-label={t('settings.apiConfig.groqToken') as string}
                          dir={dir}
                        />
                        <Button variant="ghost" size="icon" onClick={() => setShowGroqToken(!showGroqToken)} aria-label={showGroqToken ? "Hide Groq token" : "Show Groq token"}>
                          {showGroqToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>
                  )}

                   <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                      <Label htmlFor="transcription-model-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          {t('settings.apiConfig.modelLabel')}
                      </Label>
                      <Select
                          value={transcriptionModel}
                          onValueChange={(value: string) => setTranscriptionModel(value as TranscriptionModelType)}
                          dir={dir}
                      >
                          <SelectTrigger id="transcription-model-select" className="col-span-1 md:col-span-3" aria-label={t('settings.apiConfig.modelLabel') as string}>
                              <SelectValue placeholder="Select AI model" />
                          </SelectTrigger>
                          <SelectContent>
                              {transcriptionModels.map(model => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>

                  {/* Advanced Options Toggle */}
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                      <Label htmlFor="show-advanced-options" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          Show Advanced Options
                      </Label>
                      <div className="col-span-1 md:col-span-3 flex items-center">
                          <Switch
                              id="show-advanced-options"
                              checked={showAdvancedOptions}
                              onCheckedChange={setShowAdvancedOptions}
                              aria-label="Toggle advanced transcription options"
                          />
                      </div>
                  </div>

                  {showAdvancedOptions && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                        <Label htmlFor="temperature" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          Temperature
                        </Label>
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="col-span-1 md:col-span-3"
                          aria-label="Transcription temperature setting"
                          dir={dir}
                        />
                      </div>

                      {/* Max Segment Duration Input */}
                      <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                        <Label htmlFor="max-segment-duration" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          Maximum Segment Duration (seconds)
                        </Label>
                        <Input
                          id="max-segment-duration"
                          type="number"
                          step="1"
                          min="1"
                          value={maxSegmentDuration}
                          onChange={(e) => setMaxSegmentDuration(parseInt(e.target.value, 10))}
                          className="col-span-1 md:col-span-3"
                          aria-label="Maximum transcription segment duration in seconds"
                          dir={dir}
                          disabled={false} // Enable this input
                        />

                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                    <Label htmlFor="default-language-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                      {t('settings.apiConfig.defaultLanguage')}
                    </Label>
                    <Select
                      value={defaultTranscriptionLanguage}
                      onValueChange={(value) => setDefaultTranscriptionLanguage(value as LanguageCode | "auto-detect")}
                      dir={dir}
                    >
                      <SelectTrigger className="col-span-1 md:col-span-3" id="default-language-select" aria-label={t('settings.apiConfig.defaultLanguage') as string}>
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

                <Separator />

                <div className="py-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsCheatsheetDialogOpen(true);
                      addLog("Cheatsheet dialog opened from settings.", "debug");
                    }}
                  >
                    <HelpCircle className={cn("h-4 w-4", dir === 'rtl' ? 'ms-2' : 'me-2')} />
                    {t('settings.cheatsheet.button')}
                  </Button>
                </div>

                <Separator />

                <div>
                    <h3 className="text-lg font-medium mb-2">{t('settings.credits.title')}</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                         <p>{t('settings.credits.builtWith')}</p>
                        <ul className="list-disc list-inside ps-4">
                            <li>Next.js by Vercel</li>
                            <li>React</li>
                            <li>ShadCN UI Components</li>
                            <li>Tailwind CSS</li>
                            <li>OpenAI API for transcription</li>
                            <li>AvalAI API for transcription</li>
                            <li>Groq API</li>
                         </ul>
                        <p className="mt-2">
                            {t('settings.credits.developedByFS')}
                        </p>
                        <p className="mt-2">{t('settings.credits.createdByAS')}</p>
                        <p className="mt-2">
                          {t('settings.credits.repository') as string} <a href='https://github.com/moaminsharifi/subtitle-flow' target='_blank' rel='noopener noreferrer' className='underline hover:text-primary'>github.com/moaminsharifi/subtitle-flow</a>
                        </p>
                        <p>
                          {t('settings.credits.website') as string} <a href='https://subtitile-flow.moaminsharifi.com/' target='_blank' rel='noopener noreferrer' className='underline hover:text-primary'>subtitile-flow.moaminsharifi.com</a>
                        </p>
                    </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="mt-auto pt-4 border-t border-border">
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
    </>
  );
}
