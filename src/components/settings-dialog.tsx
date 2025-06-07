
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added Tabs
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import type { 
  AppSettings, TranscriptionModelType, LogEntry, LanguageCode, Theme, Language, 
  TranscriptionProvider, LLMProviderType, LLMModelType, WhisperModelType,
  AvalAIOpenAIBasedWhisperModels as AvalAIWhisper, // Alias for clarity
  AvalAIOpenAIBasedGPTModels as AvalAIGPT,
  AvalAIGeminiBasedModels as AvalAIGemini
} from '@/lib/types';
import { 
  LANGUAGE_OPTIONS, THEME_KEY, LANGUAGE_KEY, DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, 
  TRANSCRIPTION_PROVIDER_KEY, TRANSCRIPTION_MODEL_KEY, 
  LLM_PROVIDER_KEY, LLM_MODEL_KEY,
  OPENAI_TOKEN_KEY, AVALAI_TOKEN_KEY, GOOGLE_API_KEY_KEY, AVALAI_BASE_URL_KEY,
  MAX_SEGMENT_DURATION_KEY, TEMPERATURE_KEY, DEFAULT_AVALAI_BASE_URL,
  OpenAIWhisperModels, GroqWhisperModels, // Groq models were removed, but keeping for potential re-add
  GoogleGeminiLLModels, OpenAIGPTModels
} from '@/lib/types';

import { HelpCircle, Sun, Moon, Laptop, Languages, Eye, EyeOff, Bot, Info, KeyRound, Cog, Palette } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
}

export function SettingsDialog({ isOpen, onClose, addLog }: SettingsDialogProps) {
  const { t, language: currentAppLanguage, setLanguage: setAppLanguage, dir } = useTranslation();

  // API Keys & Base URL
  const [openAIToken, setOpenAIToken] = useState('');
  const [avalaiToken, setAvalaiToken] = useState('');
  const [avalaiBaseUrl, setAvalaiBaseUrl] = useState(DEFAULT_AVALAI_BASE_URL);
  const [googleApiKey, setGoogleApiKey] = useState('');

  // Visibility toggles for API keys
  const [showOpenAIToken, setShowOpenAIToken] = useState(false);
  const [showAvalAIToken, setShowAvalAIToken] = useState(false);
  const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);

  // Provider and Model selections
  const [transcriptionProvider, setTranscriptionProvider] = useState<TranscriptionProvider>('openai');
  const [transcriptionModel, setTranscriptionModel] = useState<TranscriptionModelType>(OpenAIWhisperModels[0]);
  
  const [llmProvider, setLlmProvider] = useState<LLMProviderType>('openai');
  const [llmModel, setLlmModel] = useState<LLMModelType>(OpenAIGPTModels[0]);
  
  // General settings
  const [defaultTranscriptionLanguage, setDefaultTranscriptionLanguage] = useState<LanguageCode | "auto-detect">("auto-detect");
  const [selectedTheme, setSelectedTheme] = useState<Theme>('system');
  const [selectedAppLanguage, setSelectedAppLanguage] = useState<Language>(currentAppLanguage);
  
  // Advanced settings
  const [maxSegmentDuration, setMaxSegmentDuration] = useState(60);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [temperature, setTemperature] = useState(0.7);

  const { toast } = useToast();

  const applyTheme = (themeToApply: Theme) => {
    localStorage.setItem(THEME_KEY, themeToApply);
    if (themeToApply === 'dark') document.documentElement.classList.add('dark');
    else if (themeToApply === 'light') document.documentElement.classList.remove('dark');
    else window.matchMedia('(prefers-color-scheme: dark)').matches ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
  };

  const transcriptionModelOptions = useMemo((): readonly TranscriptionModelType[] => {
    if (transcriptionProvider === 'openai') return OpenAIWhisperModels;
    if (transcriptionProvider === 'avalai_openai') return AvalAIWhisper;
    // if (transcriptionProvider === 'groq') return GroqWhisperModels; // Groq was removed
    return OpenAIWhisperModels; // Default
  }, [transcriptionProvider]);

  const llmModelOptions = useMemo((): readonly LLMModelType[] => {
    if (llmProvider === 'googleai') return GoogleGeminiLLModels;
    if (llmProvider === 'openai') return OpenAIGPTModels;
    if (llmProvider === 'avalai_openai') return AvalAIGPT;
    if (llmProvider === 'avalai_gemini') return AvalAIGemini;
    return OpenAIGPTModels; // Default
  }, [llmProvider]);

  useEffect(() => {
    if (isOpen) {
      addLog("Settings dialog opened. Loading saved settings.", "debug");
      let logMessage = "Loaded settings: ";
      try {
        const storedTranscriptionProvider = localStorage.getItem(TRANSCRIPTION_PROVIDER_KEY) as TranscriptionProvider | null;
        const validTranscriptionProviders: TranscriptionProvider[] = ['openai', 'avalai_openai']; // Groq removed
        const currentTProvider = storedTranscriptionProvider && validTranscriptionProviders.includes(storedTranscriptionProvider) ? storedTranscriptionProvider : 'openai';
        setTranscriptionProvider(currentTProvider);
        logMessage += `Trans. Provider - ${currentTProvider}, `;

        const storedLlmProvider = localStorage.getItem(LLM_PROVIDER_KEY) as LLMProviderType | null;
        const validLlmProviders: LLMProviderType[] = ['googleai', 'openai', 'avalai_openai', 'avalai_gemini'];
        const currentLProvider = storedLlmProvider && validLlmProviders.includes(storedLlmProvider) ? storedLlmProvider : 'openai';
        setLlmProvider(currentLProvider);
        logMessage += `LLM Provider - ${currentLProvider}, `;

        setOpenAIToken(localStorage.getItem(OPENAI_TOKEN_KEY) || '');
        setAvalaiToken(localStorage.getItem(AVALAI_TOKEN_KEY) || '');
        setAvalaiBaseUrl(localStorage.getItem(AVALAI_BASE_URL_KEY) || DEFAULT_AVALAI_BASE_URL);
        setGoogleApiKey(localStorage.getItem(GOOGLE_API_KEY_KEY) || '');

        let currentActualTranscriptionModels: readonly TranscriptionModelType[];
        if (currentTProvider === 'openai') currentActualTranscriptionModels = OpenAIWhisperModels;
        else if (currentTProvider === 'avalai_openai') currentActualTranscriptionModels = AvalAIWhisper;
        // else if (currentTProvider === 'groq') currentActualTranscriptionModels = GroqWhisperModels; // Groq removed
        else currentActualTranscriptionModels = OpenAIWhisperModels;
        
        const storedTranscriptionModel = localStorage.getItem(TRANSCRIPTION_MODEL_KEY) as TranscriptionModelType | null;
        const tModel = storedTranscriptionModel && currentActualTranscriptionModels.includes(storedTranscriptionModel as WhisperModelType) ? storedTranscriptionModel : currentActualTranscriptionModels[0];
        setTranscriptionModel(tModel);
        logMessage += `Trans. Model - ${tModel}, `;
        
        let currentActualLlmModels: readonly LLMModelType[];
        if (currentLProvider === 'googleai') currentActualLlmModels = GoogleGeminiLLModels;
        else if (currentLProvider === 'openai') currentActualLlmModels = OpenAIGPTModels;
        else if (currentLProvider === 'avalai_openai') currentActualLlmModels = AvalAIGPT;
        else if (currentLProvider === 'avalai_gemini') currentActualLlmModels = AvalAIGemini;
        else currentActualLlmModels = OpenAIGPTModels;

        const storedLlmModel = localStorage.getItem(LLM_MODEL_KEY) as LLMModelType | null;
        const lModel = storedLlmModel && currentActualLlmModels.includes(storedLlmModel) ? storedLlmModel : currentActualLlmModels[0];
        setLlmModel(lModel);
        logMessage += `LLM Model - ${lModel}, `;

        setDefaultTranscriptionLanguage((localStorage.getItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY) as LanguageCode | "auto-detect") || "auto-detect");
        setMaxSegmentDuration(parseInt(localStorage.getItem(MAX_SEGMENT_DURATION_KEY) || '60', 10));
        setTemperature(parseFloat(localStorage.getItem(TEMPERATURE_KEY) || '0.7'));
        
        const initialTheme = (localStorage.getItem(THEME_KEY) as Theme | null) || 'system';
        setSelectedTheme(initialTheme);
        
        setSelectedAppLanguage((localStorage.getItem(LANGUAGE_KEY) as Language | null) || currentAppLanguage);
        logMessage += `Default Lang - ${defaultTranscriptionLanguage}, Theme - ${initialTheme}, App Lang - ${selectedAppLanguage}, Max Seg Dur - ${maxSegmentDuration}s, Temp - ${temperature}. AvalAI URL: ${avalaiBaseUrl}`;
        addLog(logMessage, "debug");

      } catch (error) {
        console.error("Error loading settings from localStorage:", error);
        addLog("Error loading settings from localStorage. Using defaults.", "error");
        setTranscriptionProvider('openai');
        setTranscriptionModel(OpenAIWhisperModels[0]);
        setLlmProvider('openai');
        setLlmModel(OpenAIGPTModels[0]);
        setAvalaiBaseUrl(DEFAULT_AVALAI_BASE_URL);
      }
    }
  }, [isOpen, addLog, currentAppLanguage, defaultTranscriptionLanguage, maxSegmentDuration, temperature, avalaiBaseUrl]);


  useEffect(() => {
    const currentModels = transcriptionModelOptions;
    if (!currentModels.includes(transcriptionModel as WhisperModelType)) {
      const newModel = currentModels[0];
      setTranscriptionModel(newModel);
      addLog(`Transcription model auto-adjusted to ${newModel} due to provider change.`, "debug");
    }
  }, [transcriptionProvider, transcriptionModel, transcriptionModelOptions, addLog]);

  useEffect(() => {
    const currentModels = llmModelOptions;
    if (!currentModels.includes(llmModel)) {
      const newModel = currentModels[0];
      setLlmModel(newModel);
      addLog(`LLM model auto-adjusted to ${newModel} due to LLM provider change.`, "debug");
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
    try {
      const validatedMaxSegmentDuration = Math.max(4, Math.min(360, maxSegmentDuration));
      if (maxSegmentDuration !== validatedMaxSegmentDuration) {
        toast({
          title: t('settings.toast.validationError') as string,
          description: t('settings.toast.maxSegmentDurationValidation', { min: 4, max: 360 }) as string,
          variant: 'destructive',
        });
      }

      localStorage.setItem(TRANSCRIPTION_PROVIDER_KEY, transcriptionProvider);
      localStorage.setItem(TRANSCRIPTION_MODEL_KEY, transcriptionModel);
      localStorage.setItem(LLM_PROVIDER_KEY, llmProvider);
      localStorage.setItem(LLM_MODEL_KEY, llmModel);
      localStorage.setItem(MAX_SEGMENT_DURATION_KEY, validatedMaxSegmentDuration.toString());
      localStorage.setItem(TEMPERATURE_KEY, temperature.toString());
      
      if (openAIToken) localStorage.setItem(OPENAI_TOKEN_KEY, openAIToken); else localStorage.removeItem(OPENAI_TOKEN_KEY);
      if (avalaiToken) localStorage.setItem(AVALAI_TOKEN_KEY, avalaiToken); else localStorage.removeItem(AVALAI_TOKEN_KEY);
      if (avalaiBaseUrl) localStorage.setItem(AVALAI_BASE_URL_KEY, avalaiBaseUrl); else localStorage.setItem(AVALAI_BASE_URL_KEY, DEFAULT_AVALAI_BASE_URL);
      if (googleApiKey) localStorage.setItem(GOOGLE_API_KEY_KEY, googleApiKey); else localStorage.removeItem(GOOGLE_API_KEY_KEY);
      
      localStorage.setItem(DEFAULT_TRANSCRIPTION_LANGUAGE_KEY, defaultTranscriptionLanguage);
      localStorage.setItem(THEME_KEY, selectedTheme);

      if (currentAppLanguage !== selectedAppLanguage) {
        setAppLanguage(selectedAppLanguage); 
      } else {
        localStorage.setItem(LANGUAGE_KEY, selectedAppLanguage); 
      }
      
      const toastDesc = t('settings.toast.savedDescription.v3', {
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
      addLog(`Settings saved. Details: ${typeof toastDesc === 'string' ? toastDesc : JSON.stringify({transcriptionProvider, transcriptionModel, llmProvider, llmModel, defaultTranscriptionLanguage, selectedTheme, selectedAppLanguage, maxSegmentDuration: validatedMaxSegmentDuration, temperature, avalaiBaseUrl}) }`, 'success');
      onClose();
    } catch (error) {
        console.error("Error saving settings to localStorage:", error);
        addLog("Error saving settings to localStorage.", "error");
        toast({ title: "Save Error", description: "Could not save settings. LocalStorage might be full or unavailable.", variant: "destructive"});
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
        <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[85vh] min-h-[70vh]" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('settings.title')}</DialogTitle>
            <DialogDescription>
              {t('settings.description')}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="flex flex-col flex-grow overflow-hidden mt-2">
            <TabsList className={cn("grid w-full mb-4 shrink-0", "grid-cols-4")}>
              <TabsTrigger value="general" className="gap-1">
                <Palette className="h-4 w-4" /> {t('settings.tabs.general') as string}
              </TabsTrigger>
              <TabsTrigger value="aiConfig" className="gap-1">
                <Bot className="h-4 w-4" /> {t('settings.tabs.aiSettings') as string}
              </TabsTrigger>
              <TabsTrigger value="apiKeys" className="gap-1">
                <KeyRound className="h-4 w-4" /> {t('settings.tabs.apiKeys') as string}
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1">
                 <Cog className="h-4 w-4" /> {t('settings.tabs.advanced') as string}
              </TabsTrigger>
            </TabsList>

            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar"> {/* Scrollable content area */}
              <TabsContent value="general" className="mt-0 space-y-6 py-4 pr-2">
                {/* Theme Selection */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{t('settings.theme.label')}</Label>
                  <RadioGroup value={selectedTheme} onValueChange={(value: string) => handleThemeChange(value as Theme)} className="grid grid-cols-1 sm:grid-cols-3 gap-2" dir={dir}>
                    {[{ value: 'light', label: t('settings.theme.light') as string, icon: Sun }, { value: 'dark', label: t('settings.theme.dark') as string, icon: Moon }, { value: 'system', label: t('settings.theme.system') as string, icon: Laptop }].map((item) => (
                      <Label key={item.value} htmlFor={`theme-${item.value}`} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value={item.value} id={`theme-${item.value}`} className="sr-only" />
                        <item.icon className="mb-1 h-5 w-5" />
                        {item.label}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
                <Separator />

                {/* Application Language */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-1"><Languages className="h-5 w-5"/>{t('settings.language.label')}</Label>
                  <Select value={selectedAppLanguage} onValueChange={(value) => handleAppLanguageChange(value as Language)} dir={dir}>
                    <SelectTrigger className="w-full" aria-label={t('settings.language.label') as string}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('settings.language.english')}</SelectItem>
                      <SelectItem value="fa">{t('settings.language.persian')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <Separator />
                  {/* Cheatsheet & Credits moved to About tab for better organization */}
                  <div className="py-2">
                    <Button variant="outline" className="w-full" onClick={() => { onClose(); addLog("Cheatsheet button clicked from settings.", "debug"); /* Parent should handle opening cheatsheet */ }}>
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
                              <li>Next.js, React, ShadCN UI, Tailwind CSS</li>
                              <li>Genkit, Google AI, OpenAI API, AvalAI API</li>
                          </ul>
                          <p className="pt-2">{t('settings.credits.codeDevelopedWith') as string} <a href="https://firebase.google.com/docs/studio" target='_blank' rel='noopener noreferrer' className='underline hover:text-primary'>Firebase Studio</a>.</p>
                          <p>{t('settings.credits.originalConceptBy') as string} <a href='https://github.com/moaminsharifi' target='_blank' rel='noopener noreferrer follow' className='underline hover:text-primary'>Amin Sharifi (moaminsharifi)</a>.</p>
                          <p className="pt-2">{t('settings.credits.repository') as string} <a href='https://github.com/moaminsharifi/subtitle-flow' target='_blank' rel='noopener noreferrer' className='underline hover:text-primary'>github.com/moaminsharifi/subtitle-flow</a></p>
                          <p>{t('settings.credits.website') as string} <a href='https://subtitile-flow.moaminsharifi.com/' target='_blank' rel='noopener noreferrer' className='underline hover:text-primary'>subtitile-flow.moaminsharifi.com</a></p>
                      </div>
                  </div>
              </TabsContent>

              <TabsContent value="aiConfig" className="mt-0 space-y-6 py-4 pr-2">
                {/* Timestamp Transcription Configuration */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold flex items-center gap-1"><Bot className="h-5 w-5" />{t('settings.timestampTaskConfig.label')}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="transcription-provider-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.transcriptionConfig.providerLabel')}</Label>
                        <Select value={transcriptionProvider} onValueChange={(value: string) => setTranscriptionProvider(value as TranscriptionProvider)} dir={dir}>
                            <SelectTrigger id="transcription-provider-select" className="col-span-1 md:col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai">{t('settings.apiConfig.provider.openai')}</SelectItem>
                                <SelectItem value="avalai_openai">{t('settings.apiConfig.provider.avalai_openai')}</SelectItem>
                                {/* <SelectItem value="groq">{t('settings.apiConfig.provider.groq')}</SelectItem> */} {/* Groq Removed */}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="transcription-model-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.transcriptionConfig.modelLabel')}</Label>
                        <Select value={transcriptionModel} onValueChange={(value: string) => setTranscriptionModel(value as TranscriptionModelType)} dir={dir}>
                            <SelectTrigger id="transcription-model-select" className="col-span-1 md:col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {transcriptionModelOptions.map(model => (<SelectItem key={model} value={model}>{model}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Separator />

                {/* Cue/Slice Transcription Configuration */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold flex items-center gap-1"><Bot className="h-5 w-5" />{t('settings.cueSliceTaskConfig.label')}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="llm-provider-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.llmConfig.providerLabel')}</Label>
                        <Select value={llmProvider} onValueChange={(value: string) => setLlmProvider(value as LLMProviderType)} dir={dir}>
                            <SelectTrigger id="llm-provider-select" className="col-span-1 md:col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="googleai">{t('settings.apiConfig.provider.googleai')}</SelectItem>
                                <SelectItem value="openai">{t('settings.apiConfig.provider.openai')}</SelectItem>
                                <SelectItem value="avalai_openai">{t('settings.apiConfig.provider.avalai_openai_gpt')}</SelectItem>
                                <SelectItem value="avalai_gemini">{t('settings.apiConfig.provider.avalai_gemini')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="llm-model-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.llmConfig.modelLabel')}</Label>
                        <Select value={llmModel} onValueChange={(value: string) => setLlmModel(value as LLMModelType)} dir={dir}>
                            <SelectTrigger id="llm-model-select" className="col-span-1 md:col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>{llmModelOptions.map(model => (<SelectItem key={model} value={model}>{model}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                </div>
                <Separator />
                {/* Default Language for AI Tasks */}
                <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                    <Label htmlFor="default-language-select" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.apiConfig.defaultLanguage')}</Label>
                    <Select value={defaultTranscriptionLanguage} onValueChange={(value) => setDefaultTranscriptionLanguage(value as LanguageCode | "auto-detect")} dir={dir}>
                        <SelectTrigger className="col-span-1 md:col-span-3" id="default-language-select"><SelectValue /></SelectTrigger>
                        <SelectContent>{LANGUAGE_OPTIONS.map((langOpt) => (<SelectItem key={langOpt.value} value={langOpt.value}>{langOpt.label}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
              </TabsContent>

              <TabsContent value="apiKeys" className="mt-0 space-y-6 py-4 pr-2">
                <Label className="text-base font-semibold block mb-4">{t('settings.apiKeyManagement.label')}</Label>
                {/* Google API Key */}
                <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                    <Label htmlFor="google-api-key-input" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.apiKeyManagement.googleApiKeyLabel')}</Label>
                    <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                        <Input id="google-api-key-input" type={showGoogleApiKey ? 'text' : 'password'} value={googleApiKey} onChange={(e) => setGoogleApiKey(e.target.value)} className="flex-grow" placeholder="AIzaSy..." aria-label={t('settings.apiKeyManagement.googleApiKeyLabel') as string} dir={dir}/>
                        <Button variant="ghost" size="icon" onClick={() => setShowGoogleApiKey(!showGoogleApiKey)} aria-label={showGoogleApiKey ? "Hide Google API Key" : "Show Google API Key"}>{showGoogleApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</Button>
                    </div>
                </div>
                {/* OpenAI Token */}
                <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                    <Label htmlFor="openai-token-input" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.apiKeyManagement.openAITokenLabel')}</Label>
                    <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                        <Input id="openai-token-input" type={showOpenAIToken ? 'text' : 'password'} value={openAIToken} onChange={(e) => setOpenAIToken(e.target.value)} className="flex-grow" placeholder="sk-..." aria-label={t('settings.apiKeyManagement.openAITokenLabel') as string} dir={dir}/>
                        <Button variant="ghost" size="icon" onClick={() => setShowOpenAIToken(!showOpenAIToken)} aria-label={showOpenAIToken ? "Hide OpenAI API Key" : "Show OpenAI API Key"}>{showOpenAIToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</Button>
                    </div>
                </div>
                {/* AvalAI Token & Base URL */}
                <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                    <Label htmlFor="avalai-token-input" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.apiKeyManagement.avalaiTokenLabel')}</Label>
                    <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                        <Input id="avalai-token-input" type={showAvalAIToken ? 'text' : 'password'} value={avalaiToken} onChange={(e) => setAvalaiToken(e.target.value)} className="flex-grow" placeholder={t('settings.apiConfig.avalaiTokenPlaceholder') as string} aria-label={t('settings.apiKeyManagement.avalaiTokenLabel') as string} dir={dir}/>
                        <Button variant="ghost" size="icon" onClick={() => setShowAvalAIToken(!showAvalAIToken)} aria-label={showAvalAIToken ? "Hide AvalAI API Key" : "Show AvalAI API Key"}>{showAvalAIToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</Button>
                    </div>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                    <Label htmlFor="avalai-baseurl-input" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.apiKeyManagement.avalaiBaseUrlLabel')}</Label>
                    <Input id="avalai-baseurl-input" type="url" value={avalaiBaseUrl} onChange={(e) => setAvalaiBaseUrl(e.target.value)} className="col-span-1 md:col-span-3" placeholder={DEFAULT_AVALAI_BASE_URL} aria-label={t('settings.apiKeyManagement.avalaiBaseUrlLabel') as string} dir={dir}/>
                </div>
                {/* Groq Token was removed */}
              </TabsContent>
              
              <TabsContent value="advanced" className="mt-0 space-y-6 py-4 pr-2">
                <Label className="text-base font-semibold block mb-4">{t('settings.apiConfig.advancedOptions.toggleLabel')}</Label>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="temperature" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.apiConfig.advancedOptions.temperatureLabel')}</Label>
                        <Input id="temperature" type="number" step="0.1" min="0" max="2" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="col-span-1 md:col-span-3" dir={dir} aria-label={t('settings.apiConfig.advancedOptions.temperatureAriaLabel') as string}/>
                    </div>
                     <p className="text-xs text-muted-foreground col-span-1 md:col-start-2 md:col-span-3 px-1">
                        {t('settings.apiConfig.advancedOptions.temperatureDescription') as string}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-x-4 gap-y-2">
                        <Label htmlFor="max-segment-duration" className={cn("md:text-end", dir === 'rtl' && "md:text-start")} dir={dir}>{t('settings.apiConfig.advancedOptions.maxSegmentDurationLabel')}</Label>
                        <Input id="max-segment-duration" type="number" step="1" min={4} max={360} value={maxSegmentDuration} onChange={(e) => setMaxSegmentDuration(parseInt(e.target.value, 10))} className="col-span-1 md:col-span-3" dir={dir} aria-label={t('settings.apiConfig.advancedOptions.maxSegmentDurationAriaLabel') as string}/>
                    </div>
                    <p className="text-xs text-muted-foreground col-span-1 md:col-start-2 md:col-span-3 px-1">
                        {t('settings.apiConfig.advancedOptions.maxSegmentDurationDescription') as string}
                    </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-auto pt-4 border-t border-border shrink-0">
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => addLog("Settings changes cancelled.", "debug")}>{t('settings.buttons.cancel')}</Button></DialogClose>
            <Button type="button" onClick={handleSave}>{t('settings.buttons.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

