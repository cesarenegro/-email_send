'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CampaignForm from '@/components/CampaignForm';
import { CampaignInput } from '@/lib/validations/campaign';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function NewCampaignPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const handleCreate = async (data: CampaignInput) => {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || (locale === 'en' ? 'Unable to create campaign' : 'Impossibile creare la campagna'));
    }

    router.push(`/campaigns/${result.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <Link
          href="/campaigns"
          className="inline-flex items-center text-xs text-[#666666] hover:text-[#1A1A1E] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-0.5" />
          {t.campaigns.detail.backButton}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">
          {locale === 'en' ? 'Create New Campaign' : 'Crea Nuova Campagna'}
        </h1>
        <p className="text-sm text-[#666666]">
          {locale === 'en'
            ? 'Set the campaign name, email subject, HTML template, and delivery pacing schedule'
            : "Imposta il nome, l'oggetto, il template HTML e la pianificazione di invio scaglionato"}
        </p>
      </div>

      <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-6 shadow-sm">
        <CampaignForm onSubmit={handleCreate} />
      </div>
    </div>
  );
}
