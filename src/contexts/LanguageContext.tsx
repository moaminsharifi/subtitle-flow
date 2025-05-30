
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Language } from '@/lib/types';
import { LANGUAGE_KEY } from '@/lib/types';

// Define the shape of the context
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode | (string | React.ReactNode)[];
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

export const KbdComponentPlaceholder: React.FC<{children: React.ReactNode}> = ({children}) => {
    return <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">{children}</kbd>;
}
KbdComponentPlaceholder.displayName = 'KbdComponentPlaceholder';

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
    if (typeof document !== 'undefined') {
        document.documentElement.lang = initialLanguage;
        document.documentElement.dir = initialLanguage === 'fa' ? 'rtl' : 'ltr';
    }
    if (!storedLanguage) {
        localStorage.setItem(LANGUAGE_KEY, initialLanguage);
    }

  }, []);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    }
  };

  const t = useCallback((key: string, replacements?: Record<string, string | number | React.ReactNode>): string | React.ReactNode | (string | React.ReactNode)[] => {
    let translation = loadedTranslations[language]?.[key] || key;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;

    if (typeof translation === 'string' && replacements) {
      // Component replacements (e.g., <0>text</0> becomes <Kbd>text</Kbd>)
      const componentRegex = /<(\d+)>([^<]*)<\/\1>/g;
      let match;
      let hasComponentReplacements = false;
      for (const rKey in replacements) {
        if (/\d+/.test(rKey) && React.isValidElement(replacements[rKey as keyof typeof replacements])) {
          hasComponentReplacements = true;
          break;
        }
      }

      if (hasComponentReplacements) {
        let keyCounter = 0; 
        while ((match = componentRegex.exec(translation as string)) !== null) {
            const textPart = (translation as string).substring(lastIndex, match.index);
            if (textPart) {
              parts.push(textPart);
            }
            
            const tagIndex = match[1]; 
            const tagContent = match[2]; 
            
            const replacementElement = replacements?.[tagIndex] as React.ReactElement | undefined;

            if (replacementElement && React.isValidElement(replacementElement)) {
                 const generatedKey = `comp-${tagIndex}-${keyCounter++}`;
                 if (replacementElement.type === KbdComponentPlaceholder || (typeof replacementElement.type !== 'string' && (replacementElement.type as React.FC).displayName === 'KbdComponentPlaceholder')) {
                     parts.push(React.cloneElement(replacementElement, { key: generatedKey }, tagContent));
                 } else {
                    parts.push(React.cloneElement(replacementElement, { key: replacementElement.key || generatedKey }));
                 }
            } else {
                parts.push(match[0]); 
            }
            lastIndex = componentRegex.lastIndex;
        }
        const finalTextPart = (translation as string).substring(lastIndex);
        if (finalTextPart) {
          parts.push(finalTextPart);
        }
        
        const filteredParts = parts.filter(part => part !== "");
        
        if (filteredParts.length > 1 || (filteredParts.length === 1 && typeof filteredParts[0] !== 'string')) {
             // Ensure all React elements in filteredParts have a key before returning
             return filteredParts.map((part, idx) => {
               if (React.isValidElement(part)) {
                 // If the part already has a key from the cloning process, use it.
                 // Otherwise (which shouldn't happen with current logic), assign a new one.
                 return React.cloneElement(part, { key: part.key || `t-part-${idx}` });
               }
               return part; // Strings don't need keys
             });
        } else if (filteredParts.length === 1 && typeof filteredParts[0] === 'string') {
            translation = filteredParts[0]; 
        } else if (filteredParts.length === 0 && key !== translation) { 
             return ''; 
        }
      }

      // Simple string/number replacements (e.g., {name} or {count})
      // This should run after component replacements if 'translation' is still a string
      if (typeof translation === 'string') {
        Object.entries(replacements).forEach(([placeholder, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            const escapedPlaceholder = escapeRegExp(placeholder);
            const regex = new RegExp(`\\{${escapedPlaceholder}\\}`, 'g');
            translation = (translation as string).replace(regex, String(value));
          }
        });
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
