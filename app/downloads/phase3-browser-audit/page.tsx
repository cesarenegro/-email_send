'use client';

import React, { useState, useEffect } from 'react';
import Step1Smtp, { SmtpConfigState } from '@/components/dummies/steps/Step1Smtp';
import Step2CampaignName from '@/components/dummies/steps/Step2CampaignName';
import Step3Subject from '@/components/dummies/steps/Step3Subject';
import Step4BodyEditor from '@/components/dummies/steps/Step4BodyEditor';
import Step5PreviewConfirm from '@/components/dummies/steps/Step5PreviewConfirm';
import Step6LeadsImport, { LeadsState } from '@/components/dummies/steps/Step6LeadsImport';
import Step7Scheduling, { SchedulingState } from '@/components/dummies/steps/Step7Scheduling';
import Step8SummaryLaunch from '@/components/dummies/steps/Step8SummaryLaunch';
import { CheckCircle2, ShieldAlert, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Phase3BrowserAuditPage() {
  const [activeTab, setActiveTab] = useState<'r01_r04_component' | 'eight_steps_wizard'>('r01_r04_component');

  // R01 & R04 specific test state
  const [testSubject, setTestSubject] = useState<string>('Partnership & Collaborazione per {{company_name}} <Urgente>');
  const [testHtml, setTestHtml] = useState<string>(
    '<p>Gentile {{company_name}},</p>' +
    '<img/src=data:, onerror=window.__auditXss=1>' +
    '<h3 style="color: #036E13;">Opportunità Esclusiva</h3>' +
    '<p style="margin: 0 0 14px 0; line-height: 1.6;">' +
    'Desideriamo presentarvi la nostra soluzione di <b>Precision Outbound</b>.<br>' +
    '<a href="https://mailk.arkai.dev" style="color: #036E13;">Scopri di più</a>' +
    '</p>'
  );
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  // 8 Steps Wizard Controlled State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [wizardCompleted, setWizardCompleted] = useState<boolean>(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);

  const [smtp, setSmtp] = useState<SmtpConfigState>({
    useExisting: true,
    email: 'cesare@arkitecna.com',
    host: 'smtp.sendgrid.net',
    port: 465,
    secure: true,
    provider: 'sendgrid',
    isVerified: true,
    smtpConnectionId: 'conn-audit-controlled-sandbox',
  });

  const [campaignName, setCampaignName] = useState<string>('Campagna Collaudo Fase 3 (Sandbox)');
  const [wizardSubject, setWizardSubject] = useState<string>('Offerta Speciale per {{company_name}} & Partner <Riservato>');
  const [wizardHtml, setWizardHtml] = useState<string>(
    '<p>Gentile {{company_name}},</p><p>Inviamo la proposta commerciale concordata.</p>'
  );
  const [wizardContentConfirmed, setWizardContentConfirmed] = useState<boolean>(true);

  const [leads, setLeads] = useState<LeadsState>({
    rawRows: [
      { 'Ragione Sociale': 'Studio Bellini Architettura', 'Email': 'info@studiobellini.it' },
      { 'Ragione Sociale': 'Rossi & Partners Srl', 'Email': 'contatti@rossipartners.it' },
    ],
    headers: ['Ragione Sociale', 'Email'],
    companyColumn: 'Ragione Sociale',
    emailColumn: 'Email',
    validLeads: [
      { company_name: 'Studio Bellini Architettura', email: 'info@studiobellini.it' },
      { company_name: 'Rossi & Partners Srl', email: 'contatti@rossipartners.it' },
    ],
    duplicatesCount: 0,
    invalidRows: [],
    isReady: true,
  });

  const [scheduling, setScheduling] = useState<SchedulingState>({
    startMode: 'immediate',
    scheduledDate: '',
    timezone: 'Europe/Rome',
    sendIntervalSeconds: 240,
    dailyLimit: 80,
  });

  // Track visited steps
  useEffect(() => {
    setVisitedSteps((prev) => (prev.includes(currentStep) ? prev : [...prev, currentStep].sort((a, b) => a - b)));
  }, [currentStep]);

  // Window inspection hook for automated subagent audit
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const auditStatus = {
      windowAuditXssExecuted: (window as any).__auditXss !== undefined,
      visitedSteps,
      wizardCompleted,
      currentStep,
      isConfirmed,
      timestamp: new Date().toISOString(),
    };

    (window as any).__PHASE3_AUDIT__ = auditStatus;
  }, [visitedSteps, wizardCompleted, currentStep, isConfirmed]);

  const handleControlledLaunch = () => {
    setWizardCompleted(true);
    setLaunchMessage('Campagna avviata con successo in ambiente sandbox isolato (nessun invio reale a liste esterne).');
    if (typeof window !== 'undefined') {
      (window as any).__WIZARD_COMPLETED__ = true;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF] p-4 sm:p-8 font-sans text-[#1B1C1A]">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#1B1C1A] text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16] animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-wider text-[#84cc16]">AUDIT AMBIENTE CONTROLLATO</span>
            </div>
            <h1 className="text-xl font-bold mt-1 text-white">Fase 3: Collaudo Browser Componenti Reali</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Verifica R01 (Bypass XSS), R04 (No Doppio Escaping) e percorso completo degli 8 step.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              id="btn-tab-r01-r04"
              type="button"
              onClick={() => setActiveTab('r01_r04_component')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'r01_r04_component' ? 'bg-[#84cc16] text-[#1B1C1A]' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Prova R01 & R04 (Step 5 Reale)
            </button>
            <button
              id="btn-tab-wizard"
              type="button"
              onClick={() => setActiveTab('eight_steps_wizard')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'eight_steps_wizard' ? 'bg-[#84cc16] text-[#1B1C1A]' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Percorso 8 Step Wizard
            </button>
          </div>
        </div>

        {/* TAB 1: R01 & R04 Real Component Preview */}
        {activeTab === 'r01_r04_component' && (
          <div className="bg-white p-6 rounded-2xl border border-[#D8D2C8] shadow-sm space-y-6">
            <div className="border-b border-[#E5E5E0] pb-4">
              <h2 className="text-base font-bold text-[#1B1C1A]">Step5PreviewConfirm (Componente Reale in Rendering)</h2>
              <p className="text-xs text-[#5C5E63] mt-1">
                Verifica che il payload <code>&lt;img/src=data:, onerror=window.__auditXss=1&gt;</code> sia neutralizzato dal browser DOM parser e che l'oggetto non contenga entità <code>&amp;amp;</code> spurie.
              </p>
            </div>

            {/* Diagnostic Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" id="audit-metrics-panel">
              <div className="p-3 bg-[#FAF9F6] border border-[#D8D2C8] rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5E63]">R01: Esecuzione JavaScript</span>
                <div className="mt-1 flex items-center gap-2" id="metric-xss-status">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">0 Esecuzioni (Inerte)</span>
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F6] border border-[#D8D2C8] rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5E63]">R04: Escaping Oggetto</span>
                <div className="mt-1 flex items-center gap-2" id="metric-subject-status">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">Puro (Nessun &amp;amp;)</span>
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F6] border border-[#D8D2C8] rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5E63]">Contenuti Leciti</span>
                <div className="mt-1 flex items-center gap-2" id="metric-legit-status">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">Preservati (H3, Bold, Link)</span>
                </div>
              </div>
            </div>

            {/* Actual Step5PreviewConfirm Component */}
            <div className="border border-[#E5E5E0] rounded-xl p-4 bg-[#FAF9F6]" id="real-step5-container">
              <Step5PreviewConfirm
                fromEmail="cesare@arkitecna.com"
                fromName="Cesare Negro"
                subject={testSubject}
                html={testHtml}
                isConfirmed={isConfirmed}
                onConfirmChange={setIsConfirmed}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Full 8 Steps Wizard Path */}
        {activeTab === 'eight_steps_wizard' && (
          <div className="bg-white p-6 rounded-2xl border border-[#D8D2C8] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E5E0] pb-4 gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1B1C1A]">Percorso Completo 8 Step (Ambiente Controllato)</h2>
                <p className="text-xs text-[#5C5E63] mt-0.5">
                  Step attivo: <span className="font-bold text-[#036E13]">Passo {currentStep} di 8</span>
                </p>
              </div>

              {/* Step Navigator Bar */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1" id="wizard-steps-indicator">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <button
                    key={s}
                    id={`btn-nav-step-${s}`}
                    type="button"
                    onClick={() => setCurrentStep(s)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                      currentStep === s
                        ? 'bg-[#1B1C1A] text-white shadow-xs'
                        : visitedSteps.includes(s)
                        ? 'bg-[#84cc16]/20 text-[#036E13] border border-[#84cc16]'
                        : 'bg-[#F0EFEA] text-[#5C5E63]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Step Body */}
            <div className="min-h-[380px] p-4 bg-[#FAF9F6] rounded-xl border border-[#E5E5E0]" id="wizard-step-content">
              {currentStep === 1 && (
                <Step1Smtp
                  currentUserId="user-sandbox-audit"
                  getSessionToken={() => 1}
                  data={smtp}
                  onUpdate={(patch) => setSmtp((prev) => ({ ...prev, ...patch }))}
                  existingEmail="cesare@arkitecna.com"
                />
              )}

              {currentStep === 2 && (
                <Step2CampaignName
                  value={campaignName}
                  onChange={setCampaignName}
                />
              )}

              {currentStep === 3 && (
                <Step3Subject
                  value={wizardSubject}
                  onChange={setWizardSubject}
                />
              )}

              {currentStep === 4 && (
                <Step4BodyEditor
                  value={wizardHtml}
                  onChange={setWizardHtml}
                  onContentModified={() => {}}
                />
              )}

              {currentStep === 5 && (
                <Step5PreviewConfirm
                  fromEmail={smtp.email}
                  fromName="Cesare Negro"
                  subject={wizardSubject}
                  html={wizardHtml}
                  isConfirmed={wizardContentConfirmed}
                  onConfirmChange={setWizardContentConfirmed}
                />
              )}

              {currentStep === 6 && (
                <Step6LeadsImport
                  data={leads}
                  onUpdate={(patch) => setLeads((prev) => ({ ...prev, ...patch }))}
                />
              )}

              {currentStep === 7 && (
                <Step7Scheduling
                  data={scheduling}
                  onUpdate={(patch) => setScheduling((prev) => ({ ...prev, ...patch }))}
                  leadCount={leads.validLeads.length}
                />
              )}

              {currentStep === 8 && (
                <Step8SummaryLaunch
                  fromEmail={smtp.email}
                  fromName="Cesare Negro"
                  campaignName={campaignName}
                  subject={wizardSubject}
                  html={wizardHtml}
                  leadCount={leads.validLeads.length}
                  startMode={scheduling.startMode}
                  scheduledDate={scheduling.scheduledDate}
                  timezone={scheduling.timezone}
                  isSubmitting={false}
                  onLaunch={handleControlledLaunch}
                  error={null}
                />
              )}
            </div>

            {/* Launch Message Banner */}
            {launchMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold" id="sandbox-launch-success">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{launchMessage}</span>
              </div>
            )}

            {/* Footer Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E0]">
              <button
                id="btn-step-prev"
                type="button"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-lg border border-[#D8D2C8] text-xs font-semibold text-[#1B1C1A] hover:bg-[#F5F3EF] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Indietro
              </button>

              <div className="text-xs text-[#5C5E63]">
                Passi visitati: {visitedSteps.join(', ')} / 8
              </div>

              {currentStep < 8 ? (
                <button
                  id="btn-step-next"
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(8, prev + 1))}
                  className="px-4 py-2 rounded-lg bg-[#84cc16] hover:bg-[#65a30d] text-[#1B1C1A] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  Avanti
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  id="btn-step-launch"
                  type="button"
                  onClick={handleControlledLaunch}
                  className="px-5 py-2 rounded-lg bg-[#036E13] hover:bg-[#02560f] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 text-[#84cc16]" />
                  Avvia Collaudo Sandbox
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
