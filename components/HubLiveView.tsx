'use client';

import React from 'react';
import Link from 'next/link';
import { Send, Newspaper, ArrowRight, Plus, Clock, CheckCircle2, ListOrdered, Calendar } from 'lucide-react';

interface HubStats {
  campaignsTotal: number;
  campaignsActive: number;
  newslettersTotal: number;
  newslettersScheduled: number;
  newslettersSending: number;
}

export default function HubLiveView({ stats }: { stats: HubStats }) {
  return (
    <div className="min-h-screen bg-[#F7F5F0] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="text-center sm:text-left space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1E]">ARKITECNA MAILER</h1>
          <p className="text-sm text-[#666666]">
            Piattaforma centralizzata per l&apos;invio di email massive personalizzate e newsletter programmate.
          </p>
        </div>

        {/* 2 Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Email Massive */}
          <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#1A1A1E] text-white flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <Send className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                  {stats.campaignsActive} attive
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#1A1A1E] tracking-tight">Email Massive</h2>
                <p className="mt-2 text-sm text-[#666666] leading-relaxed">
                  Campagne di invio massivo B2B con personalizzazione per azienda (`&#123;&#123;companyName&#125;&#125;`), invio atomico dilazionato e rispetto della finestra oraria.
                </p>
              </div>

              {/* Quick stats mini-row */}
              <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between text-xs text-[#666666]">
                <span className="flex items-center gap-1.5">
                  <ListOrdered className="w-4 h-4 text-stone-500" />
                  {stats.campaignsTotal} campagne create
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-stone-500" />
                  1 invio/minuto max
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Link
                href="/campaigns"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#1A1A1E] text-white text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm gap-2"
              >
                <span>Accedi alle Campagne</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/campaigns/new"
                className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white border border-[#D8D2C8] text-[#1A1A1E] text-xs font-semibold hover:bg-[#F7F5F0] transition-colors gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crea Nuova Campagna</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Newsletter */}
          <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#2A3439] text-white flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <Newspaper className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {stats.newslettersScheduled + stats.newslettersSending} pianificate/attive
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#1A1A1E] tracking-tight">Newsletter</h2>
                <p className="mt-2 text-sm text-[#666666] leading-relaxed">
                  Invio programmato a data e ora specifica a liste di iscritti, con anteprima HTML immediata, cadenza controllata e monitoraggio consegne.
                </p>
              </div>

              {/* Quick stats mini-row */}
              <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between text-xs text-[#666666]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-stone-500" />
                  {stats.newslettersTotal} newsletter create
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Invio automatico da cron
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Link
                href="/newsletters"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#2A3439] text-white text-sm font-semibold hover:bg-stone-700 transition-colors shadow-sm gap-2"
              >
                <span>Accedi alle Newsletter</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/newsletters/new"
                className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white border border-[#D8D2C8] text-[#1A1A1E] text-xs font-semibold hover:bg-[#F7F5F0] transition-colors gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Componi Nuova Newsletter</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
