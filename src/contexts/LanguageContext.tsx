
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Language } from '@/lib/types';
import { LANGUAGE_KEY } from '@/lib/types';

// Define the shape of the context
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define translations (can be loaded from JSON files in a real app)
const translations: Record<Language, Record<string, string>> = {
  en: {}, // Will be loaded by provider
  fa: {}, // Will be loaded by provider
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setCurrentLanguage] = useState<Language>('en'); // Default to English
  const [loadedTranslations, setLoadedTranslations] = useState<Record<Language, Record<string, string>>>(translations);
  const dir = language === 'fa' ? 'rtl' : 'ltr';

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const enTranslations = await import('@/locales/en.json');
        const faTranslations = await import('@/locales/fa.json');
        setLoadedTranslations({
          en: enTranslations.default,
          fa: faTranslations.default,
        });
      } catch (error) {
        console.error("Failed to load translations:", error);
      }
    };
    fetchTranslations();
  }, []);

  useEffect(() => {
    const storedLanguage = localStorage.getItem(LANGUAGE_KEY) as Language | null;
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'fa')) {
      setCurrentLanguage(storedLanguage);
      document.documentElement.lang = storedLanguage;
      document.documentElement.dir = storedLanguage === 'fa' ? 'rtl' : 'ltr';
    } else {
      // Default to English if nothing stored or invalid
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  };

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translation = loadedTranslations[language]?.[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        translation = translation.replace(`{${placeholder}}`, String(value));
      });
    }
    // For <0>...</0> style tags used for links
    translation = translation.replace(/<(\d+)>([^<]+)<\/\1>/g, '$2');
    return translation;
  }, [language, loadedTranslations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
