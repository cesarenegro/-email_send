'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import Step1Smtp, { SmtpConfigState } from './steps/Step1Smtp';
import Step2CampaignName from './steps/Step2CampaignName';
import Step3Subject from './steps/Step3Subject';
import Step4BodyEditor from './steps/Step4BodyEditor';
import Step5PreviewConfirm from './steps/Step5PreviewConfirm';
import Step6LeadsImport, { LeadsState } from './steps/Step6LeadsImport';
import Step7Scheduling, { SchedulingState } from './steps/Step7Scheduling';
import Step8SummaryLaunch from './steps/Step8SummaryLaunch';

import { createClient } from '@/lib/supabase/client';
import { sanitizeEmailHtml } from '@/lib/security/sanitize-html';

interface SetupDummiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSenderEmail?: string;
  existingSenderName?: string;
}

export default function SetupDummiesModal({
  isOpen,
  onClose,
  existingSenderEmail,
  existingSenderName,
}: SetupDummiesModalProps) {
  const router = useRouter();

  // Authenticated User State & Asynchronous Isolation
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(existingSenderEmail || '');
  const [currentUserName, setCurrentUserName] = useState<string>(existingSenderName || '');

  const activeUserIdRef = useRef<string | null>(null);
  const sessionEpochRef = useRef<number>(0);

  // Wizard State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [draftRestored, setDraftRestored] = useState<boolean>(false);

  // Form Data
  const [smtp, setSmtp] = useState<SmtpConfigState>({
    useExisting: false,
    email: existingSenderEmail || '',
    host: '',
    port: 465,
    secure: true,
    provider: 'custom',
    isVerified: false,
    smtpConnectionId: null,
  });

  const [campaignName, setCampaignName] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [html, setHtml] = useState<string>('');
  const [isContentConfirmed, setIsContentConfirmed] = useState<boolean>(false);

  const [leads, setLeads] = useState<LeadsState>({
    rawRows: [],
    headers: [],
    companyColumn: '',
    emailColumn: '',
    validLeads: [],
    duplicatesCount: 0,
    invalidRows: [],
    isReady: false,
  });

  const [scheduling, setScheduling] = useState<SchedulingState>({
    startMode: 'immediate',
    scheduledDate: '',
    timezone: 'Europe/Rome',
    sendIntervalSeconds: 240,
    dailyLimit: 80,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState<boolean>(false);

  const handleResetAllState = (newUserId: string | null, newEmail: string) => {
    setIsDraftLoaded(false);
    setCurrentUserId(newUserId);
    activeUserIdRef.current = newUserId;
    setCurrentUserEmail(newEmail);
    setSmtp({
      useExisting: false,
      email: newEmail,
      host: '',
      port: 465,
      secure: true,
      provider: 'custom',
      isVerified: false,
      smtpConnectionId: null,
    });
    setCampaignName('');
    setSubject('');
    setHtml('');
    setIsContentConfirmed(false);
    setLeads({
      rawRows: [],
      headers: [],
      companyColumn: '',
      emailColumn: '',
      validLeads: [],
      duplicatesCount: 0,
      invalidRows: [],
      isReady: false,
    });
    setScheduling({
      startMode: 'immediate',
      scheduledDate: '',
      timezone: 'Europe/Rome',
      sendIntervalSeconds: 240,
      dailyLimit: 80,
    });
    setCurrentStep(1);
    setDraftRestored(false);
    setErrorMessage(null);
  };

  // 1. Fetch authenticated user and subscribe to auth changes (multi-tab / logout isolation)
  useEffect(() => {
    const supabase = createClient();

    async function loadAuthUser(targetUser?: any) {
      const epoch = ++sessionEpochRef.current;
      try {
        setIsDraftLoaded(false);
        const user = targetUser || (await supabase.auth.getUser()).data.user;
        if (epoch !== sessionEpochRef.current) return;

        if (user) {
          activeUserIdRef.current = user.id;
          setCurrentUserId(user.id);
          const email = user.email || '';
          const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || 'Utente';
          setCurrentUserEmail(email);
          setCurrentUserName(name);

          // Purge legacy un-isolated global storage key
          if (typeof window !== 'undefined') {
            localStorage.removeItem('mailk_dummies_wizard_draft_v1');
          }

          // Check if user has personal draft scoped strictly to user.id
          const userStorageKey = `mailk_dummies_wizard_draft_${user.id}`;
          const saved = typeof window !== 'undefined' ? localStorage.getItem(userStorageKey) : null;
          if (epoch !== sessionEpochRef.current) return;

          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.smtp?.password) {
                delete parsed.smtp.password;
                localStorage.setItem(userStorageKey, JSON.stringify(parsed));
              }

              if (epoch !== sessionEpochRef.current) return;

              if (parsed.campaignName || parsed.subject || parsed.html || parsed.leads?.validLeads?.length > 0) {
                if (parsed.smtp) {
                  const { password: _p, ...cleanSmtp } = parsed.smtp;
                  setSmtp(cleanSmtp);
                }
                if (parsed.campaignName) setCampaignName(parsed.campaignName);
                if (parsed.subject) setSubject(parsed.subject);
                if (parsed.html) setHtml(parsed.html);
                if (parsed.isContentConfirmed) setIsContentConfirmed(parsed.isContentConfirmed);
                if (parsed.leads) setLeads(parsed.leads);
                if (parsed.scheduling) setScheduling(parsed.scheduling);
                if (parsed.currentStep) setCurrentStep(parsed.currentStep);
                setDraftRestored(true);
              }
            } catch (err) {
              localStorage.removeItem(userStorageKey);
            }
          } else {
            // Fresh session: initialize email to user's authentic email
            setSmtp({
              useExisting: false,
              email: email,
              host: '',
              port: 465,
              secure: true,
              provider: 'custom',
              isVerified: false,
              smtpConnectionId: null,
            });
            setDraftRestored(false);
          }

          if (epoch === sessionEpochRef.current) {
            setIsDraftLoaded(true);
          }
        } else {
          activeUserIdRef.current = null;
          handleResetAllState(null, '');
        }
      } catch (err) {
        console.error('Error loading auth user in SetupDummiesModal:', err);
      }
    }

    loadAuthUser();

    // Listen to auth events: on logout or user switch, immediately reset wizard state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (session?.user && session.user.id !== activeUserIdRef.current)) {
        sessionEpochRef.current += 1;
        const newUserId = session?.user?.id || null;
        const newEmail = session?.user?.email || '';
        handleResetAllState(newUserId, newEmail);

        if (session?.user) {
          loadAuthUser(session.user);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Auto-Save Draft on Change ONLY after draft has been loaded and scoped to currentUserId
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUserId || !isDraftLoaded) return;
    if (currentUserId !== activeUserIdRef.current) return;
    const userStorageKey = `mailk_dummies_wizard_draft_${currentUserId}`;

    // Guarantee that no password or sensitive token can ever be stored in localStorage
    const { password: _p, ...safeSmtp } = (smtp as any);

    const draft = {
      smtp: safeSmtp,
      campaignName,
      subject,
      html,
      isContentConfirmed,
      leads,
      scheduling,
      currentStep,
      userId: currentUserId,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(draft));
    } catch (e) {
      // Quota guard
    }
  }, [currentUserId, isDraftLoaded, smtp, campaignName, subject, html, isContentConfirmed, leads, scheduling, currentStep]);

  // Reset Draft
  const handleResetDraft = () => {
    if (window.confirm('Sei sicuro di voler cancellare questa bozza e ripartire da zero?')) {
      if (currentUserId && typeof window !== 'undefined') {
        localStorage.removeItem(`mailk_dummies_wizard_draft_${currentUserId}`);
      }
      setCurrentStep(1);
      setCampaignName('');
      setSubject('');
      setHtml('');
      setIsContentConfirmed(false);
      setLeads({
        rawRows: [],
        headers: [],
        companyColumn: '',
        emailColumn: '',
        validLeads: [],
        duplicatesCount: 0,
        invalidRows: [],
        isReady: false,
      });
      setScheduling({
        startMode: 'immediate',
        scheduledDate: '',
        timezone: 'Europe/Rome',
        sendIntervalSeconds: 240,
        dailyLimit: 80,
      });
      setDraftRestored(false);
      setErrorMessage(null);
    }
  };

  // Keyboard navigation & ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (window.confirm('Vuoi salvare la bozza e chiudere la procedura guidata?')) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Validation rules per step
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return smtp.isVerified;
      case 2:
        return campaignName.trim().length >= 2;
      case 3:
        return subject.trim().length >= 2;
      case 4:
        return html.replace(/<[^>]+>/g, '').trim().length >= 5;
      case 5:
        return isContentConfirmed;
      case 6:
        return leads.validLeads.length > 0;
      case 7:
        return scheduling.startMode === 'immediate' || (
          DateTime.fromISO(scheduling.scheduledDate, { zone: scheduling.timezone }).isValid &&
          DateTime.fromISO(scheduling.scheduledDate, { zone: scheduling.timezone }).toMillis() > Date.now()
        );
      case 8:
        return leads.validLeads.length > 0 && !isSubmitting;
      default:
        return false;
    }
  };

  const getStepValidationHint = (): string | null => {
    if (canProceed()) return null;
    switch (currentStep) {
      case 1:
        return 'Verifica la connessione della casella prima di continuare.';
      case 2:
        return 'Inserisci un nome per la campagna.';
      case 3:
        return 'Inserisci l\'oggetto dell\'email.';
      case 4:
        return 'Scrivi o importa il testo della tua email.';
      case 5:
        return 'Spunta la casella per confermare che il messaggio è pronto.';
      case 6:
        return 'Carica un file di contatti con almeno un indirizzo email valido.';
      case 7:
        return 'Scegli una data e ora futura nel fuso orario selezionato.';
      default:
        return null;
    }
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (canProceed() && currentStep < 8) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Reset confirmation if user modifies text in step 4
  const handleContentModified = () => {
    setIsContentConfirmed(false);
  };

  // Final Launch Execution
  const handleLaunchCampaign = async () => {
    if (!canProceed() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create Campaign row
      const payload = {
        name: campaignName.trim(),
        subject_template: subject.trim(),
        html_template: sanitizeEmailHtml(html.trim()),
        timezone: scheduling.timezone || 'Europe/Rome',
        send_window_start: '09:00',
        send_window_end: '18:00',
        send_interval_seconds: scheduling.sendIntervalSeconds || 240,
        daily_limit: scheduling.dailyLimit || 80,
        start_at: scheduling.startMode === 'scheduled' && scheduling.scheduledDate
          ? DateTime.fromISO(scheduling.scheduledDate, { zone: scheduling.timezone }).toUTC().toISO()
          : null,
        smtp_connection_id: smtp.smtpConnectionId || null,
      };

      const createRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.id) {
        throw new Error(createData.error || 'Errore durante la creazione della campagna');
      }

      const campaignId = createData.id;

      // 2. Import Leads
      const importRes = await fetch(`/api/campaigns/${campaignId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leads.validLeads }),
      });

      const importData = await importRes.json();
      if (!importRes.ok) {
        throw new Error(importData.error || 'Errore durante il salvataggio dei contatti');
      }

      // 3. Start / Activate Campaign
      const startRes = await fetch(`/api/campaigns/${campaignId}/start`, {
        method: 'POST',
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(startData.error || 'Campagna creata ma impossibile avviarla');
      }

      // 4. Clean up Draft
      if (currentUserId && typeof window !== 'undefined') {
        localStorage.removeItem(`mailk_dummies_wizard_draft_${currentUserId}`);
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mailk_dummies_wizard_draft_v1');
      }

      // 5. Close and navigate to campaign live console
      onClose();
      router.push(`/campaigns/${campaignId}`);
    } catch (err: any) {
      console.error('Launch failed:', err);
      setErrorMessage(err.message || 'Si è verificato un errore imprevisto durante l\'avvio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    'Casella Email',
    'Nome Campagna',
    'Oggetto',
    'Corpo Email',
    'Anteprima',
    'Destinatari',
    'Programmazione',
    'Avvio',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#FBF9F6] rounded-2xl shadow-2xl border border-[#D8D2C8] flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="bg-[#1B1C1A] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16] animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#84cc16]">SETUP-DUMMIES</span>
                <span className="text-[10px] text-neutral-400">• Procedura Guidata Semplice</span>
              </div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Passo {currentStep} di 8: {stepTitles[currentStep - 1]}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {draftRestored && (
              <button
                type="button"
                onClick={handleResetDraft}
                className="px-2 py-1 text-[11px] text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded flex items-center gap-1 transition-colors"
                title="Azzera la bozza recuperata e riparti da capo"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Ricomincia</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Vuoi salvare la bozza e uscire?')) onClose();
              }}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Chiudi (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-[#E4E2DF] h-1.5 w-full shrink-0">
          <div
            className="bg-[#036E13] h-full transition-all duration-300"
            style={{ width: `${(currentStep / 8) * 100}%` }}
          />
        </div>

        {/* Draft Notice if Restored */}
        {draftRestored && currentStep === 1 && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Abbiamo recuperato la tua bozza precedente non completata.</span>
            </span>
            <button
              type="button"
              onClick={handleResetDraft}
              className="text-emerald-700 font-semibold underline hover:text-emerald-950 text-[11px]"
            >
              Azzera bozza
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {currentStep === 1 && (
            <Step1Smtp
              getSessionToken={() => sessionEpochRef.current}
              key={currentUserId || 'guest'}
              currentUserId={currentUserId}
              data={smtp}
              onUpdate={(updates, callingUserId) => {
                if (callingUserId && callingUserId !== activeUserIdRef.current) return;
                setSmtp((prev) => ({ ...prev, ...updates }));
              }}
              existingEmail={existingSenderEmail}
            />
          )}

          {currentStep === 2 && (
            <Step2CampaignName
              value={campaignName}
              onChange={(name) => setCampaignName(name)}
            />
          )}

          {currentStep === 3 && (
            <Step3Subject
              value={subject}
              onChange={(subj) => setSubject(subj)}
            />
          )}

          {currentStep === 4 && (
            <Step4BodyEditor
              value={html}
              onChange={(newHtml) => setHtml(newHtml)}
              onSubjectSuggested={(suggested) => {
                if (!subject) setSubject(suggested);
              }}
              onContentModified={handleContentModified}
            />
          )}

          {currentStep === 5 && (
            <Step5PreviewConfirm
              fromEmail={smtp.email || currentUserEmail || 'latuacasella@dominio.it'}
              fromName={currentUserName || 'Il tuo nome'}
              subject={subject}
              html={html}
              isConfirmed={isContentConfirmed}
              onConfirmChange={(confirmed) => setIsContentConfirmed(confirmed)}
            />
          )}

          {currentStep === 6 && (
            <Step6LeadsImport
              data={leads}
              onUpdate={(updates) => setLeads((prev) => ({ ...prev, ...updates }))}
            />
          )}

          {currentStep === 7 && (
            <Step7Scheduling
              data={scheduling}
              onUpdate={(updates) => setScheduling((prev) => ({ ...prev, ...updates }))}
              leadCount={leads.validLeads.length}
            />
          )}

          {currentStep === 8 && (
            <Step8SummaryLaunch
              fromEmail={smtp.email || currentUserEmail || 'latuacasella@dominio.it'}
              fromName={currentUserName || 'Il tuo nome'}
              campaignName={campaignName}
              subject={subject}
              html={html}
              leadCount={leads.validLeads.length}
              startMode={scheduling.startMode}
              scheduledDate={scheduling.scheduledDate}
              timezone={scheduling.timezone}
              isSubmitting={isSubmitting}
              onLaunch={handleLaunchCampaign}
              error={errorMessage}
            />
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="bg-[#FAF9F6] border-t border-[#D8D2C8] px-5 py-3.5 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleBack}
                className="px-4 py-2 text-xs font-semibold text-[#1B1C1A] bg-[#FAF9F6] hover:bg-[#EAE8E5] border border-[#D8D2C8] rounded-lg transition-colors flex items-center gap-1 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Indietro</span>
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-3">
            {getStepValidationHint() && (
              <span className="text-[11px] text-[#8C331B] hidden md:inline font-medium">
                {getStepValidationHint()}
              </span>
            )}

            {currentStep < 8 ? (
              <button
                type="button"
                disabled={!canProceed()}
                onClick={handleNext}
                className="px-5 py-2 text-xs font-bold text-white bg-[#036E13] hover:bg-[#02560F] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Continua</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-xs text-[#5C5E63] font-medium hidden sm:inline">
                Ultimo passaggio: premi Avvia Campagna sopra
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
