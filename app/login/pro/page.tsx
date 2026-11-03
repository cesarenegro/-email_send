'use client';

import React, { Suspense } from 'react';
import LoginForm from '@/components/konta/LoginForm';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Accesso con account KONTA PRO: stesso progetto Supabase e stesse credenziali
 * di KONTA PRO e K-CRM. Dopo l'accesso l'utente sceglie l'organizzazione.
 */
function ProLoginContent() {
  const { locale } = useTranslation();
  const en = locale === 'en';
  return (
    <LoginForm
      title={en ? 'Sign in with KONTA PRO' : 'Accedi con account KONTA PRO'}
      subtitle={en ? 'Same email and password as KONTA PRO and K-CRM.' : 'Stesse email e password di KONTA PRO e K-CRM.'}
      showProLink={false}
    />
  );
}

export default function ProLoginPage() {
  return (
    <div className="min-h-screen bg-[#fbf9f6] flex items-center justify-center px-6 py-12">
      <Suspense fallback={null}>
        <ProLoginContent />
      </Suspense>
    </div>
  );
}
