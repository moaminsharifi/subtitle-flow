
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
import type { AppSettings, TranscriptionModelType, LogEntry, LanguageCode, Theme, Language, TranscriptionProvider, LLMModelType } from '@/lib/types';
import { 
  LANGUAGE_OPTIONS, THEME_KEY, LANGUAGE_KEY, TRANSCRIPTION_MODEL_KEY, 
  DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, OPENAI_TOKEN_KEY, GROQ_TOKEN_KEY, 
  TRANSCRIPTION_PROVIDER_KEY, AVALAI_TOKEN_KEY, MAX_SEGMENT_DURATION_KEY,
  LLM_MODEL_KEY, OpenAIAvalAILLMModels, GroqLLMModels
} from '@/lib/types';

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
  const [llmModel, setLlmModel] = useState<LLMModelType>(OpenAIAvalAILLMModels[0]);
  const [defaultTranscriptionLanguage, setDefaultTranscriptionLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const [selectedTheme, setSelectedTheme] = useState<Theme>('system');
  const [selectedAppLanguage, setSelectedAppLanguage] = useState<Language>(currentAppLanguage);
  const [isCheatsheetDialogOpen, setIsCheatsheetDialogOpen] = useState(false);

  const [showToken, setShowToken] = useState(false);

  const [maxSegmentDuration, setMaxSegmentDuration] = useState(60);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [temperature, setTemperature] = useState(0.7);

  const { toast } = useToast();

  const applyTheme = (themeToApply: Theme) => {
    localStorage.setItem(THEME_KEY, themeToApply);
    if (themeToApply === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeToApply === 'light') {
      document.documentElement.classList.remove('dark');
    } else { 
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const transcriptionModelOptions = useMemo(() => {
    if (transcriptionProvider === 'groq') {
      return ['whisper-large-v3'] as TranscriptionModelType[];
    }
    return ['whisper-1', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe'] as TranscriptionModelType[];
  }, [transcriptionProvider]);

  const llmModelOptions = useMemo((): LLMModelType[] => {
    if (transcriptionProvider === 'groq') {
      return [...GroqLLMModels];
    }
    return [...OpenAIAvalAILLMModels];
  }, [transcriptionProvider]);

  useEffect(() => {
    if (isOpen) {
      addLog("Settings dialog opened. Loading saved settings.", "debug");
      const storedOpenAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);
      const storedGroqToken = localStorage.getItem(GROQ_TOKEN_KEY);
      const storedTranscriptionProvider = localStorage.getItem(TRANSCRIPTION_PROVIDER_KEY) as TranscriptionProvider | null;
      const storedAvalaiToken = localStorage.getItem(AVALAI_TOKEN_KEY);
      const storedTranscriptionModel = localStorage.getItem(TRANSCRIPTION_MODEL_KEY) as TranscriptionModelType | null;
      const storedLlmModel = localStorage.getItem(LLM_MODEL_KEY) as LLMModelType | null;
      const storedDefaultLang = localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" | null;
      const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      const storedMaxSegmentDuration = localStorage.getItem(MAX_SEGMENT_DURATION_KEY);
      const storedAppLanguage = localStorage.getItem(LANGUAGE_KEY) as Language | null;
      const storedTemperature = localStorage.getItem('app-settings-temperature');

      const currentProvider = storedTranscriptionProvider || 'openai';
      setTranscriptionProvider(currentProvider);

      if (storedOpenAIToken) setOpenAIToken(storedOpenAIToken);
      if (storedGroqToken) setGroqToken(storedGroqToken);
      if (storedAvalaiToken) setAvalaiToken(storedAvalaiToken);
      
      const currentTranscriptionModels = currentProvider === 'groq' ? ['whisper-large-v3'] : ['whisper-1', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe'];
      setTranscriptionModel(storedTranscriptionModel && currentTranscriptionModels.includes(storedTranscriptionModel) ? storedTranscriptionModel : currentTranscriptionModels[0] as TranscriptionModelType);
      
      const currentLlmModels = currentProvider === 'groq' ? GroqLLMModels : OpenAIAvalAILLMModels;
      setLlmModel(storedLlmModel && currentLlmModels.includes(storedLlmModel) ? storedLlmModel : currentLlmModels[0]);

      setDefaultTranscriptionLanguage(storedDefaultLang || "auto-detect");
      setMaxSegmentDuration(storedMaxSegmentDuration ? parseInt(storedMaxSegmentDuration, 10) : 60);
      setTemperature(storedTemperature ? parseFloat(storedTemperature) : 0.7);
      const initialTheme = storedTheme || 'system';
      setSelectedTheme(initialTheme); 
      
      setSelectedAppLanguage(storedAppLanguage || currentAppLanguage);
      addLog(`Settings loaded: Provider - ${currentProvider}, Timestamp Model - ${transcriptionModel}. LLM Model - ${llmModel}. Default Transcription Lang - ${defaultTranscriptionLanguage}. Theme - ${initialTheme}. App Lang - ${selectedAppLanguage}. Max Segment Duration - ${maxSegmentDuration}s. Temperature - ${temperature}. Tokens set accordingly.`, "debug");
    }
  }, [isOpen, addLog, currentAppLanguage]);


  useEffect(() => {
    if (!transcriptionModelOptions.includes(transcriptionModel)) {
      setTranscriptionModel(transcriptionModelOptions[0]);
    }
  }, [transcriptionProvider, transcriptionModel, transcriptionModelOptions]);

  useEffect(() => {
    if (!llmModelOptions.includes(llmModel)) {
      setLlmModel(llmModelOptions[0]);
    }
  }, [transcriptionProvider, llmModel, llmModelOptions]);


  const handleThemeChange = (newTheme: Theme) => {
    setSelectedTheme(newTheme);
    applyTheme(newTheme);
    addLog(`Theme selection changed to ${newTheme} and applied.`, "debug");
  };

  const handleAppLanguageChange = (newLang: Language) => {
    setSelectedAppLanguage(newLang);
    addLog(`App language selection changed to ${newLang}. Will apply on save.`, "debug");
  };

  const handleSave = () => {
    localStorage.setItem(TRANSCRIPTION_PROVIDER_KEY, transcriptionProvider);
    localStorage.setItem(TRANSCRIPTION_MODEL_KEY, transcriptionModel);
    localStorage.setItem(LLM_MODEL_KEY, llmModel); // Save LLM Model
    localStorage.setItem(MAX_SEGMENT_DURATION_KEY, maxSegmentDuration.toString());
    localStorage.setItem('app-settings-temperature', temperature.toString());
    
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
      timestampModel: transcriptionModel, // Changed key for toast
      llmModel: llmModel, // Added LLM model to toast
      defaultLanguage: defaultTranscriptionLanguage,
      tokenStatus: getTokenStatusString(transcriptionProvider, openAIToken, avalaiToken, groqToken),
    });

    toast({
      title: t('settings.toast.saved') as string,
      description: typeof toastDesc === 'string' ? toastDesc : "Preferences saved.", 
      duration: 5000,
    });
    addLog(`Settings saved. Details: ${typeof toastDesc === 'string' ? toastDesc : JSON.stringify({transcriptionProvider, transcriptionModel, llmModel, defaultTranscriptionLanguage, selectedTheme, selectedAppLanguage, maxSegmentDuration, temperature}) }`, 'success');
    onClose();
  };

  const getTokenStatusString = (provider: TranscriptionProvider, oaiToken?: string, avToken?: string, grToken?: string): string => {
    switch(provider) {
      case 'openai': return oaiToken ? 'Set' : 'Not Set';
      case 'avalai': return avToken ? 'Set' : 'Not Set';
      case 'groq': return grToken ? 'Set' : 'Not Set';
      default: return 'N/A';
    }
  };
  
  const currentTokenValue = useMemo(() => {
    if (transcriptionProvider === 'openai') return openAIToken;
    if (transcriptionProvider === 'avalai') return avalaiToken;
    if (transcriptionProvider === 'groq') return groqToken;
    return '';
  }, [transcriptionProvider, openAIToken, avalaiToken, groqToken]);

  const handleTokenChange = (value: string) => {
    if (transcriptionProvider === 'openai') setOpenAIToken(value);
    else if (transcriptionProvider === 'avalai') setAvalaiToken(value);
    else if (transcriptionProvider === 'groq') setGroqToken(value);
  };

  const tokenInputPlaceholder = useMemo(() => {
    if (transcriptionProvider === 'openai') return "sk-...";
    if (transcriptionProvider === 'avalai') return t('settings.apiConfig.avalaiTokenPlaceholder') as string;
    if (transcriptionProvider === 'groq') return "gsk_...";
    return "";
  }, [transcriptionProvider, t]);

  const tokenLabel = useMemo(() => {
    if (transcriptionProvider === 'openai') return t('settings.apiConfig.openAIToken') as string;
    if (transcriptionProvider === 'avalai') return t('settings.apiConfig.avalaiToken') as string;
    if (transcriptionProvider === 'groq') return t('settings.apiConfig.groqToken') as string;
    return "API Token";
  }, [transcriptionProvider, t]);


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

                <div className="space-y-4">
                  <Label className="text-base font-semibold">{t('settings.apiConfig.label')}</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                      <Label htmlFor="transcription-provider-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                        {t('settings.apiConfig.transcriptionProvider.label')}
                      </Label>
                      <Select
                          value={transcriptionProvider}
                          onValueChange={(value: string) => {
                            const newProvider = value as TranscriptionProvider;
                            setTranscriptionProvider(newProvider);
                            // Reset token visibility when provider changes
                            setShowToken(false); 
                          }}
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                      <Label htmlFor="api-token-input" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          {tokenLabel}
                      </Label>
                      <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                          <Input
                              id="api-token-input"
                              type={showToken ? 'text' : 'password'}
                              value={currentTokenValue}
                              onChange={(e) => handleTokenChange(e.target.value)}
                              className="flex-grow"
                              placeholder={tokenInputPlaceholder}
                              aria-label={tokenLabel}
                              dir={dir}
                          />
                          <Button variant="ghost" size="icon" onClick={() => setShowToken(!showToken)} aria-label={showToken ? `Hide ${tokenLabel}` : `Show ${tokenLabel}`}>
                              {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </Button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                      <Label htmlFor="transcription-model-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          {t('settings.apiConfig.timestampModelLabel') as string}
                      </Label>
                      <Select
                          value={transcriptionModel}
                          onValueChange={(value: string) => setTranscriptionModel(value as TranscriptionModelType)}
                          dir={dir}
                          disabled={transcriptionProvider === 'groq'} 
                      >
                          <SelectTrigger id="transcription-model-select" className="col-span-1 md:col-span-3" aria-label={t('settings.apiConfig.timestampModelLabel') as string}>
                              <SelectValue placeholder="Select timestamp/transcription model" />
                          </SelectTrigger>
                          <SelectContent>
                              {transcriptionModelOptions.map(model => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                      <Label htmlFor="llm-model-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          {t('settings.apiConfig.llmModelLabel') as string}
                      </Label>
                      <Select
                          value={llmModel}
                          onValueChange={(value: string) => setLlmModel(value as LLMModelType)}
                          dir={dir}
                      >
                          <SelectTrigger id="llm-model-select" className="col-span-1 md:col-span-3" aria-label={t('settings.apiConfig.llmModelLabel') as string}>
                              <SelectValue placeholder="Select LLM model" />
                          </SelectTrigger>
                          <SelectContent>
                              {llmModelOptions.map(model => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                      <Label htmlFor="show-advanced-options" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          {t('settings.apiConfig.advancedOptions.toggleLabel') as string}
                      </Label>
                      <div className="col-span-1 md:col-span-3 flex items-center">
                          <Switch
                              id="show-advanced-options"
                              checked={showAdvancedOptions}
                              onCheckedChange={setShowAdvancedOptions}
                              aria-label={t('settings.apiConfig.advancedOptions.toggleAriaLabel') as string}
                          />
                      </div>
                  </div>

                  {showAdvancedOptions && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="temperature" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          {t('settings.apiConfig.advancedOptions.temperatureLabel') as string}
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
                          aria-label={t('settings.apiConfig.advancedOptions.temperatureAriaLabel') as string}
                          dir={dir}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="max-segment-duration" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                          {t('settings.apiConfig.advancedOptions.maxSegmentDurationLabel') as string}
                        </Label>
                        <Input
                          id="max-segment-duration"
                          type="number"
                          step="1"
                          min="1"
                          value={maxSegmentDuration}
                          onChange={(e) => setMaxSegmentDuration(parseInt(e.target.value, 10))}
                          className="col-span-1 md:col-span-3"
                          aria-label={t('settings.apiConfig.advancedOptions.maxSegmentDurationAriaLabel') as string}
                          dir={dir}
                        />
                      </div>
                    </>
                  )}
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
                    <h3 className="text-lg font-medium mb-3">{t('settings.credits.title')}</h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                         <p className="font-medium">{t('settings.credits.builtWith')}</p>
                        <ul className="list-disc list-inside ps-5 space-y-1">
                            <li>Next.js by Vercel</li>
                            <li>React</li>
                            <li>ShadCN UI Components</li>
                            <li>Tailwind CSS</li>
                            <li>OpenAI API for transcription</li>
                            <li>AvalAI API for transcription</li>
                            <li>Groq API for transcription</li>
                         </ul>
                        <p className="pt-2">
                            {t('settings.credits.codeDevelopedWith') as string} <a href="https://firebase.google.com/docs/studio" target='_blank' rel='noopener noreferrer' className='underline hover:text-primary'>Firebase Studio</a>.
                        </p>
                        <p>
                            {t('settings.credits.originalConceptBy') as string} <a href='https://github.com/moaminsharifi' target='_blank' rel='noopener noreferrer follow' className='underline hover:text-primary'>Amin Sharifi (moaminsharifi)</a>.
                        </p>
                        <p className="pt-2">
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
