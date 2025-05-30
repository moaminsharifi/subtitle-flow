
"use client";

import { useEffect } from 'react';
import { THEME_KEY, type Theme } from '@/lib/types';

export function ThemeInitializer() {
  useEffect(() => {
    const applyThemePreference = () => {
      const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (storedTheme === 'dark' || (storedTheme === 'system' && systemPrefersDark) || (!storedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyThemePreference(); // Apply on initial load

    // Listen for changes to system preference if the current theme is 'system' or not set
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const currentStoredTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      if (currentStoredTheme === 'system' || !currentStoredTheme) {
        applyThemePreference();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Listen for changes to localStorage from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_KEY) {
        applyThemePreference();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null; // This component does not render anything itself
}
