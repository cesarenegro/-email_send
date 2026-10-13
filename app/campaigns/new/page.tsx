'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CampaignForm from '@/components/CampaignForm';
import { CampaignInput } from '@/lib/validations/campaign';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

import SetupDummiesModal from '@/components/dummies/SetupDummiesModal';
import { Sparkles } from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [showDummiesModal, setShowDummiesModal] = React.useState<boolean>(false);

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

      {/* Prominent SETUP-DUMMIES Assisted Banner */}
      <div className="bg-[#FAF9F6] border-2 border-[#84cc16] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#84cc16]/20 flex items-center justify-center shrink-0 text-[#036E13]">
            <Sparkles className="w-5 h-5 text-[#036E13]" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#036E13]">
              {locale === 'en' ? 'Non-Technical Guided Wizard' : 'Procedura Guidata Semplificata'}
            </div>
            <h3 className="text-sm font-bold text-[#1B1C1A]">
              {locale === 'en' ? 'Prefer a step-by-step setup without HTML?' : 'Preferisci una guida passo-passo senza toccare codice HTML?'}
            </h3>
            <p className="text-xs text-[#5C5E63] mt-0.5">
              {locale === 'en'
                ? 'Automatic email server detection, visual editor, file import, and realistic duration estimation.'
                : 'Riconoscimento automatico casella, scrittura visuale naturale, importazione Excel e calcolo durata.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDummiesModal(true)}
          className="h-10 px-5 rounded-lg bg-[#84cc16] hover:bg-[#65a30d] text-[#1b1c1a] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <span>SETUP-DUMMIES</span>
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">
          {locale === 'en' ? 'Create New Campaign (Standard)' : 'Crea Nuova Campagna (Standard)'}
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

      {/* SETUP-DUMMIES Modal */}
      <SetupDummiesModal
        isOpen={showDummiesModal}
        onClose={() => setShowDummiesModal(false)}
      />
    </div>
  );
}
