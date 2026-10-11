'use client';

import React, { createContext, useContext, useState, useEffect, useTransition } from 'react';
import { Locale, Translations } from '@/lib/i18n/types';
import { it } from '@/lib/i18n/locales/it';
import { en } from '@/lib/i18n/locales/en';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const dictionaries: Record<Locale, Translations> = {
  it,
  en,
};

const LanguageContext = createContext<LanguageContextType>({
  locale: 'it',
  setLocale: () => {},
  t: it,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('it');
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Initial detection: localStorage -> cookie -> navigator -> default 'it'
    const saved = localStorage.getItem('mailk_locale') as Locale | null;
    if (saved === 'it' || saved === 'en') {
      setLocaleState(saved);
      return;
    }

    const cookieMatch = document.cookie.match(/mailk_locale=(it|en)/);
    if (cookieMatch && (cookieMatch[1] === 'it' || cookieMatch[1] === 'en')) {
      setLocaleState(cookieMatch[1] as Locale);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) {
      setLocaleState('en');
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    startTransition(() => {
      setLocaleState(newLocale);
      try {
        localStorage.setItem('mailk_locale', newLocale);
        document.cookie = `mailk_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = newLocale;
      } catch (err) {
        console.error('Error persisting locale:', err);
      }
    });
  };

  const t = dictionaries[locale] || dictionaries.it;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
