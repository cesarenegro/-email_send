'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CampaignInput } from '@/lib/validations/campaign';
import {
  Loader2,
  Save,
  CheckCircle2,
  Code,
  Edit3,
  Eye,
  UploadCloud,
  ImageIcon,
  Sparkles,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  X,
  Paperclip,
  FileText,
} from 'lucide-react';
import { SUPPORTED_TIMEZONES, getTimezoneConfig } from '@/lib/constants/timezones';
import { DateTime } from 'luxon';
import { useTranslation } from '@/lib/i18n/useTranslation';
import VisualEmailEditor, { VisualEmailEditorHandle } from '@/components/dummies/VisualEmailEditor';
import EmailPreview from '@/components/EmailPreview';
import { createClient } from '@/lib/supabase/client';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

interface UploadedImageItem {
  name: string;
  path: string;
  url: string;
  size?: number;
}

export interface TemplateImageSlot {
  originalSrc: string;
  cleanFilename: string;
  alt: string;
  width?: string;
  height?: string;
  style?: string;
}

export const getTemplateImageSlots = (html: string): TemplateImageSlot[] => {
  const slots: TemplateImageSlot[] = [];
  const seen = new Set<string>();
  const imgRegex = /<img\b([^>]*?)>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    const attrs = match[1];
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1].trim();

    // Skip absolute http/https or base64 data URIs
    if (src.startsWith('https://') || src.startsWith('http://') || src.startsWith('data:')) {
      continue;
    }

    if (seen.has(src)) continue;
    seen.add(src);

    const cleanFilename = src.split('/').pop()?.split('\\').pop() || src;
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
    const widthMatch = attrs.match(/width=["']([^"']*)["']/i);
    const heightMatch = attrs.match(/height=["']([^"']*)["']/i);
    const styleMatch = attrs.match(/style=["']([^"']*)["']/i);

    slots.push({
      originalSrc: src,
      cleanFilename,
      alt: altMatch ? altMatch[1] : '',
      width: widthMatch ? widthMatch[1] : '640',
      height: heightMatch ? heightMatch[1] : undefined,
      style: styleMatch ? styleMatch[1] : undefined,
    });
  }

  return slots;
};

const PLACEHOLDERS = [
  {
    name: '{{BANNER_IMMAGINE}}',
    label: '🖼️ Segnaposto Banner',
    snippet: `\n<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
  <tr><td align="center" style="background:#F2EDE4;border:2px dashed #036E13;border-radius:12px;padding:36px 20px;text-align:center;">
    <div style="font-size:16px;font-weight:bold;color:#036E13;margin-bottom:6px;">{{BANNER_IMMAGINE}}</div>
    <div style="font-size:12px;color:#666;">Segnaposto Banner Responsive (640px) • Clicca "Allega a segnaposto" per sostituirlo</div>
  </td></tr>
</table>\n`,
  },
  {
    name: '{{IMMAGINE_SCHEDA}}',
    label: '📦 Segnaposto Scheda',
    snippet: `\n<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;">
  <tr><td align="center" style="background:#F7F5F0;border:1px dashed #B8B0A2;border-radius:8px;padding:24px 16px;text-align:center;">
    <div style="font-size:14px;font-weight:bold;color:#1A1A1E;margin-bottom:4px;">{{IMMAGINE_SCHEDA}}</div>
    <div style="font-size:11px;color:#777;">Segnaposto Scheda Prodotto/Dettaglio</div>
  </td></tr>
</table>\n`,
  },
  {
    name: '{{LINK_IMMAGINE}}',
    label: '🔗 {{LINK_IMMAGINE}}',
    snippet: `{{LINK_IMMAGINE}}`,
  },
  {
    name: '{{IMMAGINE_1}}',
    label: '🏷️ {{IMMAGINE_1}}',
    snippet: `{{IMMAGINE_1}}`,
  },
];

interface CampaignFormProps {
  initialData?: Partial<CampaignInput> & { id?: string };
  isEditing?: boolean;
  disabled?: boolean;
  onSubmit: (data: CampaignInput) => Promise<void>;
  onChangeValues?: (data: CampaignInput) => void;
}

export default function CampaignForm({
  initialData,
  isEditing = false,
  disabled = false,
  onSubmit,
  onChangeValues,
}: CampaignFormProps) {
  const { t, locale } = useTranslation();
  const [formData, setFormData] = useState<CampaignInput>({
    name: initialData?.name || '',
    subject_template: initialData?.subject_template || '',
    html_template: initialData?.html_template || '',
    timezone: initialData?.timezone || 'Europe/Rome',
    start_at: initialData?.start_at || '',
    send_window_start: initialData?.send_window_start ? initialData.send_window_start.slice(0, 5) : '09:00',
    send_window_end: initialData?.send_window_end ? initialData.send_window_end.slice(0, 5) : '18:00',
    send_interval_seconds: initialData?.send_interval_seconds || 240,
    daily_limit: initialData?.daily_limit || 80,
  });

  const isDirtyRef = useRef(false);
  const initialLoadedRef = useRef(false);

  // Suite mode: 'standard' (as before) vs 'extended' (with images, slots, gallery, preview)
  const [suiteMode, setSuiteMode] = useState<'standard' | 'extended'>('standard');
  const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'preview'>('code');

  const [loading, setLoading] = useState(false);
  const [htmlSaving, setHtmlSaving] = useState(false);
  const [htmlSavedMsg, setHtmlSavedMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extended Media & Storage States
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [convertingBase64, setConvertingBase64] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [conversionMessage, setConversionMessage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importingEmail, setImportingEmail] = useState(false);
  const editorRef = useRef<VisualEmailEditorHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const targetedSlotRef = useRef<TemplateImageSlot | null>(null);
  const draftIdRef = useRef<string>(initialData?.id || 'draft-' + Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    if (!initialData) return;

    if (!initialLoadedRef.current) {
      setFormData({
        name: initialData.name || '',
        subject_template: initialData.subject_template || '',
        html_template: initialData.html_template || '',
        timezone: initialData.timezone || 'Europe/Rome',
        start_at: initialData.start_at || '',
        send_window_start: initialData.send_window_start ? initialData.send_window_start.slice(0, 5) : '09:00',
        send_window_end: initialData.send_window_end ? initialData.send_window_end.slice(0, 5) : '18:00',
        send_interval_seconds: initialData.send_interval_seconds || 240,
        daily_limit: initialData.daily_limit || 80,
      });
      initialLoadedRef.current = true;
      return;
    }

    if (isDirtyRef.current) return;

    setFormData((prev) => ({
      ...prev,
      ...initialData,
      send_window_start: initialData.send_window_start ? initialData.send_window_start.slice(0, 5) : prev.send_window_start,
      send_window_end: initialData.send_window_end ? initialData.send_window_end.slice(0, 5) : prev.send_window_end,
    }));
  }, [initialData]);

  const updateFormData = (updater: (prev: CampaignInput) => CampaignInput) => {
    isDirtyRef.current = true;
    setFormData((prev) => {
      const next = updater(prev);
      onChangeValues?.(next);
      return next;
    });
  };

  // Auto-fetch existing images for this campaign/draft in Supabase Storage
  useEffect(() => {
    const fetchExistingImages = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const folderPath = `${user.id}/campaigns/${draftIdRef.current}`;
        const { data: fileList, error: listError } = await supabase.storage
          .from('newsletter-images')
          .list(folderPath, {
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (listError || !fileList) return;

        const items: UploadedImageItem[] = [];
        for (const file of fileList) {
          if (!file.name || file.name.startsWith('.')) continue;
          const fullPath = `${folderPath}/${file.name}`;
          const { data: urlData } = supabase.storage.from('newsletter-images').getPublicUrl(fullPath);
          items.push({
            name: file.name,
            path: fullPath,
            url: urlData.publicUrl,
            size: file.metadata?.size,
          });
        }

        if (items.length > 0) {
          setUploadedImages(items);
        }
      } catch (err) {
        console.error('Error fetching campaign images:', err);
      }
    };

    fetchExistingImages();
  }, []);

  // Analysis of current HTML
  const base64Count = (formData.html_template.match(/data:image\/[a-zA-Z+]+;base64,/gi) || []).length;
  const hasHttpImages = /src=["']http:\/\/[^"']+["']/i.test(formData.html_template);
  const htmlBytes = new Blob([formData.html_template]).size;
  const isHeavyHtml = htmlBytes > 102 * 1024;
  const templateSlots = getTemplateImageSlots(formData.html_template);
  const detectedPlaceholders = PLACEHOLDERS.filter((p) => formData.html_template.includes(p.name));

  const insertTagAtCursor = (tagHtml: string) => {
    isDirtyRef.current = true;
    if (editorMode === 'visual') {
      editorRef.current?.insertHtml(tagHtml);
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      updateFormData((prev) => ({
        ...prev,
        html_template: prev.html_template ? prev.html_template + '\n' + tagHtml : tagHtml,
      }));
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    const newContent = before + tagHtml + after;

    updateFormData((prev) => ({
      ...prev,
      html_template: newContent,
    }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagHtml.length, start + tagHtml.length);
    }, 50);
  };

  const handleAttachToPlaceholder = (placeholderName: string, imageUrl: string) => {
    const responsiveTag = `<img src="${imageUrl}" alt="" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;">`;
    updateFormData((prev) => {
      if (placeholderName === '{{BANNER_IMMAGINE}}') {
        const bannerRegex = /<table[^>]*>[\s\S]*?\{\{BANNER_IMMAGINE\}\}[\s\S]*?<\/table>/gi;
        if (bannerRegex.test(prev.html_template)) {
          return { ...prev, html_template: prev.html_template.replace(bannerRegex, responsiveTag) };
        }
      } else if (placeholderName === '{{IMMAGINE_SCHEDA}}') {
        const cardRegex = /<table[^>]*>[\s\S]*?\{\{IMMAGINE_SCHEDA\}\}[\s\S]*?<\/table>/gi;
        if (cardRegex.test(prev.html_template)) {
          return { ...prev, html_template: prev.html_template.replace(cardRegex, responsiveTag) };
        }
      }
      return { ...prev, html_template: prev.html_template.split(placeholderName).join(responsiveTag) };
    });

    setUploadSuccessMessage(locale === 'en' ? `Attached to placeholder ${placeholderName}!` : `Allegato con successo al segnaposto ${placeholderName}!`);
    setTimeout(() => setUploadSuccessMessage(null), 3000);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImage(true);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploadErrorMessage(locale === 'en' ? 'Authentication required' : 'Accesso richiesto per caricare immagini');
      setUploadingImage(false);
      return;
    }

    const newUploaded: UploadedImageItem[] = [];
    const targetedSlot = targetedSlotRef.current;
    targetedSlotRef.current = null;

    try {
      for (const file of files) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          throw new Error(locale === 'en' ? `Unsupported format for ${file.name}. Only JPEG, PNG, WebP, GIF allowed.` : `Formato non supportato per ${file.name}. Consentiti solo JPEG, PNG, WebP e GIF.`);
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(locale === 'en' ? `File ${file.name} exceeds 3 MB limit.` : `Il file ${file.name} supera il limite di 3 MB.`);
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const safeBaseName = file.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
        const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const filename = `${safeBaseName}-${uniqueSuffix}.${ext}`;
        const filePath = `${user.id}/campaigns/${draftIdRef.current}/${filename}`;

        const { error: uploadErr } = await supabase.storage
          .from('newsletter-images')
          .upload(filePath, file, {
            cacheControl: '31536000',
            contentType: file.type,
            upsert: false,
          });

        if (uploadErr) {
          throw new Error(`Upload error: ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage.from('newsletter-images').getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        const item: UploadedImageItem = {
          name: file.name,
          path: filePath,
          url: publicUrl,
          size: file.size,
        };

        newUploaded.push(item);

        // Auto-link to matching template slot or targeted slot
        if (targetedSlot) {
          updateFormData((prev) => ({
            ...prev,
            html_template: prev.html_template.split(targetedSlot.originalSrc).join(publicUrl),
          }));
        } else {
          const matchingSlot = templateSlots.find((s) => {
            const clean = s.cleanFilename.toLowerCase();
            const fName = file.name.toLowerCase();
            return (
              clean === fName ||
              clean.replace(/\.[^/.]+$/, '') === fName.replace(/\.[^/.]+$/, '') ||
              fName.startsWith(clean.slice(0, 3))
            );
          });

          if (matchingSlot) {
            updateFormData((prev) => ({
              ...prev,
              html_template: prev.html_template.split(matchingSlot.originalSrc).join(publicUrl),
            }));
          }
        }
      }

      setUploadedImages((prev) => [...newUploaded, ...prev]);

      // If only 1 file and not targeted to a slot, insert tag at cursor
      if (files.length === 1 && !targetedSlot && newUploaded.length === 1) {
        const item = newUploaded[0];
        const tagHtml = `<img src="${item.url}" alt="" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;">`;
        insertTagAtCursor(tagHtml);
      }

      setUploadSuccessMessage(locale === 'en' ? `Uploaded ${newUploaded.length} image(s) successfully!` : `Caricate ${newUploaded.length} immagini con successo!`);
      setTimeout(() => setUploadSuccessMessage(null), 3500);
    } catch (err: any) {
      setUploadErrorMessage(err.message || (locale === 'en' ? 'Error during image upload' : 'Errore durante il caricamento'));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAutoConnectTemplateImages = () => {
    let replacements = 0;
    let newHtml = formData.html_template;

    for (const slot of templateSlots) {
      const match = uploadedImages.find((img) => {
        const imgName = img.name.toLowerCase();
        const slotClean = slot.cleanFilename.toLowerCase();
        return (
          imgName === slotClean ||
          imgName.replace(/\.[^/.]+$/, '') === slotClean.replace(/\.[^/.]+$/, '') ||
          imgName.startsWith(slotClean.slice(0, 3))
        );
      });

      if (match) {
        newHtml = newHtml.split(slot.originalSrc).join(match.url);
        replacements++;
      }
    }

    if (replacements > 0) {
      updateFormData((prev) => ({ ...prev, html_template: newHtml }));
      setUploadSuccessMessage(locale === 'en' ? `Connected ${replacements} template images!` : `Collegate con successo ${replacements} immagini del template!`);
      setTimeout(() => setUploadSuccessMessage(null), 3500);
    } else {
      setUploadErrorMessage(locale === 'en' ? 'No matching uploaded images found for detected slots.' : 'Nessuna immagine caricata corrisponde ai tag rilevati nel template.');
    }
  };

  const handleConvertAllBase64 = async () => {
    setConvertingBase64(true);
    setConversionMessage(null);
    setUploadErrorMessage(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploadErrorMessage(locale === 'en' ? 'Authentication required' : 'Accesso richiesto per convertire immagini');
      setConvertingBase64(false);
      return;
    }

    try {
      const base64Regex = /src=["'](data:image\/([a-zA-Z+]+);base64,([^"']+))["']/gi;
      const matches: { full: string; mimeType: string; base64: string }[] = [];
      let m: RegExpExecArray | null;

      while ((m = base64Regex.exec(formData.html_template)) !== null) {
        matches.push({
          full: m[1],
          mimeType: `image/${m[2]}`,
          base64: m[3],
        });
      }

      if (matches.length === 0) {
        setConversionMessage(locale === 'en' ? 'No Base64 images found' : 'Nessuna immagine Base64 trovata');
        setConvertingBase64(false);
        return;
      }

      let updatedHtml = formData.html_template;
      const newlyUploaded: UploadedImageItem[] = [];

      for (let i = 0; i < matches.length; i++) {
        const item = matches[i];
        const byteCharacters = atob(item.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let j = 0; j < byteCharacters.length; j++) {
          byteNumbers[j] = byteCharacters.charCodeAt(j);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: item.mimeType });

        const ext = item.mimeType.split('/')[1] || 'jpg';
        const filename = `converted-${Date.now()}-${i + 1}.${ext}`;
        const filePath = `${user.id}/campaigns/${draftIdRef.current}/${filename}`;

        const { error: uploadErr } = await supabase.storage
          .from('newsletter-images')
          .upload(filePath, blob, {
            cacheControl: '31536000',
            contentType: item.mimeType,
            upsert: false,
          });

        if (uploadErr) {
          throw new Error(`Upload error on image #${i + 1}: ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage.from('newsletter-images').getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        updatedHtml = updatedHtml.split(item.full).join(publicUrl);
        newlyUploaded.push({
          name: filename,
          path: filePath,
          url: publicUrl,
          size: blob.size,
        });
      }

      updateFormData((prev) => ({ ...prev, html_template: updatedHtml }));
      setUploadedImages((prev) => [...newlyUploaded, ...prev]);
      setConversionMessage(locale === 'en' ? `Successfully converted ${matches.length} Base64 image(s) to HTTPS!` : `Convertite con successo ${matches.length} immagini Base64 in URL HTTPS!`);
      setTimeout(() => setConversionMessage(null), 4000);
    } catch (err: any) {
      setUploadErrorMessage(err.message || (locale === 'en' ? 'Error during Base64 conversion' : 'Errore durante la conversione Base64'));
    } finally {
      setConvertingBase64(false);
    }
  };

  const handleDeleteImage = async (item: UploadedImageItem) => {
    if (!confirm(locale === 'en' ? 'Are you sure you want to delete this image?' : 'Vuoi davvero eliminare questa immagine?')) return;

    try {
      const supabase = createClient();
      await supabase.storage.from('newsletter-images').remove([item.path]);
      setUploadedImages((prev) => prev.filter((img) => img.path !== item.path));
      setUploadSuccessMessage(locale === 'en' ? 'Image deleted' : 'Immagine eliminata');
      setTimeout(() => setUploadSuccessMessage(null), 3000);
    } catch (err: any) {
      setUploadErrorMessage(err.message || (locale === 'en' ? 'Error deleting image' : 'Errore eliminazione'));
    }
  };

  const handleImportEmailFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingEmail(true);
    setError(null);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const res = await fetch('/api/email-import/parse', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (locale === 'en' ? 'Error importing file' : 'Errore durante l’importazione del file'));
      }

      // Update name and subject if present
      if (data.subject) {
        updateFormData((prev) => ({
          ...prev,
          name: prev.name ? prev.name : data.subject,
          subject_template: data.subject,
        }));
      }

      // Update HTML
      if (data.html) {
        updateFormData((prev) => ({
          ...prev,
          html_template: data.html,
        }));
      }

      // Add extracted images to uploadedImages state
      if (data.images && data.images.length > 0) {
        setUploadedImages((prev) => {
          const existingPaths = new Set(prev.map((img) => img.path));
          const toAdd = data.images.filter((img: UploadedImageItem) => !existingPaths.has(img.path));
          return [...toAdd, ...prev];
        });
      }

      // Automatically switch to Extended mode and Live Preview
      setSuiteMode('extended');
      setEditorMode('preview');

      const imgCount = data.images?.length || 0;
      setUploadSuccessMessage(
        locale === 'en'
          ? `Imported ${file.name} successfully! (${imgCount} image(s) extracted and uploaded to storage).`
          : `Email importata con successo da ${file.name}! (${imgCount} immagini estratte e collegate in HTTPS).`
      );
      setTimeout(() => setUploadSuccessMessage(null), 5000);
    } catch (err: any) {
      setUploadErrorMessage(err.message || (locale === 'en' ? 'Error importing file' : 'Errore durante l’importazione'));
    } finally {
      setImportingEmail(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  const buildPayload = () => ({
    ...formData,
    send_window_start: formData.send_window_start ? formData.send_window_start.slice(0, 5) : '09:00',
    send_window_end: formData.send_window_end ? formData.send_window_end.slice(0, 5) : '18:00',
    start_at: formData.start_at && typeof formData.start_at === 'string' && formData.start_at.trim() !== ''
      ? formData.start_at
      : null,
  });

  const handleQuickSaveHtml = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    if (base64Count > 0) {
      setError(locale === 'en' ? 'Cannot save: embedded Base64 images are present. Please convert them to HTTPS first.' : 'Impossibile salvare la campagna: sono presenti immagini incorporate in Base64. Convertile prima in URL HTTPS.');
      return;
    }

    setHtmlSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      await onSubmit(payload);
      isDirtyRef.current = false;
      setHtmlSavedMsg(true);
      setTimeout(() => setHtmlSavedMsg(false), 3000);
    } catch (err: any) {
      setError(err.message || (locale === 'en' ? 'Error during save' : 'Errore durante il salvataggio'));
    } finally {
      setHtmlSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (base64Count > 0) {
      setError(locale === 'en' ? 'Cannot save: embedded Base64 images are present. Please convert them to HTTPS first.' : 'Impossibile salvare la campagna: sono presenti immagini incorporate in Base64. Convertile prima in URL HTTPS.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = buildPayload();
      await onSubmit(payload);
      isDirtyRef.current = false;
    } catch (err: any) {
      setError(err.message || (locale === 'en' ? 'Error during save' : 'Errore durante il salvataggio'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {disabled && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
          {locale === 'en'
            ? 'Fields are locked because the campaign is ACTIVE. PAUSE the campaign to edit them.'
            : 'I campi sono bloccati perché la campagna è ATTIVA. Metti in PAUSA la campagna per modificarli.'}
        </div>
      )}

      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1E] mb-1">
          {locale === 'en' ? 'Campaign Name' : 'Nome Campagna'} <span className="text-rose-600">*</span>
        </label>
        <input
          type="text"
          required
          disabled={disabled}
          placeholder={locale === 'en' ? 'e.g. Modern Italian Furniture' : 'es. Mobili Italia'}
          value={formData.name}
          onChange={(e) => updateFormData((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0]"
        />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1E] mb-1">
          {locale === 'en' ? 'Email Subject' : 'Oggetto Email'} <span className="text-rose-600">*</span>
        </label>
        <input
          type="text"
          required
          disabled={disabled}
          placeholder={locale === 'en' ? 'e.g. 3D Renders for {{companyName}}' : 'es. Render per {{azienda}}'}
          value={formData.subject_template}
          onChange={(e) => updateFormData((prev) => ({ ...prev, subject_template: e.target.value }))}
          className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0]"
        />
        <p className="text-xs text-[#666666] mt-1">
          {locale === 'en'
            ? 'Supports placeholders: {{companyName}}, {{azienda}}, {{email}} (case-insensitive)'
            : 'Supporta i segnaposto: {{NOME_AZIENDA}}, {{azienda}}, {{companyName}}, {{email}} (anche con spazi o maiuscole/minuscole)'}
        </p>
      </div>

      {/* 2-MENU SUITE SELECTOR: STANDARD vs ESTESA (CON IMMAGINI) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-[#D8D2C8] rounded-xl shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">
            {locale === 'en' ? 'Campaign Email Mode' : 'Modalità Editor Campagna'}
          </span>
          <p className="text-xs text-[#555555]">
            {suiteMode === 'standard'
              ? (locale === 'en' ? 'Standard mode: clean HTML/Visual editor without media asset manager.' : 'Modalità Standard: editor rapido essenziale (senza pannello media assets).')
              : (locale === 'en' ? 'Extended mode: upload images to Supabase Storage, auto-match template slots, and live email preview.' : 'Modalità Estesa: upload immagini su Supabase Storage, auto-collegamento slot template e anteprima live.')}
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => importFileInputRef.current?.click()}
            disabled={importingEmail || disabled}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 text-white text-xs font-bold hover:bg-indigo-800 transition-all shadow-xs disabled:opacity-50"
            title={locale === 'en' ? 'Import from Outlook / Apple Mail (.eml) or .zip archive with images' : 'Importa email già pronta da Outlook, Apple Mail (.eml) o archivio .zip con immagini'}
          >
            {importingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
            <span>{importingEmail ? (locale === 'en' ? 'Importing...' : 'Importazione...') : (locale === 'en' ? 'IMPORTA (.EML / .ZIP)' : 'IMPORTA (.EML / .ZIP)')}</span>
          </button>

          <div className="flex items-center bg-[#EAE8E5] p-1 rounded-lg border border-[#D8D2C8] text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setSuiteMode('standard');
                if (editorMode === 'preview') setEditorMode('code');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                suiteMode === 'standard'
                  ? 'bg-white text-[#1B1C1A] shadow-xs'
                  : 'text-[#666666] hover:text-[#1B1C1A]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{locale === 'en' ? 'STANDARD' : 'STANDARD (Base)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSuiteMode('extended')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                suiteMode === 'extended'
                  ? 'bg-[#036E13] text-white shadow-xs font-bold'
                  : 'text-[#666666] hover:text-[#1B1C1A]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{locale === 'en' ? 'EXTENDED (With Images)' : 'ESTESA (Con Immagini)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input for single or multi image upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageFileSelect}
        className="hidden"
      />

      {/* Hidden file input for pre-made email import (.eml, .msg, .zip, .html, .txt) */}
      <input
        ref={importFileInputRef}
        type="file"
        accept=".eml,.msg,.zip,.html,.htm,.txt"
        onChange={handleImportEmailFile}
        className="hidden"
      />

      {/* ----------------- SUITE STANDARD ----------------- */}
      {suiteMode === 'standard' && (
        <div className="space-y-2 bg-[#FAF9F6] p-4 border border-[#D8D2C8] rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E6E2DC]">
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1E]">
                {editorMode === 'visual'
                  ? (locale === 'en' ? 'Email Body (Visual Simple Editor)' : 'Corpo Email (Editor Semplice)')
                  : (locale === 'en' ? 'Email HTML (Source Code)' : 'Email HTML (Codice Sorgente)')}{' '}
                <span className="text-rose-600">*</span>
              </label>
              <p className="text-xs text-[#666666]">
                {editorMode === 'visual'
                  ? (locale === 'en'
                      ? 'Format your email message visually with headings, lists, links and dynamic placeholders.'
                      : 'Formatta facilmente la tua email con titoli, elenchi, grassetto, link e segnaposto dinamici.')
                  : (locale === 'en'
                      ? 'Paste or edit your HTML email code here. Click "Save HTML Code" to save instantly.'
                      : 'Incolla o modifica qui il codice HTML. Clicca "Salva Codice HTML" per salvare subito.')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#EAE8E5] p-0.5 rounded-lg border border-[#D8D2C8] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                    editorMode === 'visual'
                      ? 'bg-white text-[#1B1C1A] font-semibold shadow-xs'
                      : 'text-[#666666] hover:text-[#1B1C1A]'
                  }`}
                  title={locale === 'en' ? 'Switch to Simple Visual Editor' : 'Passa all’Editor Visuale Semplice'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'Visual Editor' : 'Editor Semplice'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('code')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                    editorMode === 'code'
                      ? 'bg-white text-[#1B1C1A] font-semibold shadow-xs'
                      : 'text-[#666666] hover:text-[#1B1C1A]'
                  }`}
                  title={locale === 'en' ? 'Switch to Raw HTML Code' : 'Passa al Codice HTML'}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'HTML Code' : 'Codice HTML'}</span>
                </button>
              </div>

              {htmlSavedMsg && (
                <span className="text-xs text-emerald-700 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'Saved!' : 'Salvato!'}</span>
                </span>
              )}
              <button
                type="button"
                disabled={disabled || htmlSaving || loading}
                onClick={handleQuickSaveHtml}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1A1E] text-white text-xs font-semibold rounded hover:bg-[#333333] transition-colors disabled:opacity-50 shadow-sm"
                title={locale === 'en' ? 'Instantly save changes to HTML code' : 'Salva immediatamente le modifiche al codice HTML'}
              >
                {htmlSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{locale === 'en' ? 'Saving...' : 'Salvataggio...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{locale === 'en' ? 'Save Email' : 'Salva Codice HTML'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {editorMode === 'visual' ? (
            <div className="space-y-1">
              <VisualEmailEditor
                ref={editorRef}
                value={formData.html_template}
                onChange={(newHtml) => updateFormData((prev) => ({ ...prev, html_template: newHtml }))}
                disabled={disabled}
                placeholder={locale === 'en' ? 'Type or format your email message here...' : 'Scrivi o formatta qui la tua email...'}
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              rows={12}
              required
              disabled={disabled}
              placeholder="<!DOCTYPE html><html><body><p>Hello {{companyName}}, ...</p></body></html>"
              value={formData.html_template}
              onChange={(e) => updateFormData((prev) => ({ ...prev, html_template: e.target.value }))}
              className="w-full px-3 py-2.5 font-mono text-xs border border-[#D8D2C8] rounded text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0] leading-relaxed"
              spellCheck={false}
            />
          )}

          <div className="flex justify-between items-center text-xs text-[#666666] pt-1">
            <span>
              {locale === 'en' ? 'Estimated size:' : 'Dimensione stimata:'}{' '}
              <strong>{Math.round(htmlBytes / 1024)} KB</strong>
            </span>
            {formData.html_template !== initialData?.html_template && (
              <span className="text-amber-700 font-medium">
                {locale === 'en' ? '● Unsaved HTML changes' : '● Modifiche HTML non ancora salvate'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ----------------- SUITE ESTESA (CON IMMAGINI) ----------------- */}
      {suiteMode === 'extended' && (
        <div className="space-y-4 bg-[#FAF9F6] p-4 border border-[#D8D2C8] rounded-xl shadow-xs">
          {/* Base64 Images Detection Banner */}
          {base64Count > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-sm">
                    {locale === 'en' ? `${base64Count} Base64 embedded image(s) detected.` : `Rilevate ${base64Count} immagini incorporate in Base64.`}
                  </span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {locale === 'en'
                      ? 'Base64 images bloat campaign emails and trigger spam filters. Convert them to HTTPS Supabase Storage before launching.'
                      : "Le immagini in Base64 appesantiscono l'email e finiscono nello spam. Convertile in URL HTTPS Supabase Storage prima dell'invio."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConvertAllBase64}
                disabled={convertingBase64 || uploadingImage}
                className="shrink-0 inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-amber-700 text-white font-semibold hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-xs"
              >
                {convertingBase64 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{convertingBase64 ? (locale === 'en' ? 'Converting...' : 'Conversione...') : (locale === 'en' ? 'Convert Base64 to HTTPS' : 'Converti Base64 in HTTPS')}</span>
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {uploadSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadSuccessMessage}</span>
              </div>
              <button type="button" onClick={() => setUploadSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {conversionMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{conversionMessage}</span>
              </div>
              <button type="button" onClick={() => setConversionMessage(null)} className="text-blue-700 hover:text-blue-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {uploadErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadErrorMessage}</span>
              </div>
              <button type="button" onClick={() => setUploadErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Warnings: HTTP non-secure images or heavy HTML */}
          {hasHttpImages && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center space-x-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{locale === 'en' ? 'Warning: images with insecure HTTP URLs detected. Please use HTTPS URLs.' : 'Attenzione: presenti immagini con URL non sicuro (HTTP). Utilizza URL HTTPS.'}</span>
            </div>
          )}

          {isHeavyHtml && (
            <div className="p-3 bg-stone-100 border border-stone-300 text-stone-700 text-xs rounded-xl flex items-center space-x-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-stone-500 shrink-0" />
              <span>{locale === 'en' ? `Warning: HTML code size is heavy (${Math.round(htmlBytes / 1024)} KB). Email clients might clip it.` : `Attenzione: il codice HTML è pesante (${Math.round(htmlBytes / 1024)} KB). Molti client potrebbero troncarlo.`}</span>
            </div>
          )}

          {/* Template Images Detection Card */}
          {templateSlots.length > 0 && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 text-xs shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <ImageIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold text-sm text-indigo-900">
                      {locale === 'en'
                        ? `Detected ${templateSlots.length} template image slots waiting for upload`
                        : `Rilevate ${templateSlots.length} immagini nel template HTML in attesa di caricamento`}
                    </span>
                    <p className="text-[11px] text-indigo-800 mt-0.5">
                      {locale === 'en'
                        ? 'Image tags contain local filenames. Upload your images to link them automatically maintaining original width and styles.'
                        : 'I tag immagine contengono nomi di file locali. Carica le immagini dal tuo PC per collegarle automaticamente mantenendo larghezza e stili originali.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-2 shrink-0">
                  {uploadedImages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoConnectTemplateImages}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                      title={locale === 'en' ? 'Auto-connect template images to already uploaded files' : 'Collega automaticamente tutte le immagini del template già caricate'}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{locale === 'en' ? 'Auto-Connect Uploaded' : 'Collega con immagini caricate'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      targetedSlotRef.current = null;
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingImage}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-700 text-white font-semibold hover:bg-indigo-800 disabled:opacity-50 transition-colors shadow-xs"
                    title={locale === 'en' ? 'Select multiple images from your PC' : 'Seleziona tutte le immagini contemporaneamente dal PC'}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{locale === 'en' ? 'Upload All (Multi-Select)' : 'Carica tutte insieme (Selezione Multipla)'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {templateSlots.map((slot, idx) => (
                  <div
                    key={slot.originalSrc + idx}
                    className="p-3 bg-white border border-indigo-100 rounded-lg flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">
                          TAG #{idx + 1}
                        </span>
                        <span className="font-semibold text-xs text-[#1A1A1E] truncate font-mono" title={slot.cleanFilename}>
                          {slot.cleanFilename}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#666666] truncate mt-1">
                        {slot.alt ? `Alt: "${slot.alt}"` : (locale === 'en' ? 'No alt' : 'Nessun alt')} • {slot.width ? `${slot.width}px` : '100%'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {uploadedImages.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              updateFormData((prev) => ({
                                ...prev,
                                html_template: prev.html_template.split(slot.originalSrc).join(e.target.value),
                              }));
                              setUploadSuccessMessage(locale === 'en' ? `Tag ${slot.cleanFilename} linked!` : `Tag ${slot.cleanFilename} collegato!`);
                              setTimeout(() => setUploadSuccessMessage(null), 3000);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                          className="px-2 py-1 text-[11px] bg-white border border-stone-300 rounded text-[#1A1A1E]"
                        >
                          <option value="" disabled>
                            {locale === 'en' ? 'Link with...' : 'Collega con...'}
                          </option>
                          {uploadedImages.map((img) => (
                            <option key={img.path} value={img.url}>
                              {img.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          targetedSlotRef.current = slot;
                          fileInputRef.current?.click();
                        }}
                        disabled={uploadingImage}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 rounded transition-colors"
                      >
                        {locale === 'en' ? 'Upload' : 'Carica'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Extended Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E6E2DC]">
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                disabled={importingEmail || disabled}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-700 text-white text-xs font-bold hover:bg-indigo-800 transition-all shadow-xs disabled:opacity-50"
                title={locale === 'en' ? 'Import pre-made email from Outlook, Apple Mail (.eml) or .zip archive' : 'Importa email già pronta da Outlook, Apple Mail (.eml) o archivio .zip'}
              >
                {importingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{importingEmail ? (locale === 'en' ? 'Importing...' : 'Importazione...') : (locale === 'en' ? 'IMPORTA (.EML / .ZIP)' : 'IMPORTA (.EML / .ZIP)')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  targetedSlotRef.current = null;
                  fileInputRef.current?.click();
                }}
                disabled={uploadingImage}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#036E13] text-white text-xs font-bold hover:bg-[#02560f] transition-all shadow-xs disabled:opacity-50"
              >
                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{uploadingImage ? (locale === 'en' ? 'Uploading...' : 'Caricamento...') : (locale === 'en' ? 'UPLOAD IMAGE' : 'CARICA IMMAGINE')}</span>
              </button>

              {/* Sub-toolbar Segnaposti */}
              <div className="flex items-center flex-wrap gap-1 bg-[#EAE8E5] p-1 rounded-lg border border-[#D8D2C8]">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => insertTagAtCursor(p.snippet)}
                    className="px-2 py-1 rounded bg-white text-[#1B1C1A] text-[11px] font-semibold hover:bg-stone-50 border border-stone-200 transition-colors"
                    title={locale === 'en' ? `Insert placeholder ${p.name}` : `Inserisci segnaposto ${p.name}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3-Tab Switcher: Visual, HTML Code, Live Preview */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#EAE8E5] p-0.5 rounded-lg border border-[#D8D2C8] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                    editorMode === 'visual'
                      ? 'bg-white text-[#1B1C1A] font-semibold shadow-xs'
                      : 'text-[#666666] hover:text-[#1B1C1A]'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'Visual' : 'Editor Semplice'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('code')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                    editorMode === 'code'
                      ? 'bg-white text-[#1B1C1A] font-semibold shadow-xs'
                      : 'text-[#666666] hover:text-[#1B1C1A]'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'HTML Code' : 'Codice HTML'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('preview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                    editorMode === 'preview'
                      ? 'bg-white text-[#1B1C1A] font-semibold shadow-xs'
                      : 'text-[#666666] hover:text-[#1B1C1A]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'Live Preview' : 'Anteprima Live'}</span>
                </button>
              </div>

              {htmlSavedMsg && (
                <span className="text-xs text-emerald-700 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'Saved!' : 'Salvato!'}</span>
                </span>
              )}
              <button
                type="button"
                disabled={disabled || htmlSaving || loading}
                onClick={handleQuickSaveHtml}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1A1E] text-white text-xs font-semibold rounded hover:bg-[#333333] transition-colors disabled:opacity-50 shadow-sm"
              >
                {htmlSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{locale === 'en' ? 'Saving...' : 'Salvataggio...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{locale === 'en' ? 'Save Email' : 'Salva Codice HTML'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Placeholders Banner */}
          {detectedPlaceholders.length > 0 && (
            <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-stone-500" />
                <span>
                  {locale === 'en'
                    ? `Detected image placeholders in text (${detectedPlaceholders.length}). Click on an uploaded image to attach it directly.`
                    : `Rilevati segnaposti immagine nel testo (${detectedPlaceholders.length}). Clicca su un'immagine caricata per allegarla direttamente.`}
                </span>
              </div>
              <div className="flex gap-1.5">
                {detectedPlaceholders.map((p) => (
                  <span key={p.name} className="px-2 py-0.5 rounded bg-white border border-stone-300 font-mono text-[10px] text-stone-800 font-bold">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Images Gallery Section */}
          {uploadedImages.length > 0 && (
            <div className="p-3 bg-white border border-[#D8D2C8] rounded-xl space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-[#666666]">
                <span className="font-semibold text-[#1A1A1E] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#036E13]" />
                  <span>{locale === 'en' ? 'Uploaded Images' : 'Immagini caricate'} ({uploadedImages.length})</span>
                </span>
                <span className="text-[11px] text-[#888888]">
                  {locale === 'en' ? 'Click "Insert in HTML" or "Attach to placeholder" to place in email' : 'Clicca "Inserisci" o "Allega a segnaposto" per posizionare nell\'email'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {uploadedImages.map((img) => (
                  <div
                    key={img.path}
                    className="p-2 border border-stone-200 rounded-lg bg-stone-50 flex items-center space-x-2.5 hover:border-stone-300 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 bg-white border border-stone-200 rounded overflow-hidden shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Metadata & Actions */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#1A1A1E] truncate" title={img.name}>
                        {img.name}
                      </p>
                      {img.size && (
                        <p className="text-[10px] text-[#777777]">{Math.round(img.size / 1024)} KB</p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const tag = `<img src="${img.url}" alt="" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;">`;
                            insertTagAtCursor(tag);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1A1A1E] text-white hover:bg-[#333333] transition-colors"
                        >
                          {locale === 'en' ? 'Insert' : 'Inserisci'}
                        </button>

                        {detectedPlaceholders.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAttachToPlaceholder(detectedPlaceholders[0].name, img.url)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                            title={locale === 'en' ? `Attach to ${detectedPlaceholders[0].name}` : `Allega a ${detectedPlaceholders[0].name}`}
                          >
                            {locale === 'en' ? 'Attach' : 'Allega'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(img.url);
                            setCopiedUrl(img.path);
                            setTimeout(() => setCopiedUrl(null), 2000);
                          }}
                          className="p-1 rounded text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition-colors"
                          title={locale === 'en' ? 'Copy URL' : 'Copia URL'}
                        >
                          {copiedUrl === img.path ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img)}
                          className="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition-colors"
                          title={locale === 'en' ? 'Delete Image' : 'Elimina Immagine'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Editor Tab View */}
          {editorMode === 'visual' && (
            <div className="space-y-1">
              <VisualEmailEditor
                ref={editorRef}
                value={formData.html_template}
                onChange={(newHtml) => updateFormData((prev) => ({ ...prev, html_template: newHtml }))}
                disabled={disabled}
                placeholder={locale === 'en' ? 'Type or format your email message here...' : 'Scrivi o formatta qui la tua email...'}
              />
            </div>
          )}

          {editorMode === 'code' && (
            <textarea
              ref={textareaRef}
              rows={14}
              required
              disabled={disabled}
              placeholder="<!DOCTYPE html><html><body><p>Hello {{companyName}}, ...</p></body></html>"
              value={formData.html_template}
              onChange={(e) => updateFormData((prev) => ({ ...prev, html_template: e.target.value }))}
              className="w-full px-3 py-2.5 font-mono text-xs border border-[#D8D2C8] rounded-lg text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0] leading-relaxed"
              spellCheck={false}
            />
          )}

          {editorMode === 'preview' && (
            <div className="border border-[#D8D2C8] rounded-xl overflow-hidden bg-white shadow-2xs">
              <EmailPreview
                subjectTemplate={formData.subject_template}
                htmlTemplate={formData.html_template}
                sampleData={{
                  company_name: 'Studio Architettura Rossi S.r.l.',
                  name: 'Arch. Marco Rossi',
                  email: 'info@studiorossi.it',
                }}
              />
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-[#666666] pt-1">
            <span>
              {locale === 'en' ? 'Estimated size:' : 'Dimensione stimata:'}{' '}
              <strong>{Math.round(htmlBytes / 1024)} KB</strong>
            </span>
            {formData.html_template !== initialData?.html_template && (
              <span className="text-amber-700 font-medium">
                {locale === 'en' ? '● Unsaved HTML changes' : '● Modifiche HTML non ancora salvate'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Scheduling Card */}
      <div className="bg-[#F7F5F0] border border-[#D8D2C8] rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-semibold text-[#1A1A1E]">
          {locale === 'en' ? 'Scheduling & Pacing Window' : 'Pianificazione e Invio Scaglionato'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">
              {locale === 'en' ? 'Dispatch Timezone' : 'Fuso Orario di Invio'}
            </label>
            <select
              disabled={disabled}
              value={formData.timezone}
              onChange={(e) => updateFormData((prev) => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] font-medium disabled:bg-[#F7F5F0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
            >
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.utcOffset})
                </option>
              ))}
              {!SUPPORTED_TIMEZONES.some((tz) => tz.value === formData.timezone) && (
                <option value={formData.timezone}>
                  {formData.timezone} ({locale === 'en' ? 'Custom' : 'Personalizzato'})
                </option>
              )}
            </select>
            <div className="mt-1 text-[11px] text-[#666666] flex items-center justify-between">
              <span className="truncate pr-1">{getTimezoneConfig(formData.timezone).shortLabel}</span>
              <span className="font-mono text-[#1A1A1E] font-medium shrink-0">
                {(() => {
                  try {
                    return `${locale === 'en' ? 'Time:' : 'Ora:'} ${DateTime.now().setZone(formData.timezone || 'Europe/Rome').toFormat('HH:mm')}`;
                  } catch {
                    return '';
                  }
                })()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">
              {locale === 'en' ? 'Window Start (HH:mm)' : 'Finestra Inizio (HH:mm)'}
            </label>
            <input
              type="time"
              disabled={disabled}
              value={formData.send_window_start}
              onChange={(e) => updateFormData((prev) => ({ ...prev, send_window_start: e.target.value }))}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] font-medium disabled:bg-[#F7F5F0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">
              {locale === 'en' ? 'Window End (HH:mm)' : 'Finestra Fine (HH:mm)'}
            </label>
            <input
              type="time"
              disabled={disabled}
              value={formData.send_window_end}
              onChange={(e) => updateFormData((prev) => ({ ...prev, send_window_end: e.target.value }))}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] font-medium disabled:bg-[#F7F5F0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E6E2DC]">
          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">
              {locale === 'en' ? 'Pacing Interval (seconds)' : 'Intervallo di Invio (secondi)'}
            </label>
            <input
              type="number"
              min={60}
              step={10}
              disabled={disabled}
              value={formData.send_interval_seconds}
              onChange={(e) =>
                updateFormData((prev) => ({
                  ...prev,
                  send_interval_seconds: parseInt(e.target.value) || 240,
                }))
              }
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] font-medium disabled:bg-[#F7F5F0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
            />
            <p className="text-[11px] text-[#666666] mt-1">
              {locale === 'en'
                ? 'Time between consecutive dispatches. Recommended: 180s - 300s to protect SMTP reputation.'
                : "Tempo minimo tra un invio e il successivo. Consigliato: 180s - 300s per proteggere la reputazione dell'IP."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">
              {locale === 'en' ? 'Daily Send Limit' : 'Limite Massimo Giornaliero'}
            </label>
            <input
              type="number"
              min={1}
              max={500}
              disabled={disabled}
              value={formData.daily_limit}
              onChange={(e) =>
                updateFormData((prev) => ({
                  ...prev,
                  daily_limit: parseInt(e.target.value) || 80,
                }))
              }
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] font-medium disabled:bg-[#F7F5F0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
            />
            <p className="text-[11px] text-[#666666] mt-1">
              {locale === 'en'
                ? 'Maximum emails dispatched per day for this campaign (Default: 80).'
                : 'Numero massimo di email inviabili al giorno per questa campagna (Default: 80).'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#1A1A1E] mb-1">
            {locale === 'en' ? 'Start Date & Time (Optional)' : 'Data e Ora di Avvio (Opzionale)'}
          </label>
          <input
            type="datetime-local"
            disabled={disabled}
            value={formData.start_at || ''}
            onChange={(e) => updateFormData((prev) => ({ ...prev, start_at: e.target.value }))}
            className="w-full sm:w-auto px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] font-medium disabled:bg-[#F7F5F0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
          />
          <p className="text-[11px] text-[#666666] mt-1">
            {locale === 'en'
              ? 'Leave empty to allow dispatch immediately once activated within the time window.'
              : "Lascia vuoto per consentire l'invio immediato all'attivazione all'interno della finestra oraria."}
          </p>
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-[#D8D2C8]">
        <button
          type="submit"
          disabled={disabled || loading}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#1A1A1E] text-white text-sm font-semibold rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>
            {isEditing
              ? (locale === 'en' ? 'Update Campaign Settings' : 'Aggiorna Impostazioni Campagna')
              : (locale === 'en' ? 'Create Campaign' : 'Crea Campagna')}
          </span>
        </button>
      </div>
    </form>
  );
}
