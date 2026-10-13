'use client';

import React from 'react';
import { Mail, Tag, Eye } from 'lucide-react';

interface Step3SubjectProps {
  value: string;
  onChange: (subject: string) => void;
}

export default function Step3Subject({ value, onChange }: Step3SubjectProps) {
  const insertPlaceholder = (tag: string) => {
    onChange(value ? `${value} ${tag}` : tag);
  };

  // Preview simulation
  const simulatedSubject = value
    ? value
        .replace(/{{azienda}}|{{companyName}}|{{NOME_AZIENDA}}/gi, 'Studio Architettura Rossi')
        .replace(/{{email}}/gi, 'mario.rossi@studiorossi.it')
    : 'Titolo visibile nella casella del destinatario';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1B1C1A]">3. Qual è l'oggetto dell'email?</h3>
        <p className="text-xs text-[#5C5E63] mt-1">
          Questo è il titolo principale che leggerà il destinatario nella propria casella di posta.
        </p>
      </div>

      <div className="bg-white p-5 rounded-xl border border-[#D8D2C8] shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1B1C1A] uppercase tracking-wider mb-1.5">
            Oggetto dell'email <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#A2A59E] absolute left-3 top-3" />
            <input
              type="text"
              required
              autoFocus
              placeholder="es. Opportunità di collaborazione per {{azienda}}"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#D8D2C8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036E13]/30"
            />
          </div>
        </div>

        {/* Dynamic Personalization Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-[#5C5E63] font-medium">Inserisci variabile automatica:</span>
          <button
            type="button"
            onClick={() => insertPlaceholder('{{azienda}}')}
            className="px-2.5 py-1 text-xs font-semibold bg-[#F5F3F0] hover:bg-[#EAE8E5] text-[#1B1C1A] rounded-md border border-[#D8D2C8] flex items-center gap-1.5 transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-[#036E13]" />
            <span>+ Nome Azienda Destinatario</span>
          </button>
        </div>

        {/* Live Simulation Card */}
        <div className="bg-[#FAF9F6] p-3.5 rounded-lg border border-[#E5E5E0] space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-[#5C5E63] font-medium">
            <Eye className="w-3.5 h-3.5 text-[#036E13]" />
            <span>Come apparirà al destinatario:</span>
          </div>
          <div className="px-3 py-2 bg-white rounded border border-[#D8D2C8] text-xs font-semibold text-[#1B1C1A]">
            {simulatedSubject}
          </div>
        </div>
      </div>
    </div>
  );
}
