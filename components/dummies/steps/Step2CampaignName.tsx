'use client';

import React from 'react';
import { Tag, Sparkles } from 'lucide-react';

interface Step2CampaignNameProps {
  value: string;
  onChange: (name: string) => void;
}

export default function Step2CampaignName({ value, onChange }: Step2CampaignNameProps) {
  const suggestions = [
    'Presentazione Catalogo 2026',
    'Offerta Speciale Studi Architettura',
    'Follow-up Contatti Fiera',
    'Collaborazione B2B Settore Arredo',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1B1C1A]">2. Dai un nome alla tua campagna</h3>
        <p className="text-xs text-[#5C5E63] mt-1">
          Questo nome è visibile solo a te nel pannello di controllo per organizzare e ritrovare le tue spedizioni.
        </p>
      </div>

      <div className="bg-white p-5 rounded-xl border border-[#D8D2C8] shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1B1C1A] uppercase tracking-wider mb-1.5">
            Nome Interno della Campagna <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <Tag className="w-4 h-4 text-[#A2A59E] absolute left-3 top-3" />
            <input
              type="text"
              required
              autoFocus
              placeholder="es. Presentazione Nuovi Servizi 2026"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#D8D2C8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036E13]/30"
            />
          </div>
        </div>

        {/* Quick Suggestions */}
        <div>
          <span className="text-[11px] font-semibold text-[#5C5E63] flex items-center gap-1 mb-2">
            <Sparkles className="w-3 h-3 text-[#036E13]" /> Esempi rapidi (clicca per usare):
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onChange(s)}
                className="px-2.5 py-1 text-xs bg-[#F5F3F0] hover:bg-[#EAE8E5] text-[#1B1C1A] rounded-full border border-[#D8D2C8] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
