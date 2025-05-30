
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Language } from '@/lib/types';
import { LANGUAGE_KEY } from '@/lib/types';

// Define the shape of the context
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode;
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

// Helper function to escape characters with special meaning in regular expressions
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setCurrentLanguage] = useState<Language>('en'); // Default to English initially
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
    let initialLanguage: Language = 'en'; // Ultimate fallback

    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'fa')) {
      initialLanguage = storedLanguage;
    } else if (typeof navigator !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.split('-')[0] as Language;
      if (browserLang === 'fa') {
        initialLanguage = 'fa';
      } else if (browserLang === 'en') {
        initialLanguage = 'en';
      }
    }
    
    setCurrentLanguage(initialLanguage);
    document.documentElement.lang = initialLanguage;
    document.documentElement.dir = initialLanguage === 'fa' ? 'rtl' : 'ltr';
    if (!storedLanguage) {
        localStorage.setItem(LANGUAGE_KEY, initialLanguage);
    }

  }, []);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  };

  const t = useCallback((key: string, replacements?: Record<string, string | number | React.ReactNode>): string | React.ReactNode => {
    let translation = loadedTranslations[language]?.[key] || key;
    if (typeof translation === 'string' && replacements) {
      // Simple string/number replacements (e.g., {name} or {count})
      Object.entries(replacements).forEach(([placeholder, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          const escapedPlaceholder = escapeRegExp(placeholder);
          // Construct a regex to match the literal placeholder, e.g., \{name\} or \{year\}
          const regex = new RegExp(`\\{${escapedPlaceholder}\\}`, 'g');
          translation = (translation as string).replace(regex, String(value));
        }
      });
       
      // Component replacements (e.g., <0>text</0> becomes <Kbd>text</Kbd>)
      const parts: (string | React.ReactNode)[] = [];
      let lastIndex = 0;
      // Regex to find <digit>content</digit> tags
      const componentRegex = /<(\d+)>([^<]*)<\/\1>/g; 
      let match;

      let hasComponentReplacements = false;
      if (replacements) {
        for (const rKey in replacements) {
          if (/\d+/.test(rKey) && React.isValidElement(replacements[rKey as keyof typeof replacements])) {
            hasComponentReplacements = true;
            break;
          }
        }
      }
      
      if (typeof translation === 'string' && hasComponentReplacements) {
        while ((match = componentRegex.exec(translation as string)) !== null) {
            parts.push((translation as string).substring(lastIndex, match.index));
            const tagIndex = match[1]; // e.g., "0"
            const tagContent = match[2]; // e.g., "Tab"
            
            const replacementElement = replacements?.[tagIndex] as React.ReactElement | undefined;
            if (replacementElement && React.isValidElement(replacementElement)) {
                 if (replacementElement.type === KbdComponentPlaceholder || (typeof replacementElement.type !== 'string' && (replacementElement.type as React.FC).displayName === 'KbdComponentPlaceholder')) {
                     parts.push(React.cloneElement(replacementElement, {}, tagContent));
                 } else {
                    parts.push(replacementElement);
                 }
            } else {
                // If no valid React element for placeholder, keep original tag content
                parts.push(match[0]); 
            }
            lastIndex = componentRegex.lastIndex;
        }
        parts.push((translation as string).substring(lastIndex));
        
        const filteredParts = parts.filter(part => part !== "");
        if (filteredParts.length > 1 || (filteredParts.length === 1 && typeof filteredParts[0] !== 'string')) {
             return filteredParts; 
        } else if (filteredParts.length === 1 && typeof filteredParts[0] === 'string') {
            translation = filteredParts[0]; // If only string parts remain, proceed as string
        } else if (filteredParts.length === 0 && key !== translation) { // if parts are empty but translation happened (e.g. only component replacements)
             return ''; // Or handle as appropriate
        }
        // If after component replacement, 'translation' is no longer the original key, it means some replacement happened.
        // If 'filteredParts' resulted in a single string, that's our new 'translation'.
        // If 'filteredParts' resulted in multiple items or React nodes, we returned 'filteredParts' already.
      }
    }
    return translation;
  }, [language, loadedTranslations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

export const KbdComponentPlaceholder: React.FC<{children: React.ReactNode}> = ({children}) => {
    return <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">{children}</kbd>;
}
KbdComponentPlaceholder.displayName = 'KbdComponentPlaceholder';

