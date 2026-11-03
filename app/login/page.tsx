'use client';

import React, { Suspense } from 'react';
import LoginForm from '@/components/konta/LoginForm';
import { useTranslation } from '@/lib/i18n/useTranslation';

function LoginContent() {
  const { locale } = useTranslation();
  const en = locale === 'en';
  return (
    <LoginForm
      title={en ? 'Sign in' : 'Accedi'}
      subtitle={en ? 'Your KONTA account.' : 'Il tuo account KONTA.'}
    />
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#fbf9f6] flex items-center justify-center px-6 py-12">
      <Suspense fallback={null}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
