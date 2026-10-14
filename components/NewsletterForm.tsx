'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Newspaper,
  Send,
  Calendar,
  Eye,
  Code,
  Edit3,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  UploadCloud,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Sparkles,
  ImageIcon,
  X,
  Paperclip,
} from 'lucide-react';
import EmailPreview from '@/components/EmailPreview';
import VisualEmailEditor, { VisualEmailEditorHandle } from '@/components/dummies/VisualEmailEditor';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { createClient } from '@/lib/supabase/client';

const TIMEZONES = [
  { value: 'Europe/Rome', label: 'Europa / Roma (CET/CEST)' },
  { value: 'America/New_York', label: 'America / New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America / Los Angeles (PST/PDT)' },
  { value: 'Asia/Dubai', label: 'Asia / Dubai (GST)' },
  { value: 'Asia/Makassar', label: 'Asia / Bali - Makassar (WITA)' },
];

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

interface NewsletterFormProps {
  initialNewsletter?: {
    id: string;
    title: string;
    subject: string;
    html_content: string;
    timezone: string;
    scheduled_at: string | null;
    send_interval_seconds: number;
    status: string;
    smtp_connection_id?: string | null;
  };
}

export default function NewsletterForm({ initialNewsletter }: NewsletterFormProps = {}) {
  const router = useRouter();
  const { t } = useTranslation();
  const supabase = createClient();

  const [title, setTitle] = useState(initialNewsletter?.title || '');
  const [subject, setSubject] = useState(initialNewsletter?.subject || '');
  const [htmlContent, setHtmlContent] = useState(initialNewsletter?.html_content || '');
  const [timezone, setTimezone] = useState(initialNewsletter?.timezone || 'Europe/Rome');
  const [isScheduled, setIsScheduled] = useState(initialNewsletter ? !!initialNewsletter.scheduled_at : true);
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (initialNewsletter?.scheduled_at) {
      return new Date(initialNewsletter.scheduled_at).toISOString().slice(0, 16);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [sendInterval, setSendInterval] = useState(initialNewsletter?.send_interval_seconds || 60);

  // Editor mode switcher: Visual Editor ('visual') | Raw HTML Code ('code') | Live Preview ('preview')
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('visual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image Upload & Management States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [convertingBase64, setConvertingBase64] = useState(false);
  const [conversionMessage, setConversionMessage] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visualEditorRef = useRef<VisualEmailEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scoped folder identifier for uploaded images
  const draftIdRef = useRef<string>(initialNewsletter?.id || 'draft');
  const targetedSlotRef = useRef<string | null>(null);

  // Template images slots detected from HTML (relative src tags)
  const templateSlots = getTemplateImageSlots(htmlContent);

  // Load existing uploaded images from Supabase Storage for this draft/newsletter on mount
  useEffect(() => {
    let isMounted = true;
    async function loadExistingImages() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const folder = draftIdRef.current;
        const { data: files, error: listError } = await supabase.storage
          .from('newsletter-images')
          .list(`${user.id}/${folder}`);

        if (listError || !files || !isMounted) return;

        const validFiles = files.filter((f) => f.name && !f.name.startsWith('.'));
        if (validFiles.length === 0) return;

        const items: UploadedImageItem[] = validFiles.map((f) => {
          const path = `${user.id}/${folder}/${f.name}`;
          const { data: urlData } = supabase.storage.from('newsletter-images').getPublicUrl(path);
          return {
            name: f.name,
            path,
            url: urlData.publicUrl,
            size: f.metadata?.size,
          };
        });

        if (isMounted) {
          setUploadedImages((prev) => {
            const existingPaths = new Set(prev.map((p) => p.path));
            const fresh = items.filter((it) => !existingPaths.has(it.path));
            return [...fresh, ...prev];
          });
        }
      } catch {
        // Non-blocking
      }
    }
    loadExistingImages();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Base64 and HTML size telemetry
  const base64Matches = htmlContent.match(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/gi) || [];
  const base64Count = base64Matches.length;
  const hasHttpImages = /<img[^>]+src=["']http:\/\/[^"']+["']/i.test(htmlContent);
  const htmlBytes = typeof window !== 'undefined' ? new Blob([htmlContent]).size : htmlContent.length;
  const isHeavyHtml = htmlBytes > 150 * 1024;

  const insertHtmlAtCursor = (textToInsert: string) => {
    if (activeTab === 'visual' && visualEditorRef.current) {
      visualEditorRef.current.insertHtml(textToInsert);
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      setHtmlContent((prev) => prev + textToInsert);
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    const updated = before + textToInsert + after;
    setHtmlContent(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    insertHtmlAtCursor(placeholder);
  };

  const insertImageTag = (publicUrl: string) => {
    const imgTag = `<img\n  src="${publicUrl}"\n  alt=""\n  width="640"\n  style="display:block;width:100%;max-width:640px;height:auto;border:0;"\n>\n`;
    insertHtmlAtCursor(imgTag);
  };

  // Image Placeholders helper
  const handleInsertImagePlaceholder = (type: 'banner' | 'box' | 'link' | 'tag') => {
    if (type === 'banner') {
      const bannerBlock = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:20px 0;">\n  <tr>\n    <td align="center" style="background:#F7F5F0;border:2px dashed #036E13;border-radius:8px;padding:26px 16px;text-align:center;">\n      <p style="margin:0 0 6px 0;font-size:15px;font-weight:bold;color:#036E13;">🖼️ [SEGNAPOSTO BANNER IMMAGINE]</p>\n      <p style="margin:0;font-size:12px;color:#666666;">Carica o allega un’immagine per sostituire questo spazio &bull; &#123;&#123;BANNER_IMMAGINE&#125;&#125;</p>\n    </td>\n  </tr>\n</table>\n`;
      insertHtmlAtCursor(bannerBlock);
    } else if (type === 'box') {
      const boxBlock = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:16px 0;">\n  <tr>\n    <td align="center" style="background:#F7F5F0;border:2px dashed #2563EB;border-radius:8px;padding:22px 16px;text-align:center;">\n      <p style="margin:0 0 6px 0;font-size:14px;font-weight:bold;color:#2563EB;">📦 [SEGNAPOSTO IMMAGINE SCHEDA]</p>\n      <p style="margin:0;font-size:12px;color:#666666;">Allega un’immagine per questa scheda &bull; &#123;&#123;IMMAGINE_SCHEDA&#125;&#125;</p>\n    </td>\n  </tr>\n</table>\n`;
      insertHtmlAtCursor(boxBlock);
    } else if (type === 'link') {
      insertHtmlAtCursor('{{LINK_IMMAGINE}}');
    } else {
      insertHtmlAtCursor('{{IMMAGINE_1}}');
    }
  };

  // Detect which image placeholders are currently present in the text
  const detectedPlaceholders: string[] = [];
  if (htmlContent.includes('{{BANNER_IMMAGINE}}') || htmlContent.includes('URL_IMMAGINE_QUI')) {
    detectedPlaceholders.push('{{BANNER_IMMAGINE}}');
  }
  if (htmlContent.includes('{{IMMAGINE_SCHEDA}}') || htmlContent.includes('URL_IMMAGINE_PRODOTTO')) {
    detectedPlaceholders.push('{{IMMAGINE_SCHEDA}}');
  }
  if (htmlContent.includes('{{LINK_IMMAGINE}}') || htmlContent.includes('{{URL_IMMAGINE}}')) {
    detectedPlaceholders.push('{{LINK_IMMAGINE}}');
  }
  for (let i = 1; i <= 5; i++) {
    if (htmlContent.includes(`{{IMMAGINE_${i}}}`)) {
      detectedPlaceholders.push(`{{IMMAGINE_${i}}}`);
    }
  }

  // Attach an uploaded image directly into placeholders or at cursor
  const handleAttachUploadedImage = (url: string) => {
    if (!url) return;

    // 1. Banner placeholder (table or token)
    const bannerTableRegex = /<table[^>]*>[\s\S]*?\{\{BANNER_IMMAGINE\}\}[\s\S]*?<\/table>/i;
    if (bannerTableRegex.test(htmlContent)) {
      const bannerHtml = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:20px 0;">\n  <tr>\n    <td align="center">\n      <img src="${url}" alt="Banner" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:8px;margin:0 auto;" />\n    </td>\n  </tr>\n</table>`;
      setHtmlContent((prev) => prev.replace(bannerTableRegex, bannerHtml));
      setUploadSuccessMessage('Segnaposto {{BANNER_IMMAGINE}} sostituito con l’immagine!');
      setTimeout(() => setUploadSuccessMessage(null), 3500);
      return;
    }
    if (htmlContent.includes('{{BANNER_IMMAGINE}}')) {
      const imgTag = `<img src="${url}" alt="Banner" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:8px;margin:0 auto;" />`;
      setHtmlContent((prev) => prev.replace('{{BANNER_IMMAGINE}}', imgTag));
      setUploadSuccessMessage('Segnaposto {{BANNER_IMMAGINE}} sostituito con l’immagine!');
      setTimeout(() => setUploadSuccessMessage(null), 3500);
      return;
    }

    // 2. Box / Scheda placeholder (table or token)
    const boxTableRegex = /<table[^>]*>[\s\S]*?\{\{IMMAGINE_SCHEDA\}\}[\s\S]*?<\/table>/i;
    if (boxTableRegex.test(htmlContent)) {
      const boxHtml = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:16px 0;">\n  <tr>\n    <td align="center">\n      <img src="${url}" alt="Immagine Scheda" width="480" style="display:block;width:100%;max-width:480px;height:auto;border:0;border-radius:6px;margin:0 auto;" />\n    </td>\n  </tr>\n</table>`;
      setHtmlContent((prev) => prev.replace(boxTableRegex, boxHtml));
      setUploadSuccessMessage('Segnaposto {{IMMAGINE_SCHEDA}} sostituito con l’immagine!');
      setTimeout(() => setUploadSuccessMessage(null), 3500);
      return;
    }
    if (htmlContent.includes('{{IMMAGINE_SCHEDA}}')) {
      const imgTag = `<img src="${url}" alt="Immagine" width="480" style="display:block;width:100%;max-width:480px;height:auto;border:0;border-radius:6px;margin:0 auto;" />`;
      setHtmlContent((prev) => prev.replace('{{IMMAGINE_SCHEDA}}', imgTag));
      setUploadSuccessMessage('Segnaposto {{IMMAGINE_SCHEDA}} sostituito con l’immagine!');
      setTimeout(() => setUploadSuccessMessage(null), 3500);
      return;
    }

    // 3. Link placeholder (raw URL replacement)
    if (htmlContent.includes('{{LINK_IMMAGINE}}')) {
      setHtmlContent((prev) => prev.replace('{{LINK_IMMAGINE}}', url));
      setUploadSuccessMessage('Segnaposto {{LINK_IMMAGINE}} sostituito con l’URL pubblico!');
      setTimeout(() => setUploadSuccessMessage(null), 3500);
      return;
    }
    if (htmlContent.includes('{{URL_IMMAGINE}}')) {
      setHtmlContent((prev) => prev.replace('{{URL_IMMAGINE}}', url));
      setUploadSuccessMessage('Segnaposto {{URL_IMMAGINE}} sostituito con l’URL pubblico!');
      setTimeout(() => setUploadSuccessMessage(null), 3500);
      return;
    }

    // 4. Indexed placeholders {{IMMAGINE_1}}, etc.
    for (let i = 1; i <= 5; i++) {
      const tag = `{{IMMAGINE_${i}}}`;
      if (htmlContent.includes(tag)) {
        const imgTag = `<img src="${url}" alt="Immagine ${i}" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;margin:12px auto;" />`;
        setHtmlContent((prev) => prev.replace(tag, imgTag));
        setUploadSuccessMessage(`Segnaposto ${tag} sostituito con l’immagine!`);
        setTimeout(() => setUploadSuccessMessage(null), 3500);
        return;
      }
    }

    // 5. Legacy placeholders
    if (htmlContent.includes('URL_IMMAGINE_QUI')) {
      setHtmlContent((prev) => prev.replace('URL_IMMAGINE_QUI', url));
      setUploadSuccessMessage('Segnaposto URL_IMMAGINE_QUI sostituito con l’immagine!');
      setTimeout(() => setUploadSuccessMessage(null), 3500);
      return;
    }
    if (htmlContent.includes('URL_IMMAGINE_PRODOTTO')) {
      setHtmlContent((prev) => prev.replace('URL_IMMAGINE_PRODOTTO', url));
      setUploadSuccessMessage('Segnaposto URL_IMMAGINE_PRODOTTO sostituito con l’immagine!');
      setTimeout(() => setUploadSuccessMessage(null), 3500);
      return;
    }

    // Default: insert tag at cursor
    insertImageTag(url);
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2500);
    } catch {
      // Fallback
    }
  };

  // Validate format and size
  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    const lowerName = file.name.toLowerCase();

    // Explicit rejection of SVG, HTML or other unauthorized extensions
    if (
      file.type === 'image/svg+xml' ||
      file.type === 'text/html' ||
      lowerName.endsWith('.svg') ||
      lowerName.endsWith('.html') ||
      lowerName.endsWith('.htm')
    ) {
      return {
        valid: false,
        error: t.newsletters.form.uploadErrorInvalidType,
      };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: t.newsletters.form.uploadErrorInvalidType,
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `${t.newsletters.form.uploadErrorTooLarge} (${(file.size / (1024 * 1024)).toFixed(2)} MB / max 3 MB)`,
      };
    }

    return { valid: true };
  };

  // Handle multi-image or single-image file upload with automatic template matching
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset input so re-selecting same files triggers change
    e.target.value = '';

    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    // Validate all files
    for (const f of files) {
      const validation = validateImageFile(f);
      if (!validation.valid) {
        setUploadErrorMessage(`${f.name}: ${validation.error || t.newsletters.form.uploadErrorInvalidType}`);
        return;
      }
    }

    setUploadingImage(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(t.newsletters.form.uploadErrorUnauthenticated);
      }

      let currentHtml = htmlContent;
      const newUploadedItems: UploadedImageItem[] = [];
      let replacedCount = 0;

      for (const file of files) {
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const folder = draftIdRef.current;
        const filePath = `${user.id}/${folder}/${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from('newsletter-images')
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage.from('newsletter-images').getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        newUploadedItems.push({
          name: file.name,
          path: filePath,
          url: publicUrl,
          size: file.size,
        });

        // 1. If a specific slot was targeted by user click
        if (targetedSlotRef.current) {
          currentHtml = currentHtml.split(targetedSlotRef.current).join(publicUrl);
          targetedSlotRef.current = null;
          replacedCount++;
          continue;
        }

        // 2. Auto-match with template image slots in the HTML
        const currentSlots = getTemplateImageSlots(currentHtml);
        const matchedSlot = currentSlots.find((s) => {
          const sName = s.cleanFilename.toLowerCase();
          const fName = file.name.toLowerCase();
          const sBase = sName.replace(/\.[^.]+$/, '');
          const fBase = fName.replace(/\.[^.]+$/, '');
          return (
            sName === fName ||
            sBase === fBase ||
            sName.includes(fBase) ||
            fName.includes(sBase)
          );
        });

        if (matchedSlot) {
          currentHtml = currentHtml.split(matchedSlot.originalSrc).join(publicUrl);
          replacedCount++;
        } else if (currentSlots.length > 0 && files.length === 1) {
          // If 1 slot remains or 1 file uploaded, connect to the first available slot
          currentHtml = currentHtml.split(currentSlots[0].originalSrc).join(publicUrl);
          replacedCount++;
        } else {
          // Check placeholder tokens or insert at cursor
          if (currentHtml.includes('{{BANNER_IMMAGINE}}')) {
            const imgTag = `<img src="${publicUrl}" alt="Banner" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:8px;margin:0 auto;" />`;
            currentHtml = currentHtml.replace('{{BANNER_IMMAGINE}}', imgTag);
            replacedCount++;
          } else if (currentHtml.includes('{{IMMAGINE_SCHEDA}}')) {
            const imgTag = `<img src="${publicUrl}" alt="Immagine" width="480" style="display:block;width:100%;max-width:480px;height:auto;border:0;border-radius:6px;margin:0 auto;" />`;
            currentHtml = currentHtml.replace('{{IMMAGINE_SCHEDA}}', imgTag);
            replacedCount++;
          } else if (currentHtml.includes('{{LINK_IMMAGINE}}')) {
            currentHtml = currentHtml.replace('{{LINK_IMMAGINE}}', publicUrl);
            replacedCount++;
          } else if (files.length === 1) {
            insertImageTag(publicUrl);
          }
        }
      }

      setHtmlContent(currentHtml);
      setUploadedImages((prev) => {
        const existingPaths = new Set(prev.map((p) => p.path));
        const filtered = newUploadedItems.filter((item) => !existingPaths.has(item.path));
        return [...filtered, ...prev];
      });

      if (replacedCount > 0) {
        setUploadSuccessMessage(
          `Caricate e collegate ${replacedCount} immagini nel template HTML preservando dimensioni originali (640px) e stili!`
        );
      } else {
        setUploadSuccessMessage(t.newsletters.form.uploadSuccess);
      }
      setTimeout(() => setUploadSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadErrorMessage(msg || 'Errore durante il caricamento dell’immagine');
    } finally {
      setUploadingImage(false);
      targetedSlotRef.current = null;
    }
  };

  // Auto-connect template slots with matching uploaded images
  const handleAutoConnectTemplateImages = () => {
    let updated = htmlContent;
    let connected = 0;
    const slots = getTemplateImageSlots(updated);

    for (const slot of slots) {
      const match = uploadedImages.find((img) => {
        const imgBase = img.name.toLowerCase().replace(/\.[^.]+$/, '');
        const slotBase = slot.cleanFilename.toLowerCase().replace(/\.[^.]+$/, '');
        return (
          img.name.toLowerCase() === slot.cleanFilename.toLowerCase() ||
          imgBase === slotBase ||
          imgBase.includes(slotBase) ||
          slotBase.includes(imgBase)
        );
      });

      if (match) {
        updated = updated.split(slot.originalSrc).join(match.url);
        connected++;
      }
    }

    if (connected > 0) {
      setHtmlContent(updated);
      setUploadSuccessMessage(`Collegate automaticamente ${connected} immagini su ${slots.length} al template HTML!`);
      setTimeout(() => setUploadSuccessMessage(null), 4000);
    } else {
      setUploadErrorMessage('Nessuna corrispondenza trovata tra le immagini caricate e i tag nel template.');
      setTimeout(() => setUploadErrorMessage(null), 4000);
    }
  };

  // Automatic Base64 Conversion Function
  const handleConvertAllBase64 = async () => {
    setConvertingBase64(true);
    setConversionMessage(null);
    setUploadErrorMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(t.newsletters.form.uploadErrorUnauthenticated);
      }

      // Regex matching data:image URIs
      const dataUriRegex = /data:image\/([a-zA-Z+]+);base64,([A-Za-z0-9+/=]+)/gi;
      let match: RegExpExecArray | null;
      const matches: Array<{ fullMatch: string; mimeType: string; base64Data: string }> = [];

      while ((match = dataUriRegex.exec(htmlContent)) !== null) {
        matches.push({
          fullMatch: match[0],
          mimeType: `image/${match[1].toLowerCase()}`,
          base64Data: match[2],
        });
      }

      if (matches.length === 0) {
        setConversionMessage('Nessuna immagine Base64 trovata da convertire.');
        setConvertingBase64(false);
        return;
      }

      let updatedHtml = htmlContent;
      let convertedCount = 0;
      const newUploadedList: UploadedImageItem[] = [];

      for (let i = 0; i < matches.length; i++) {
        const item = matches[i];
        let mime = item.mimeType;
        if (mime === 'image/jpg') mime = 'image/jpeg';

        // Check format
        if (!ALLOWED_MIME_TYPES.includes(mime)) {
          console.warn(`Formato Base64 non supportato: ${mime}`);
          continue;
        }

        // Convert base64 to binary blob
        const binaryString = atob(item.base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
          console.warn(`Immagine Base64 supera 3 MB, saltata.`);
          continue;
        }

        const extMap: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
        };
        const ext = extMap[mime] || 'jpg';
        const fileId = crypto.randomUUID();
        const folder = draftIdRef.current;
        const filePath = `${user.id}/${folder}/${fileId}.${ext}`;
        const blob = new Blob([bytes], { type: mime });

        const { error: uploadError } = await supabase.storage
          .from('newsletter-images')
          .upload(filePath, blob, {
            contentType: mime,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error(`Errore caricamento immagine Base64 #${i + 1}:`, uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage.from('newsletter-images').getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        // Replace only the base64 src, preserving alt, dimensions, style, and classes!
        updatedHtml = updatedHtml.replaceAll(item.fullMatch, publicUrl);

        newUploadedList.push({
          name: `base64-converted-${i + 1}.${ext}`,
          path: filePath,
          url: publicUrl,
          size: bytes.byteLength,
        });

        convertedCount++;
      }

      setHtmlContent(updatedHtml);
      setUploadedImages((prev) => [...newUploadedList, ...prev]);
      setConversionMessage(
        t.newsletters.form.convertedBase64Success.replace('{count}', String(convertedCount))
      );
      setTimeout(() => setConversionMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadErrorMessage(msg || 'Errore durante la conversione delle immagini Base64');
    } finally {
      setConvertingBase64(false);
    }
  };

  // Delete image from Supabase Storage and remove from list
  const handleDeleteImage = async (item: UploadedImageItem) => {
    if (!confirm(t.newsletters.form.deleteImageConfirm)) return;

    setDeletingPath(item.path);
    try {
      const { error: delError } = await supabase.storage.from('newsletter-images').remove([item.path]);
      if (delError) throw delError;

      setUploadedImages((prev) => prev.filter((img) => img.path !== item.path));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Errore eliminazione immagine: ${msg}`);
    } finally {
      setDeletingPath(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Mandatory validation: Block saving if Base64 images remain
    if (/data:image\/[a-zA-Z+]+;base64,/i.test(htmlContent)) {
      setError(t.newsletters.form.blockedBase64Error);
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setError(t.newsletters.form.errorTitle);
      setLoading(false);
      return;
    }

    if (!subject.trim()) {
      setError(t.newsletters.form.errorSubject);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        html_content: htmlContent,
        timezone,
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        send_interval_seconds: sendInterval,
      };

      const url = initialNewsletter ? `/api/newsletters/${initialNewsletter.id}` : '/api/newsletters';
      const method = initialNewsletter ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.newsletters.form.errorGeneric);
      }

      const saved = await res.json();
      router.push(`/newsletters/${saved.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t.newsletters.form.errorGeneric);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleImageFileSelect}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-[#D8D2C8] bg-white text-[#666666] hover:text-[#1A1A1E] transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">
              {initialNewsletter ? initialNewsletter.title : t.newsletters.form.headerTitle}
            </h1>
            <p className="text-xs text-[#666666]">{t.newsletters.form.headerSubtitle}</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || uploadingImage || convertingBase64}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#1A1A1E] text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>{t.newsletters.form.saveAndContinue}</span>
        </button>
      </div>

      {/* Blocking Form Error */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Main Form Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic Info & Scheduling */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#D8D2C8] rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#1A1A1E] uppercase tracking-wider flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              <span>{t.newsletters.form.basicDetails}</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E]">
                {t.newsletters.form.internalTitle} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t.newsletters.form.internalTitlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              />
              <p className="text-[11px] text-[#666666] mt-1">{t.newsletters.form.internalTitleHelp}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E]">
                {t.newsletters.form.emailSubject} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t.newsletters.form.emailSubjectPlaceholder}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              />
              <p className="text-[11px] text-[#666666] mt-1">{t.newsletters.form.emailSubjectHelp}</p>
            </div>
          </div>

          <div className="bg-white border border-[#D8D2C8] rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#1A1A1E] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{t.newsletters.form.scheduling}</span>
            </h2>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isScheduled"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="rounded border-[#D8D2C8] text-[#1A1A1E] focus:ring-0"
              />
              <label htmlFor="isScheduled" className="text-xs font-semibold text-[#1A1A1E] cursor-pointer">
                {t.newsletters.form.scheduleCheckbox}
              </label>
            </div>

            {isScheduled && (
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">{t.newsletters.form.startDateTime}</label>
                <input
                  type="datetime-local"
                  required={isScheduled}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E]">{t.newsletters.form.timezone}</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E]">
                {t.newsletters.form.sendInterval}
              </label>
              <input
                type="number"
                min="30"
                step="5"
                value={sendInterval}
                onChange={(e) => setSendInterval(Math.max(30, parseInt(e.target.value) || 60))}
                className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              />
              <p className="text-[11px] text-[#666666] mt-1">{t.newsletters.form.sendIntervalHelp}</p>
            </div>
          </div>
        </div>

        {/* Right Column: HTML Content, Images & Live Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Base64 Images Detection Banner */}
          {base64Count > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-sm">
                    {t.newsletters.form.base64DetectedNotice.replace('{count}', String(base64Count))}
                  </span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Le immagini incorporate in Base64 appesantiscono l&apos;email e vengono spesso bloccate dai filtri antispam. Convertile in URL HTTPS Supabase Storage prima di salvare.
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
                <span>{convertingBase64 ? t.newsletters.form.convertingBase64 : t.newsletters.form.convertBase64Btn}</span>
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
              <span>{t.newsletters.form.insecureHttpWarning}</span>
            </div>
          )}

          {isHeavyHtml && (
            <div className="p-3 bg-stone-100 border border-stone-300 text-stone-700 text-xs rounded-xl flex items-center space-x-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-stone-500 shrink-0" />
              <span>{t.newsletters.form.heavyHtmlWarning.replace('{size}', String(Math.round(htmlBytes / 1024)))}</span>
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
                      Rilevate {templateSlots.length} immagini nel template HTML in attesa di caricamento
                    </span>
                    <p className="text-[11px] text-indigo-800 mt-0.5">
                      I tag immagine contengono nomi di file locali. Carica le immagini dal tuo PC per collegarle automaticamente mantenendo la larghezza originale (640px) e tutti gli stili della mail.
                    </p>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-2 shrink-0">
                  {uploadedImages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoConnectTemplateImages}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                      title="Collega automaticamente tutte le immagini del template che sono già state caricate"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Collega con immagini caricate</span>
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
                    title="Seleziona tutte le 4 immagini contemporaneamente dalla cartella Downloads"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Carica tutte insieme (Selezione Multipla)</span>
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
                        {slot.alt ? `Alt: "${slot.alt}"` : 'Nessun alt'} • {slot.width ? `${slot.width}px` : '100%'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {uploadedImages.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              setHtmlContent((prev) => prev.split(slot.originalSrc).join(e.target.value));
                              setUploadSuccessMessage(`Tag ${slot.cleanFilename} collegato con successo!`);
                              setTimeout(() => setUploadSuccessMessage(null), 3000);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                          className="px-2 py-1 text-[11px] bg-white border border-stone-300 rounded text-[#1A1A1E]"
                        >
                          <option value="" disabled>
                            Collega con...
                          </option>
                          {uploadedImages.map((img) => (
                            <option key={img.url} value={img.url}>
                              {img.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          targetedSlotRef.current = slot.originalSrc;
                          fileInputRef.current?.click();
                        }}
                        disabled={uploadingImage}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] flex items-center space-x-1 transition-colors"
                        title={`Carica file dal computer per ${slot.cleanFilename}`}
                      >
                        <UploadCloud className="w-3 h-3" />
                        <span>Carica</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HTML Editor & Live Preview Card */}
          <div className="bg-white border border-[#D8D2C8] rounded-xl shadow-sm overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="px-5 py-3 border-b border-[#D8D2C8] flex flex-wrap items-center justify-between gap-3 bg-[#F7F5F0]/60">
              {/* Mode Switcher: Visual Editor / Raw HTML / Live Preview */}
              <div className="flex items-center bg-[#EBE7DF] p-1 rounded-lg border border-[#D8D2C8]">
                <button
                  type="button"
                  onClick={() => setActiveTab('visual')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    activeTab === 'visual'
                      ? 'bg-white text-[#1A1A1E] shadow-xs'
                      : 'text-[#666666] hover:text-[#1A1A1E]'
                  }`}
                  title="Componi la newsletter con l'editor formattato"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t.newsletters.form.editorVisualTab}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    activeTab === 'code'
                      ? 'bg-white text-[#1A1A1E] shadow-xs'
                      : 'text-[#666666] hover:text-[#1A1A1E]'
                  }`}
                  title="Modifica il codice HTML sorgente"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{t.newsletters.form.editorHtmlTab}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    activeTab === 'preview'
                      ? 'bg-white text-[#1A1A1E] shadow-xs'
                      : 'text-[#666666] hover:text-[#1A1A1E]'
                  }`}
                  title="Visualizza l'anteprima fotorealistica email"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t.newsletters.form.previewLiveTab}</span>
                </button>
              </div>

              {/* Action buttons: CARICA IMMAGINE */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || convertingBase64}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1E] text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
                  title="Carica un'immagine JPEG, PNG, WebP o GIF (max 3 MB)"
                >
                  {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  <span>{uploadingImage ? t.newsletters.form.uploadingImage : t.newsletters.form.uploadImageBtn}</span>
                </button>
              </div>
            </div>

            {/* Sub-Toolbar: Segnaposti, Tag e Allega Immagine */}
            {activeTab !== 'preview' && (
              <div className="px-5 py-2 border-b border-[#EFECE6] bg-[#FCFBF9] flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Image Placeholders & Tags */}
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-[#666666] text-[11px] font-semibold uppercase tracking-wider mr-1">
                    Segnaposti:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleInsertImagePlaceholder('banner')}
                    className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 text-[#1A1A1E] text-[11px] font-medium flex items-center space-x-1 transition-colors"
                    title="Inserisce un blocco immagine banner email responsive (640px) con tag {{BANNER_IMMAGINE}}"
                  >
                    <ImageIcon className="w-3 h-3 text-[#036E13]" />
                    <span>🖼️ Segnaposto Banner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertImagePlaceholder('box')}
                    className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 text-[#1A1A1E] text-[11px] font-medium flex items-center space-x-1 transition-colors"
                    title="Inserisce un riquadro per immagine prodotto o articolo con tag {{IMMAGINE_SCHEDA}}"
                  >
                    <span>📦 Segnaposto Scheda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertImagePlaceholder('link')}
                    className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[#1A1A1E] font-mono text-[11px] hover:bg-stone-200"
                    title="Inserisce il tag segnaposto link per l'URL pubblico dell'immagine"
                  >
                    &#123;&#123;LINK_IMMAGINE&#125;&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertImagePlaceholder('tag')}
                    className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[#1A1A1E] font-mono text-[11px] hover:bg-stone-200"
                    title="Inserisce il tag segnaposto immagine numerato"
                  >
                    &#123;&#123;IMMAGINE_1&#125;&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertPlaceholder('{{email}}')}
                    className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[#1A1A1E] font-mono text-[11px] hover:bg-stone-200"
                  >
                    &#123;&#123;email&#125;&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertPlaceholder('{{nome}}')}
                    className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[#1A1A1E] font-mono text-[11px] hover:bg-stone-200"
                  >
                    &#123;&#123;nome&#125;&#125;
                  </button>
                  {detectedPlaceholders.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-300 ml-1">
                      🎯 {detectedPlaceholders.length} segnaposto attivo ({detectedPlaceholders[0]})
                    </span>
                  )}
                </div>

                {/* Quick Attach from Uploaded Images Dropdown */}
                {uploadedImages.length > 0 && (
                  <div className="flex items-center space-x-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#666666]" />
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAttachUploadedImage(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      className="px-2 py-1 text-[11px] bg-white border border-[#D8D2C8] rounded-md text-[#1A1A1E] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                    >
                      <option value="" disabled>
                        Allega immagine caricata... ({uploadedImages.length})
                      </option>
                      {uploadedImages.map((img) => (
                        <option key={img.path} value={img.url}>
                          {img.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Content Area */}
            <div className="p-5 flex-1 flex flex-col min-h-[420px]">
              {activeTab === 'visual' ? (
                <div className="flex-1 flex flex-col space-y-2">
                  <VisualEmailEditor
                    ref={visualEditorRef}
                    value={htmlContent}
                    onChange={(newHtml) => setHtmlContent(newHtml)}
                    onUploadImageClick={() => fileInputRef.current?.click()}
                    uploadedImages={uploadedImages.map((img) => ({ name: img.name, url: img.url }))}
                    placeholder="Scrivi qui la tua newsletter. Puoi formattare il testo, aggiungere titoli H1/H2, elenchi, link e caricare immagini direttamente..."
                  />
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-[#666666] pt-1 gap-2">
                    <p>
                      Composizione visiva semplice con formattazione diretta. Passa a &quot;Codice HTML&quot; per modifiche avanzate al template.
                    </p>
                    <p className="font-mono">
                      {htmlContent.length} caratteri ({Math.round(htmlBytes / 1024)} KB)
                    </p>
                  </div>
                </div>
              ) : activeTab === 'code' ? (
                <div className="flex-1 flex flex-col">
                  <textarea
                    ref={textareaRef}
                    rows={18}
                    placeholder={t.newsletters.form.editorPlaceholder}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="w-full flex-1 p-3 border border-[#D8D2C8] rounded-lg font-mono text-xs bg-stone-50/50 text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] resize-y leading-relaxed"
                  />
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-[#666666] mt-2 gap-2">
                    <p>{t.newsletters.form.editorHelp}</p>
                    <p className="font-mono">
                      {htmlContent.length} caratteri ({Math.round(htmlBytes / 1024)} KB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 border border-[#D8D2C8] rounded-lg overflow-hidden bg-white p-2">
                  <EmailPreview
                    htmlTemplate={htmlContent}
                    sampleData={{
                      email: 'mario.rossi@example.com',
                      company_name: 'Mario Rossi',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section: Immagini caricate */}
          {uploadedImages.length > 0 && (
            <div className="bg-white border border-[#D8D2C8] rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-2">
                <h3 className="text-xs font-bold text-[#1A1A1E] uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{t.newsletters.form.uploadedImagesSection}</span>
                  <span className="text-[11px] font-normal text-[#666666]">({uploadedImages.length})</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {uploadedImages.map((img) => (
                  <div
                    key={img.path}
                    className="border border-[#E5E0D8] rounded-lg p-2.5 bg-stone-50/50 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-12 h-12 rounded border border-[#D8D2C8] bg-white overflow-hidden shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#1A1A1E] truncate" title={img.name}>
                          {img.name}
                        </p>
                        <p className="text-[10px] text-[#666666] truncate font-mono mt-0.5" title={img.url}>
                          {img.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#E5E0D8] text-xs">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleAttachUploadedImage(img.url)}
                          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center space-x-1 shadow-2xs transition-colors ${
                            detectedPlaceholders.length > 0
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-white border border-[#D8D2C8] text-[#1A1A1E] hover:bg-stone-100'
                          }`}
                          title={
                            detectedPlaceholders.length > 0
                              ? `Allega subito al segnaposto ${detectedPlaceholders[0]}`
                              : 'Inserisci o allega immagine al segnaposto'
                          }
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>
                            {detectedPlaceholders.length > 0
                              ? `Allega a ${detectedPlaceholders[0]}`
                              : t.newsletters.form.insertIntoHtmlBtn}
                          </span>
                        </button>
                        {detectedPlaceholders.length > 0 && (
                          <button
                            type="button"
                            onClick={() => insertImageTag(img.url)}
                            className="px-2 py-1 bg-white border border-[#D8D2C8] rounded text-[11px] font-medium text-[#1A1A1E] hover:bg-stone-100 flex items-center space-x-1 shadow-2xs"
                            title="Inserisci tag <img> al cursore invece di sostituire il segnaposto"
                          >
                            <span>Al Cursore</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(img.url)}
                          className="px-2 py-1 bg-white border border-[#D8D2C8] rounded text-[11px] font-medium text-[#1A1A1E] hover:bg-stone-100 flex items-center space-x-1 shadow-2xs"
                          title="Copia URL negli appunti"
                        >
                          {copiedUrl === img.url ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedUrl === img.url ? t.newsletters.form.copiedSuccess : t.newsletters.form.copyUrlBtn}</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img)}
                        disabled={deletingPath === img.path}
                        className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                        title="Elimina immagine da Supabase Storage"
                      >
                        {deletingPath === img.path ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
