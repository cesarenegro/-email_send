'use client';

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { sanitizeEmailHtml, escapeHtml, sanitizeUrl } from '@/lib/security/sanitize-html';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Tag,
  Eraser,
  ImageIcon,
  UploadCloud,
  ChevronDown,
  Paperclip,
} from 'lucide-react';

export interface VisualEmailEditorHandle {
  insertHtml: (htmlSnippet: string) => void;
  focus: () => void;
}

interface VisualEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onUploadImageClick?: () => void;
  uploadedImages?: Array<{ name: string; url: string }>;
}

const BANNER_PLACEHOLDER_HTML = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:20px 0;">
  <tr>
    <td align="center" style="background:#F7F5F0;border:2px dashed #036E13;border-radius:8px;padding:26px 16px;text-align:center;">
      <p style="margin:0 0 6px 0;font-size:15px;font-weight:bold;color:#036E13;">🖼️ [SEGNAPOSTO BANNER IMMAGINE]</p>
      <p style="margin:0;font-size:12px;color:#666666;">Carica o allega un’immagine per sostituire questo spazio &bull; {{BANNER_IMMAGINE}}</p>
    </td>
  </tr>
</table>`;

const BOX_PLACEHOLDER_HTML = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:16px 0;">
  <tr>
    <td align="center" style="background:#F7F5F0;border:2px dashed #2563EB;border-radius:8px;padding:22px 16px;text-align:center;">
      <p style="margin:0 0 6px 0;font-size:14px;font-weight:bold;color:#2563EB;">📦 [SEGNAPOSTO IMMAGINE SCHEDA]</p>
      <p style="margin:0;font-size:12px;color:#666666;">Allega un’immagine per questa scheda &bull; {{IMMAGINE_SCHEDA}}</p>
    </td>
  </tr>
</table>`;

const VisualEmailEditor = forwardRef<VisualEmailEditorHandle, VisualEmailEditorProps>(
  function VisualEmailEditor(
    {
      value,
      onChange,
      placeholder = 'Scrivi qui il corpo della tua email...',
      disabled = false,
      onUploadImageClick,
      uploadedImages = [],
    },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const isInternalChangeRef = useRef<boolean>(false);
    const [imageMenuOpen, setImageMenuOpen] = useState(false);
    const imageMenuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (imageMenuRef.current && !imageMenuRef.current.contains(e.target as Node)) {
          setImageMenuOpen(false);
        }
      };
      if (imageMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [imageMenuOpen]);

    useImperativeHandle(ref, () => ({
      insertHtml(htmlSnippet: string) {
        if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand('insertHTML', false, htmlSnippet);
          handleInput();
        }
      },
      focus() {
        editorRef.current?.focus();
      },
    }));

  // Sync incoming value to DOM only if it changed externally, applying sanitization
  useEffect(() => {
    if (editorRef.current) {
      const sanitized = sanitizeEmailHtml(value || '');
      if (!isInternalChangeRef.current && editorRef.current.innerHTML !== sanitized) {
        editorRef.current.innerHTML = sanitized;
      }
      isInternalChangeRef.current = false;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChangeRef.current = true;
      const html = sanitizeEmailHtml(editorRef.current.innerHTML);
      onChange(html);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (disabled) return;
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleInsertLink = () => {
    if (disabled) return;
    const url = window.prompt('Inserisci il link (URL):', 'https://');
    if (url && url !== 'https://') {
      const safe = sanitizeUrl(url);
      if (safe && safe !== '#') {
        executeCommand('createLink', safe);
      }
    }
  };

  const handleInsertPlaceholder = (placeholderTag: string) => {
    if (disabled) return;
    executeCommand('insertText', placeholderTag);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Robust sanitization on paste: escapes HTML characters to prevent XSS injection
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    // Convert double linebreaks into paragraphs with escaped HTML content
    const paragraphs = text
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6;">${escapeHtml(p).replace(/\r?\n/g, '<br/>')}</p>`)
      .join('');

    executeCommand('insertHTML', paragraphs || escapeHtml(text));
  };

  return (
    <div className="border border-[#D8D2C8] rounded-xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-[#036E13]/30 transition-all">
      {/* Toolbar */}
      <div className="bg-[#F5F3F0] border-b border-[#E5E5E0] px-3 py-2 flex flex-wrap items-center gap-1.5 select-none">
        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('formatBlock', '<h2>')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Titolo Principale"
        >
          <Heading1 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('formatBlock', '<h3>')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Sottotitolo"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('formatBlock', '<p>')}
          className="px-2 py-1 text-xs font-semibold rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Testo Normale"
        >
          Testo
        </button>

        <div className="w-[1px] h-4 bg-[#D8D2C8] mx-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('bold')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Grassetto (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('italic')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Corsivo (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('underline')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Sottolineato (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[#D8D2C8] mx-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Elenco Puntato"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('insertOrderedList')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Elenco Numerato"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={handleInsertLink}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Inserisci Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[#D8D2C8] mx-1" />

        {/* Placeholders chips */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#5C5E63] font-medium hidden sm:inline">Personalizza:</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleInsertPlaceholder('{{azienda}}')}
            className="px-2 py-0.5 text-[11px] font-semibold bg-[#E4E2DF] hover:bg-[#D8D2C8] text-[#1B1C1A] rounded-full border border-[#D8D2C8] flex items-center gap-1 transition-colors"
            title="Inserisce il nome dell'azienda del destinatario"
          >
            <Tag className="w-3 h-3 text-[#036E13]" />
            <span>Nome Azienda</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleInsertPlaceholder('{{email}}')}
            className="px-2 py-0.5 text-[11px] font-semibold bg-[#E4E2DF] hover:bg-[#D8D2C8] text-[#1B1C1A] rounded-full border border-[#D8D2C8] flex items-center gap-1 transition-colors"
            title="Inserisce l'indirizzo email del destinatario"
          >
            <Tag className="w-3 h-3 text-[#036E13]" />
            <span>Email</span>
          </button>
        </div>

        <div className="w-[1px] h-4 bg-[#D8D2C8] mx-1" />

        {/* Image & Placeholder Menu */}
        <div className="relative" ref={imageMenuRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setImageMenuOpen((prev) => !prev)}
            className="px-2.5 py-1 text-xs font-semibold bg-[#E4E2DF] hover:bg-[#D8D2C8] text-[#1B1C1A] rounded-lg border border-[#D8D2C8] flex items-center gap-1.5 transition-colors disabled:opacity-40"
            title="Gestisci immagini e segnaposti"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#036E13]" />
            <span>Immagine</span>
            <ChevronDown className="w-3 h-3 text-[#5C5E63]" />
          </button>

          {imageMenuOpen && (
            <div className="absolute left-0 mt-1 w-64 bg-white border border-[#D8D2C8] rounded-xl shadow-lg z-50 p-2 space-y-1 text-xs">
              {onUploadImageClick && (
                <button
                  type="button"
                  onClick={() => {
                    setImageMenuOpen(false);
                    onUploadImageClick();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center space-x-2 text-[#1A1A1E] font-medium"
                >
                  <UploadCloud className="w-4 h-4 text-[#036E13]" />
                  <span>Carica immagine dal PC...</span>
                </button>
              )}

              <div className="border-t border-stone-200 my-1" />
              <div className="px-2.5 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                Inserisci Segnaposto:
              </div>

              <button
                type="button"
                onClick={() => {
                  setImageMenuOpen(false);
                  if (editorRef.current) {
                    editorRef.current.focus();
                    document.execCommand('insertHTML', false, BANNER_PLACEHOLDER_HTML);
                    handleInput();
                  }
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center space-x-2 text-[#1A1A1E]"
              >
                <span className="text-base">🖼️</span>
                <div>
                  <div className="font-semibold text-[11px]">Segnaposto Banner (640px)</div>
                  <div className="text-[10px] text-stone-500 font-mono">&#123;&#123;BANNER_IMMAGINE&#125;&#125;</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImageMenuOpen(false);
                  if (editorRef.current) {
                    editorRef.current.focus();
                    document.execCommand('insertHTML', false, BOX_PLACEHOLDER_HTML);
                    handleInput();
                  }
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center space-x-2 text-[#1A1A1E]"
              >
                <span className="text-base">📦</span>
                <div>
                  <div className="font-semibold text-[11px]">Segnaposto Scheda Prodotto</div>
                  <div className="text-[10px] text-stone-500 font-mono">&#123;&#123;IMMAGINE_SCHEDA&#125;&#125;</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImageMenuOpen(false);
                  handleInsertPlaceholder('{{LINK_IMMAGINE}}');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center space-x-2 text-[#1A1A1E]"
              >
                <span className="text-base">🔗</span>
                <div>
                  <div className="font-semibold text-[11px]">Segnaposto Link URL</div>
                  <div className="text-[10px] text-stone-500 font-mono">&#123;&#123;LINK_IMMAGINE&#125;&#125;</div>
                </div>
              </button>

              {uploadedImages.length > 0 && (
                <>
                  <div className="border-t border-stone-200 my-1" />
                  <div className="px-2.5 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center space-x-1">
                    <Paperclip className="w-3 h-3" />
                    <span>Allega Immagine Caricata:</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {uploadedImages.map((img) => (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => {
                          setImageMenuOpen(false);
                          const imgSnippet = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:16px 0;"><tr><td align="center"><img src="${img.url}" alt="" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:6px;margin:0 auto;" /></td></tr></table>`;
                          if (editorRef.current) {
                            editorRef.current.focus();
                            document.execCommand('insertHTML', false, imgSnippet);
                            handleInput();
                          }
                        }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-stone-100 flex items-center space-x-2 text-[#1A1A1E]"
                        title={img.name}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-6 h-6 rounded object-cover border border-stone-300 shrink-0" />
                        <span className="text-[11px] truncate flex-1">{img.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('removeFormat')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#5C5E63] disabled:opacity-40 transition-colors"
          title="Rimuovi Formattazione"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>

      {/* Editable Canvas */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="min-h-[220px] max-h-[420px] overflow-y-auto p-4 text-sm text-[#1B1C1A] font-sans leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#A2A59E] empty:before:pointer-events-none"
      />
    </div>
  );
});

export default VisualEmailEditor;
