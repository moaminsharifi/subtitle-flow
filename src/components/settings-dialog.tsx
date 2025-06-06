
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
import type { AppSettings, TranscriptionModelType, LogEntry, LanguageCode, Theme, Language, TranscriptionProvider, LLMProviderType, LLMModelType } from '@/lib/types';
import { 
  LANGUAGE_OPTIONS, THEME_KEY, LANGUAGE_KEY, TRANSCRIPTION_MODEL_KEY, 
  DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, OPENAI_TOKEN_KEY, GROQ_TOKEN_KEY, 
  TRANSCRIPTION_PROVIDER_KEY, AVALAI_TOKEN_KEY, MAX_SEGMENT_DURATION_KEY,
  LLM_MODEL_KEY, LLM_PROVIDER_KEY, OpenAIAvalAILLMModels, GroqLLMModels
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
  const [avalaiToken, setAvalaiToken] = useState('');

  const [showOpenAIToken, setShowOpenAIToken] = useState(false);
  const [showAvalAIToken, setShowAvalAIToken] = useState(false);
  const [showGroqToken, setShowGroqToken] = useState(false);

  const [transcriptionProvider, setTranscriptionProvider] = useState<TranscriptionProvider>('openai');
  const [llmProvider, setLlmProvider] = useState<LLMProviderType>('openai');
  
  const [transcriptionModel, setTranscriptionModel] = useState<TranscriptionModelType>('whisper-1');
  const [llmModel, setLlmModel] = useState<LLMModelType>(OpenAIAvalAILLMModels[0]);
  
  const [defaultTranscriptionLanguage, setDefaultTranscriptionLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const [selectedTheme, setSelectedTheme] = useState<Theme>('system');
  const [selectedAppLanguage, setSelectedAppLanguage] = useState<Language>(currentAppLanguage);
  
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
    if (llmProvider === 'groq') {
      return [...GroqLLMModels];
    }
    return [...OpenAIAvalAILLMModels];
  }, [llmProvider]);

  useEffect(() => {
    if (isOpen) {
      addLog("Settings dialog opened. Loading saved settings.", "debug");
      
      const storedTranscriptionProvider = localStorage.getItem(TRANSCRIPTION_PROVIDER_KEY) as TranscriptionProvider | null;
      const storedLlmProvider = localStorage.getItem(LLM_PROVIDER_KEY) as LLMProviderType | null;
      
      const currentTProvider = storedTranscriptionProvider || 'openai';
      const currentLProvider = storedLlmProvider || 'openai';
      setTranscriptionProvider(currentTProvider);
      setLlmProvider(currentLProvider);

      setOpenAIToken(localStorage.getItem(OPENAI_TOKEN_KEY) || '');
      setAvalaiToken(localStorage.getItem(AVALAI_TOKEN_KEY) || '');
      setGroqToken(localStorage.getItem(GROQ_TOKEN_KEY) || '');

      const storedTranscriptionModel = localStorage.getItem(TRANSCRIPTION_MODEL_KEY) as TranscriptionModelType | null;
      const currentTranscriptionModels = currentTProvider === 'groq' ? ['whisper-large-v3'] : ['whisper-1', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe'];
      setTranscriptionModel(storedTranscriptionModel && currentTranscriptionModels.includes(storedTranscriptionModel) ? storedTranscriptionModel : currentTranscriptionModels[0] as TranscriptionModelType);
      
      const storedLlmModel = localStorage.getItem(LLM_MODEL_KEY) as LLMModelType | null;
      const currentLlmModels = currentLProvider === 'groq' ? GroqLLMModels : OpenAIAvalAILLMModels;
      setLlmModel(storedLlmModel && currentLlmModels.includes(storedLlmModel) ? storedLlmModel : currentLlmModels[0]);

      setDefaultTranscriptionLanguage(localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect" || "auto-detect");
      setMaxSegmentDuration(parseInt(localStorage.getItem(MAX_SEGMENT_DURATION_KEY) || '60', 10));
      setTemperature(parseFloat(localStorage.getItem('app-settings-temperature') || '0.7'));
      
      const initialTheme = (localStorage.getItem(THEME_KEY) as Theme | null) || 'system';
      setSelectedTheme(initialTheme); 
      
      setSelectedAppLanguage((localStorage.getItem(LANGUAGE_KEY) as Language | null) || currentAppLanguage);
      addLog(`Settings loaded: Trans. Provider - ${currentTProvider}, LLM Provider - ${currentLProvider}, Trans. Model - ${transcriptionModel}, LLM Model - ${llmModel}. Default Lang - ${defaultTranscriptionLanguage}. Theme - ${initialTheme}. App Lang - ${selectedAppLanguage}. Max Seg Dur - ${maxSegmentDuration}s. Temp - ${temperature}.`, "debug");
    }
  }, [isOpen, addLog, currentAppLanguage]);


  useEffect(() => {
    if (!transcriptionModelOptions.includes(transcriptionModel)) {
      setTranscriptionModel(transcriptionModelOptions[0]);
      addLog(`Transcription model auto-adjusted to ${transcriptionModelOptions[0]} due to provider change.`, "debug");
    }
  }, [transcriptionProvider, transcriptionModel, transcriptionModelOptions, addLog]);

  useEffect(() => {
    if (!llmModelOptions.includes(llmModel)) {
      setLlmModel(llmModelOptions[0]);
      addLog(`LLM model auto-adjusted to ${llmModelOptions[0]} due to LLM provider change.`, "debug");
    }
  }, [llmProvider, llmModel, llmModelOptions, addLog]);


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
    // Validate maxSegmentDuration
    const validatedMaxSegmentDuration = Math.max(4, Math.min(360, maxSegmentDuration));
    if (maxSegmentDuration !== validatedMaxSegmentDuration) {
      toast({
        title: t('settings.toast.validationError') as string,
        description: t('settings.toast.maxSegmentDurationValidation', { min: 4, max: 360 }) as string,
        variant: 'destructive',
      });
    localStorage.setItem(LLM_PROVIDER_KEY, llmProvider);
    localStorage.setItem(TRANSCRIPTION_MODEL_KEY, transcriptionModel);
    localStorage.setItem(LLM_MODEL_KEY, llmModel);
    localStorage.setItem(MAX_SEGMENT_DURATION_KEY, maxSegmentDuration.toString());
    localStorage.setItem('app-settings-temperature', temperature.toString());
    
    if (openAIToken) localStorage.setItem(OPENAI_TOKEN_KEY, openAIToken); else localStorage.removeItem(OPENAI_TOKEN_KEY);
    if (avalaiToken) localStorage.setItem(AVALAI_TOKEN_KEY, avalaiToken); else localStorage.removeItem(AVALAI_TOKEN_KEY);
    if (groqToken) localStorage.setItem(GROQ_TOKEN_KEY, groqToken); else localStorage.removeItem(GROQ_TOKEN_KEY);
    
    localStorage.setItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, defaultTranscriptionLanguage);
    localStorage.setItem(THEME_KEY, selectedTheme);

    if (currentAppLanguage !== selectedAppLanguage) {
      setAppLanguage(selectedAppLanguage); 
    } else {
       localStorage.setItem(LANGUAGE_KEY, selectedAppLanguage); 
    }
    
    const toastDesc = t('settings.toast.savedDescription.v2', {
      theme: selectedTheme,
      appLanguage: selectedAppLanguage,
      transcriptionProvider,
      transcriptionModel,
      llmProvider,
      llmModel,
      defaultLanguage: defaultTranscriptionLanguage,
    });

    toast({
      title: t('settings.toast.saved') as string,
      description: typeof toastDesc === 'string' ? toastDesc : "Preferences saved.", 
      duration: 5000,
    });
    addLog(`Settings saved. Details: ${typeof toastDesc === 'string' ? toastDesc : JSON.stringify({transcriptionProvider, transcriptionModel, llmProvider, llmModel, defaultTranscriptionLanguage, selectedTheme, selectedAppLanguage, maxSegmentDuration: validatedMaxSegmentDuration, temperature}) }`, 'success');
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

                <div className="space-y-4">
                    <Label className="text-base font-semibold">{t('settings.transcriptionConfig.label') as string}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="transcription-provider-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                            {t('settings.transcriptionConfig.providerLabel') as string}
                        </Label>
                        <Select
                            value={transcriptionProvider}
                            onValueChange={(value: string) => setTranscriptionProvider(value as TranscriptionProvider)}
                            dir={dir}
                        >
                            <SelectTrigger id="transcription-provider-select" className="col-span-1 md:col-span-3" aria-label={t('settings.transcriptionConfig.providerLabel') as string}>
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
                        <Label htmlFor="transcription-model-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                            {t('settings.transcriptionConfig.modelLabel') as string}
                        </Label>
                        <Select
                            value={transcriptionModel}
                            onValueChange={(value: string) => setTranscriptionModel(value as TranscriptionModelType)}
                            dir={dir}
                        >
                            <SelectTrigger id="transcription-model-select" className="col-span-1 md:col-span-3" aria-label={t('settings.transcriptionConfig.modelLabel') as string}>
                                <SelectValue placeholder="Select transcription model" />
                            </SelectTrigger>
                            <SelectContent>
                                {transcriptionModelOptions.map(model => (
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
                </div>

                <Separator />

                <div className="space-y-4">
                    <Label className="text-base font-semibold">{t('settings.llmConfig.label') as string}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="llm-provider-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                            {t('settings.llmConfig.providerLabel') as string}
                        </Label>
                        <Select
                            value={llmProvider}
                            onValueChange={(value: string) => setLlmProvider(value as LLMProviderType)}
                            dir={dir}
                        >
                            <SelectTrigger id="llm-provider-select" className="col-span-1 md:col-span-3" aria-label={t('settings.llmConfig.providerLabel') as string}>
                                <SelectValue placeholder="Select LLM provider" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai">{t('settings.apiConfig.transcriptionProvider.openai')}</SelectItem>
                                <SelectItem value="avalai">{t('settings.apiConfig.transcriptionProvider.avalai')}</SelectItem>
                                <SelectItem value="groq">{t('settings.apiConfig.transcriptionProvider.groq')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="llm-model-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                            {t('settings.llmConfig.modelLabel') as string}
                        </Label>
                        <Select
                            value={llmModel}
                            onValueChange={(value: string) => setLlmModel(value as LLMModelType)}
                            dir={dir}
                        >
                            <SelectTrigger id="llm-model-select" className="col-span-1 md:col-span-3" aria-label={t('settings.llmConfig.modelLabel') as string}>
                                <SelectValue placeholder="Select LLM model" />
                            </SelectTrigger>
                            <SelectContent>
                                {llmModelOptions.map(model => (
                                    <SelectItem key={model} value={model}>{model}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <Separator />

                <div className="space-y-4">
                    <Label className="text-base font-semibold">{t('settings.apiKeyManagement.label') as string}</Label>
                    {/* OpenAI Token */}
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="openai-token-input" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                            {t('settings.apiKeyManagement.openAITokenLabel') as string}
                        </Label>
                        <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                            <Input
                                id="openai-token-input"
                                type={showOpenAIToken ? 'text' : 'password'}
                                value={openAIToken}
                                onChange={(e) => setOpenAIToken(e.target.value)}
                                className="flex-grow"
                                placeholder="sk-..."
                                aria-label={t('settings.apiKeyManagement.openAITokenLabel') as string}
                                dir={dir}
                            />
                            <Button variant="ghost" size="icon" onClick={() => setShowOpenAIToken(!showOpenAIToken)} aria-label={showOpenAIToken ? `Hide OpenAI Token` : `Show OpenAI Token`}>
                                {showOpenAIToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                    {/* AvalAI Token */}
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="avalai-token-input" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                            {t('settings.apiKeyManagement.avalaiTokenLabel') as string}
                        </Label>
                        <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                            <Input
                                id="avalai-token-input"
                                type={showAvalAIToken ? 'text' : 'password'}
                                value={avalaiToken}
                                onChange={(e) => setAvalaiToken(e.target.value)}
                                className="flex-grow"
                                placeholder={t('settings.apiConfig.avalaiTokenPlaceholder') as string}
                                aria-label={t('settings.apiKeyManagement.avalaiTokenLabel') as string}
                                dir={dir}
                            />
                            <Button variant="ghost" size="icon" onClick={() => setShowAvalAIToken(!showAvalAIToken)} aria-label={showAvalAIToken ? `Hide AvalAI Token` : `Show AvalAI Token`}>
                                {showAvalAIToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                    {/* Groq Token */}
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="groq-token-input" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>
                            {t('settings.apiKeyManagement.groqTokenLabel') as string}
                        </Label>
                        <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                            <Input
                                id="groq-token-input"
                                type={showGroqToken ? 'text' : 'password'}
                                value={groqToken}
                                onChange={(e) => setGroqToken(e.target.value)}
                                className="flex-grow"
                                placeholder="gsk_..."
                                aria-label={t('settings.apiKeyManagement.groqTokenLabel') as string}
                                dir={dir}
                            />
                            <Button variant="ghost" size="icon" onClick={() => setShowGroqToken(!showGroqToken)} aria-label={showGroqToken ? `Hide Groq Token` : `Show Groq Token`}>
                                {showGroqToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="show-advanced-options" className={cn("md:text-end font-semibold text-base", dir === 'rtl' && "md:text-start")} dir={dir}>
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
                            min={4} // Set minimum to 4
                            max={360} // Set maximum to 360
                            value={Math.max(4, Math.min(360, maxSegmentDuration))} // Display validated value
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
                      onClose(); // Close settings dialog first
                      // Assuming CheatsheetDialog is managed by parent state, this will trigger it
                      // For direct control, a callback prop would be needed.
                      // For now, rely on parent component re-rendering to open cheatsheet if needed.
                      // Or, pass a prop to open cheatsheet: openCheatsheetDialog();
                      addLog("Cheatsheet button clicked from settings.", "debug");
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
