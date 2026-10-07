'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CampaignForm from '@/components/CampaignForm';
import { CampaignInput } from '@/lib/validations/campaign';
import { ChevronLeft } from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();

  const handleCreate = async (data: CampaignInput) => {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Impossibile creare la campagna');
    }

    router.push(`/campaigns/${result.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <Link
          href="/"
          className="inline-flex items-center text-xs text-[#666666] hover:text-[#1A1A1E] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-0.5" />
          Torna alle campagne
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">Crea Nuova Campagna</h1>
        <p className="text-sm text-[#666666]">
          Imposta il nome, l&apos;oggetto, il template HTML e la pianificazione di invio scaglionato
        </p>
      </div>

      <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-6 shadow-sm">
        <CampaignForm onSubmit={handleCreate} />
      </div>
    </div>
  );
}
