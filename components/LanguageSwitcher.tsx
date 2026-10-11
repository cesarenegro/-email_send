'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'light' | 'dark' | 'transparent';
}

export default function LanguageSwitcher({ className = '', variant = 'light' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation();

  return (
    <div
      className={`inline-flex items-center rounded-lg p-0.5 border text-xs font-semibold select-none transition-all ${
        variant === 'dark'
          ? 'bg-white/10 border-white/15 text-white'
          : variant === 'transparent'
          ? 'bg-transparent border-[#bfcab8]/40 text-[#1b1c1a]'
          : 'bg-[#f5f3f0] border-[#e5e5e0] text-[#1b1c1a]'
      } ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => setLocale('it')}
        className={`px-2 py-1 rounded-md transition-all font-mono tracking-wider cursor-pointer ${
          locale === 'it'
            ? variant === 'dark'
              ? 'bg-white text-[#1b1c1a] shadow-xs font-bold'
              : 'bg-white text-[#036e13] shadow-xs font-bold'
            : variant === 'dark'
            ? 'text-white/60 hover:text-white'
            : 'text-[#6f7a6b] hover:text-[#1b1c1a]'
        }`}
        title="Italiano"
      >
        IT
      </button>
      <span className={`text-[10px] px-0.5 ${variant === 'dark' ? 'text-white/30' : 'text-[#bfcab8]'}`}>/</span>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`px-2 py-1 rounded-md transition-all font-mono tracking-wider cursor-pointer ${
          locale === 'en'
            ? variant === 'dark'
              ? 'bg-white text-[#1b1c1a] shadow-xs font-bold'
              : 'bg-white text-[#036e13] shadow-xs font-bold'
            : variant === 'dark'
            ? 'text-white/60 hover:text-white'
            : 'text-[#6f7a6b] hover:text-[#1b1c1a]'
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
