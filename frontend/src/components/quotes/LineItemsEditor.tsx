'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { priceLibraryService } from '@/services/api';
import { PriceLibraryItem } from '@/types';

export type ItemType =
  | 'supply' | 'labor' | 'work' | 'subcontracting' | 'equipment' | 'misc' | 'other'
  | 'section' | 'text' | 'page_break';

export interface LineItemData {
  id?: number;
  description: string;
  long_description?: string;
  item_type: ItemType;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent?: number;
  vat_rate: number;
  section?: string;
  reference?: string;
}

const ITEM_TYPES: { value: ItemType; label: string; group?: string }[] = [
  { value: 'supply',         label: 'Fourniture' },
  { value: 'labor',          label: "Main d'\u0153uvre" },
  { value: 'work',           label: 'Ouvrage' },
  { value: 'subcontracting', label: 'Sous-traitance' },
  { value: 'equipment',      label: 'Mat\u00e9riel' },
  { value: 'misc',           label: 'Divers' },
  { value: 'other',          label: 'Autre' },
  { value: 'section',        label: 'Section', group: 'structure' },
  { value: 'text',           label: 'Texte libre', group: 'structure' },
  { value: 'page_break',     label: 'Saut de page', group: 'structure' },
];

const PRICE_TYPES = ITEM_TYPES.filter(t => !t.group);
const STRUCT_TYPES = ITEM_TYPES.filter(t => t.group);

const UNIT_OPTIONS = [
  'u', 'h', 'm', 'm\u00b2', 'm\u00b3', 'ml', 'l', 'g', 'kg', 't',
  'mm', 'cm', 'cm\u00b2', 'cm\u00b3', 'km', 'km\u00b2',
  'min', 'mg', 'lb', 'fft', 'ens', 'jour', 'ha', 'pce', 'mois', 'paire', 'sem', 'forfait',
];
const VAT_OPTIONS = [20, 10, 5.5, 2.1, 0];

const TYPE_STYLE: Record<ItemType, { bg: string; text: string; ring: string; dot: string }> = {
  supply:         { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200',    dot: 'bg-blue-500' },
  labor:          { bg: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200',  dot: 'bg-orange-500' },
  work:           { bg: 'bg-violet-50',  text: 'text-violet-700',  ring: 'ring-violet-200',  dot: 'bg-violet-500' },
  subcontracting: { bg: 'bg-pink-50',   text: 'text-pink-700',    ring: 'ring-pink-200',    dot: 'bg-pink-500' },
  equipment:      { bg: 'bg-cyan-50',   text: 'text-cyan-700',    ring: 'ring-cyan-200',    dot: 'bg-cyan-500' },
  misc:           { bg: 'bg-gray-50',   text: 'text-gray-600',    ring: 'ring-gray-200',    dot: 'bg-gray-400' },
  other:          { bg: 'bg-gray-50',   text: 'text-gray-500',    ring: 'ring-gray-200',    dot: 'bg-gray-400' },
  section:        { bg: 'bg-slate-50',  text: 'text-slate-700',   ring: 'ring-slate-200',   dot: 'bg-slate-500' },
  text:           { bg: 'bg-amber-50',  text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500' },
  page_break:     { bg: 'bg-gray-50',   text: 'text-gray-400',    ring: 'ring-gray-200',    dot: 'bg-gray-300' },
};

function TypeBadge({ type }: { type: ItemType }) {
  const t = ITEM_TYPES.find(x => x.value === type);
  const s = TYPE_STYLE[type] || TYPE_STYLE.other;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {t?.label || type}
    </span>
  );
}

/* Rich Text Editor */
function RichTextArea({
  value, onChange, placeholder, rows = 2, className = '', premium = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  premium?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !focused) {
      if (ref.current.innerHTML !== value) {
        ref.current.innerHTML = value || '';
      }
    }
  }, [value, focused]);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
  };

  const handleInput = () => {
    onChange(ref.current?.innerHTML || '');
  };

  const ToolBtn = ({ children, cmd, arg, title }: {
    children: React.ReactNode; cmd: string; arg?: string; title: string;
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, arg); }}
      className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition-all text-gray-500 hover:bg-gray-100 hover:text-gray-700"
    >
      {children}
    </button>
  );

  const borderClass = premium
    ? focused ? 'ring-2 ring-violet-300 border-violet-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'
    : focused ? 'ring-2 ring-blue-300 border-blue-300' : 'border-gray-200';

  return (
    <div className={`rounded-xl border transition-all duration-200 ${borderClass} ${className}`}>
      <div className={`flex items-center gap-0.5 px-2 py-1.5 border-b ${focused ? 'border-violet-100 bg-violet-50/30' : 'border-gray-100 bg-gray-50/50'} rounded-t-xl transition-colors`}>
        <ToolBtn cmd="bold" title="Gras (Ctrl+B)">
          <span className="font-black text-[11px]">B</span>
        </ToolBtn>
        <ToolBtn cmd="italic" title="Italique (Ctrl+I)">
          <span className="italic font-semibold text-[11px]">I</span>
        </ToolBtn>
        <ToolBtn cmd="underline" title="Soulign\u00e9 (Ctrl+U)">
          <span className="underline font-semibold text-[11px]">U</span>
        </ToolBtn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolBtn cmd="insertUnorderedList" title="Liste \u00e0 puces">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="2" cy="4" r="1.5" /><rect x="5" y="3" width="10" height="2" rx="0.5" />
            <circle cx="2" cy="8" r="1.5" /><rect x="5" y="7" width="10" height="2" rx="0.5" />
            <circle cx="2" cy="12" r="1.5" /><rect x="5" y="11" width="10" height="2" rx="0.5" />
          </svg>
        </ToolBtn>
        <ToolBtn cmd="insertOrderedList" title="Liste num\u00e9rot\u00e9e">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <text x="0" y="5.5" fontSize="5" fontWeight="bold">1.</text><rect x="5" y="3" width="10" height="2" rx="0.5" />
            <text x="0" y="9.5" fontSize="5" fontWeight="bold">2.</text><rect x="5" y="7" width="10" height="2" rx="0.5" />
            <text x="0" y="13.5" fontSize="5" fontWeight="bold">3.</text><rect x="5" y="11" width="10" height="2" rx="0.5" />
          </svg>
        </ToolBtn>
        <div className="flex-1" />
        <button
          type="button"
          title="Effacer la mise en forme"
          onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }}
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight: `${rows * 1.6}rem` }}
        className="px-3 py-2.5 text-sm leading-relaxed outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_b]:font-bold [&_i]:italic empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none selection:bg-violet-100"
      />
    </div>
  );
}

/* Insert Submenu */
function InsertSubmenu({
  position, onInsert,
}: {
  position: 'before' | 'after';
  onInsert: (position: 'before' | 'after', type: ItemType) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button type="button"
        className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center justify-between rounded-md transition-colors">
        <span>Ins\u00e9rer {position === 'before' ? 'au dessus' : 'en dessous'}</span>
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute left-full top-0 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
          {PRICE_TYPES.map(t => {
            const s = TYPE_STYLE[t.value];
            return (
              <li key={t.value}>
                <button type="button" onClick={() => onInsert(position, t.value as ItemType)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                  <span className={`w-2 h-2 rounded-full ${s?.dot || 'bg-gray-300'}`} />
                  {t.label}
                </button>
              </li>
            );
          })}
          <li className="border-t border-gray-100 my-1" />
          {STRUCT_TYPES.map(t => (
            <li key={t.value}>
              <button type="button" onClick={() => onInsert(position, t.value as ItemType)}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/* Action Menu */
function ActionMenu({
  index, total, menuOpen, setMenuOpen, menuRef,
  onMoveUp, onMoveDown, onInsert, onDuplicate, onRemove,
}: {
  index: number; total: number; menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onMoveUp: (i: number) => void; onMoveDown: (i: number) => void;
  onInsert: (i: number, pos: 'before' | 'after', type: ItemType) => void;
  onDuplicate: (i: number) => void; onRemove: (i: number) => void;
}) {
  return (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button type="button" onClick={() => setMenuOpen(!menuOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Actions">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {menuOpen && (
        <ul className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40 text-sm">
          {index > 0 && (
            <li><button type="button" onClick={() => { onMoveUp(index); setMenuOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-md transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              D\u00e9placer vers le haut
            </button></li>
          )}
          {index < total - 1 && (
            <li><button type="button" onClick={() => { onMoveDown(index); setMenuOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-md transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              D\u00e9placer vers le bas
            </button></li>
          )}
          {(index > 0 || index < total - 1) && <li className="border-t border-gray-50 my-1" />}
          <InsertSubmenu position="before" onInsert={(pos, type) => { onInsert(index, pos, type); setMenuOpen(false); }} />
          <InsertSubmenu position="after" onInsert={(pos, type) => { onInsert(index, pos, type); setMenuOpen(false); }} />
          <li className="border-t border-gray-50 my-1" />
          <li><button type="button" onClick={() => { onDuplicate(index); setMenuOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-md transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Dupliquer
          </button></li>
          <li className="border-t border-gray-50 my-1" />
          <li><button type="button" onClick={() => { onRemove(index); setMenuOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-md transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Supprimer
          </button></li>
        </ul>
      )}
    </div>
  );
}

/* Line Item Row */
interface LineItemRowProps {
  item: LineItemData; index: number; total: number;
  onUpdate: (index: number, updates: Partial<LineItemData>) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onInsert: (index: number, position: 'before' | 'after', type: ItemType) => void;
  onDuplicate: (index: number) => void;
}

export function LineItemRow({
  item, index, total, onUpdate, onRemove, onMoveUp, onMoveDown, onInsert, onDuplicate,
}: LineItemRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const qty = item.quantity ?? 1;
  const pu = item.unit_price ?? 0;
  const disc = item.discount_percent ?? 0;
  const lineTotal = qty * pu * (1 - disc / 100);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const s = TYPE_STYLE[item.item_type] || TYPE_STYLE.other;

  /* Section row */
  if (item.item_type === 'section') {
    return (
      <div className="group relative">
        <div className={`flex items-center gap-3 py-2.5 px-4 ${s.bg} border border-slate-200 rounded-xl shadow-sm`}>
          <div className="flex flex-col gap-0.5 cursor-grab opacity-30 group-hover:opacity-70 transition-opacity">
            <div className="flex gap-0.5"><div className="w-1 h-1 bg-slate-400 rounded-full" /><div className="w-1 h-1 bg-slate-400 rounded-full" /></div>
            <div className="flex gap-0.5"><div className="w-1 h-1 bg-slate-400 rounded-full" /><div className="w-1 h-1 bg-slate-400 rounded-full" /></div>
            <div className="flex gap-0.5"><div className="w-1 h-1 bg-slate-400 rounded-full" /><div className="w-1 h-1 bg-slate-400 rounded-full" /></div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-200/60 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </div>
          <input type="text" value={item.description}
            onChange={e => onUpdate(index, { description: e.target.value })}
            placeholder="Titre de la section..."
            className="flex-1 text-base font-bold text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-300 placeholder:font-normal" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-2">Section</span>
          <ActionMenu index={index} total={total} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
            onMoveUp={onMoveUp} onMoveDown={onMoveDown} onInsert={onInsert} onDuplicate={onDuplicate} onRemove={onRemove} />
        </div>
      </div>
    );
  }

  /* Page break row */
  if (item.item_type === 'page_break') {
    return (
      <div className="group flex items-center gap-3 py-2 px-4">
        <div className="flex-1 border-t-2 border-dashed border-gray-200" />
        <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Saut de page
        </span>
        <div className="flex-1 border-t-2 border-dashed border-gray-200" />
        <ActionMenu index={index} total={total} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
          onMoveUp={onMoveUp} onMoveDown={onMoveDown} onInsert={onInsert} onDuplicate={onDuplicate} onRemove={onRemove} />
      </div>
    );
  }

  /* Text row */
  if (item.item_type === 'text') {
    return (
      <div className="group relative">
        <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl shadow-sm hover:shadow transition-shadow">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100/60 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Texte libre</p>
              <RichTextArea value={item.description} onChange={v => onUpdate(index, { description: v })}
                placeholder="Saisissez votre texte ici..." rows={2} premium />
            </div>
            <ActionMenu index={index} total={total} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
              onMoveUp={onMoveUp} onMoveDown={onMoveDown} onInsert={onInsert} onDuplicate={onDuplicate} onRemove={onRemove} />
          </div>
        </div>
      </div>
    );
  }

  /* Standard line item row */
  return (
    <div className="group relative">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
        <div className={`h-1 ${s.dot} rounded-t-xl opacity-40`} />
        <div className="p-4">
          {/* Top: Type + Line total + Action */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5 cursor-grab opacity-0 group-hover:opacity-50 transition-opacity mr-1">
                <div className="flex gap-0.5"><div className="w-1 h-1 bg-gray-400 rounded-full" /><div className="w-1 h-1 bg-gray-400 rounded-full" /></div>
                <div className="flex gap-0.5"><div className="w-1 h-1 bg-gray-400 rounded-full" /><div className="w-1 h-1 bg-gray-400 rounded-full" /></div>
                <div className="flex gap-0.5"><div className="w-1 h-1 bg-gray-400 rounded-full" /><div className="w-1 h-1 bg-gray-400 rounded-full" /></div>
              </div>
              <TypeBadge type={item.item_type} />
              <select value={item.item_type} onChange={e => onUpdate(index, { item_type: e.target.value as ItemType })}
                className="text-[11px] border-0 bg-transparent text-gray-400 outline-none cursor-pointer hover:text-violet-600 p-0 transition-colors">
                {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {item.reference && (
                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">R\u00e9f: {item.reference}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900">
                  {lineTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
                <span className="text-[10px] text-gray-400 ml-1">HT</span>
              </div>
              <ActionMenu index={index} total={total} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
                onMoveUp={onMoveUp} onMoveDown={onMoveDown} onInsert={onInsert} onDuplicate={onDuplicate} onRemove={onRemove} />
            </div>
          </div>

          {/* Middle: Rich text description */}
          <div className="mb-3">
            <RichTextArea value={item.description} onChange={v => onUpdate(index, { description: v })}
              placeholder="D\u00e9signation de la prestation..." rows={2} premium />
          </div>

          {/* Bottom: Numeric fields */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col items-center gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Qt\u00e9</label>
              <input type="number" step="0.01" min="0" value={qty}
                onChange={e => onUpdate(index, { quantity: parseFloat(e.target.value) || 0 })}
                className="w-20 text-sm text-right bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 focus:bg-white transition-all hover:border-gray-300" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Unit\u00e9</label>
              <select value={item.unit || 'u'} onChange={e => onUpdate(index, { unit: e.target.value })}
                className="w-20 text-sm bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 focus:bg-white transition-all hover:border-gray-300">
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">P.U. HT</label>
              <input type="number" step="0.01" min="0" value={pu}
                onChange={e => onUpdate(index, { unit_price: parseFloat(e.target.value) || 0 })}
                className="w-24 text-sm text-right bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 focus:bg-white transition-all hover:border-gray-300" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">TVA</label>
              <select value={item.vat_rate ?? 20} onChange={e => onUpdate(index, { vat_rate: parseFloat(e.target.value) })}
                className="w-20 text-sm bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 focus:bg-white transition-all hover:border-gray-300">
                {VAT_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>
            <div className="ml-auto flex flex-col items-end gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total HT</label>
              <div className="w-28 text-sm font-bold text-gray-800 py-1.5 px-2 text-right bg-violet-50/50 rounded-lg border border-violet-100">
                {lineTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
          </div>

          {/* Optional: long description */}
          {item.long_description !== undefined && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Description d\u00e9taill\u00e9e</label>
              <textarea rows={2} value={item.long_description || ''}
                onChange={e => onUpdate(index, { long_description: e.target.value })}
                placeholder="D\u00e9tails suppl\u00e9mentaires, sp\u00e9cifications techniques, etc."
                className="w-full text-sm text-gray-600 bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 focus:bg-white resize-none transition-all placeholder:text-gray-300 leading-relaxed" />
            </div>
          )}
          {item.long_description === undefined && (
            <button type="button" onClick={() => onUpdate(index, { long_description: '' })}
              className="mt-2 text-[11px] text-gray-400 hover:text-violet-600 transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une description d\u00e9taill\u00e9e
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* Line Items Editor */
interface LineItemsEditorProps {
  items: LineItemData[];
  onChange: (items: LineItemData[]) => void;
  priceLibrary?: LineItemData[];
}

function newItem(type: ItemType = 'supply'): LineItemData {
  return { description: '', item_type: type, quantity: 1, unit: 'u', unit_price: 0, vat_rate: 20 };
}

export function LineItemsEditor({ items, onChange, priceLibrary = [] }: LineItemsEditorProps) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [libQuery, setLibQuery] = useState('');
  const [libResults, setLibResults] = useState<PriceLibraryItem[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const libDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!showLibrary) return;
    if (libQuery.trim() || libResults.length > 0) return;
    setLibLoading(true);
    priceLibraryService.getMostUsed(20)
      .then(res => { if (res.success) setLibResults(Array.isArray(res.data) ? (res.data as unknown as PriceLibraryItem[]) : []); })
      .catch(() => {})
      .finally(() => setLibLoading(false));
  }, [showLibrary]);

  const searchLib = (q: string) => {
    setLibQuery(q);
    if (libDebounceRef.current) clearTimeout(libDebounceRef.current);
    if (!q.trim()) {
      setLibLoading(true);
      priceLibraryService.getMostUsed(20)
        .then(res => { if (res.success) setLibResults(Array.isArray(res.data) ? (res.data as unknown as PriceLibraryItem[]) : []); })
        .catch(() => {})
        .finally(() => setLibLoading(false));
      return;
    }
    libDebounceRef.current = setTimeout(() => {
      setLibLoading(true);
      priceLibraryService.search(q)
        .then(res => { if (res.success) setLibResults(Array.isArray(res.data) ? (res.data as unknown as PriceLibraryItem[]) : []); })
        .catch(() => {})
        .finally(() => setLibLoading(false));
    }, 300);
  };

  const closeLibrary = () => { setShowLibrary(false); setLibQuery(''); setLibResults([]); };

  const addFromPriceLib = (pl: PriceLibraryItem) => {
    const VALID_ITEM_TYPES: ItemType[] = ['supply', 'labor', 'work', 'subcontracting', 'equipment', 'misc', 'other'];
    const itemType: ItemType = VALID_ITEM_TYPES.includes(pl.item_type as ItemType) ? (pl.item_type as ItemType) : 'supply';
    onChange([...items, {
      description: pl.name,
      long_description: pl.long_description || undefined,
      item_type: itemType,
      quantity: 1,
      unit: pl.unit || 'u',
      unit_price: pl.unit_price,
      vat_rate: pl.tax_rate ?? 20,
      reference: pl.reference,
    }]);
    closeLibrary();
  };

  const update = (index: number, updates: Partial<LineItemData>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const insert = (index: number, position: 'before' | 'after', type: ItemType) => {
    const next = [...items];
    const at = position === 'before' ? index : index + 1;
    next.splice(at, 0, newItem(type));
    onChange(next);
  };

  const duplicate = (index: number) => {
    const next = [...items];
    next.splice(index + 1, 0, { ...items[index] });
    onChange(next);
  };

  const addNew = (type: ItemType = 'supply') => onChange([...items, newItem(type)]);

  const totalHT = items.reduce((sum, it) => {
    if (['section', 'text', 'page_break'].includes(it.item_type)) return sum;
    const disc = it.discount_percent ?? 0;
    return sum + (it.quantity ?? 0) * (it.unit_price ?? 0) * (1 - disc / 100);
  }, 0);

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
          <div className="w-14 h-14 mx-auto mb-3 bg-violet-50 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Aucune ligne ajout\u00e9e</p>
          <p className="text-xs text-gray-400">Ajoutez des prestations, fournitures ou sections ci-dessous.</p>
        </div>
      )}

      {items.map((item, index) => (
        <LineItemRow key={index} item={item} index={index} total={items.length}
          onUpdate={update} onRemove={remove} onMoveUp={moveUp} onMoveDown={moveDown} onInsert={insert} onDuplicate={duplicate} />
      ))}

      {items.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl border border-violet-100">
          <span className="text-xs font-semibold text-gray-500">{items.filter(i => !['section', 'text', 'page_break'].includes(i.item_type)).length} ligne(s)</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Total HT</span>
            <span className="text-base font-extrabold text-gray-900">
              {totalHT.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => addNew('supply')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-all border border-blue-100 shadow-sm hover:shadow">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Fourniture
        </button>
        <button type="button" onClick={() => addNew('labor')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-3.5 py-2 rounded-xl transition-all border border-orange-100 shadow-sm hover:shadow">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Main d&apos;\u0153uvre
        </button>
        <button type="button" onClick={() => addNew('work')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3.5 py-2 rounded-xl transition-all border border-violet-100 shadow-sm hover:shadow">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Ouvrage
        </button>
        <button type="button" onClick={() => addNew('section')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl transition-all border border-slate-200 shadow-sm hover:shadow">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          Section
        </button>
        <MoreTypesButton onAdd={addNew} />
        <button type="button" onClick={() => showLibrary ? closeLibrary() : setShowLibrary(true)}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl transition-all border shadow-sm hover:shadow ${showLibrary ? 'text-purple-800 bg-purple-100 border-purple-200' : 'text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border-purple-100'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          Biblioth\u00e8que
        </button>
      </div>

      {showLibrary && (
        <div className="mt-2 bg-white rounded-2xl border border-purple-200 shadow-lg overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-50/70 border-b border-purple-100">
            <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={libQuery}
              onChange={e => searchLib(e.target.value)}
              placeholder="Rechercher dans la biblioth\u00e8que des prix..."
              className="flex-1 text-sm bg-transparent border-0 outline-none placeholder:text-purple-300 text-gray-700"
              autoFocus
            />
            {libLoading && (
              <svg className="w-4 h-4 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            <button type="button" onClick={closeLibrary} className="text-purple-300 hover:text-purple-600 transition-colors flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-3">
            {!libLoading && libResults.length === 0 && libQuery.trim() && (
              <p className="text-sm text-gray-400 text-center py-6">Aucun r\u00e9sultat pour &laquo;&nbsp;{libQuery}&nbsp;&raquo;</p>
            )}
            {!libLoading && libResults.length === 0 && !libQuery.trim() && (
              <p className="text-sm text-gray-400 text-center py-6">Tapez pour rechercher dans votre biblioth\u00e8que des prix</p>
            )}
            {libResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {libResults.map(pl => {
                  const typeColor: Record<string, string> = { supply: 'bg-blue-100 text-blue-600', labor: 'bg-orange-100 text-orange-600', work: 'bg-violet-100 text-violet-600' };
                  const tc = typeColor[pl.item_type as string] || 'bg-gray-100 text-gray-500';
                  return (
                    <button key={pl.id} type="button" onClick={() => addFromPriceLib(pl)}
                      className="flex items-start gap-3 text-left bg-gray-50/80 border border-gray-200 hover:border-purple-300 hover:bg-purple-50/40 px-3 py-2.5 rounded-xl transition-all">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${tc}`}>
                        {(pl.item_type as string) === 'labor' ? 'MO' : (pl.item_type as string) === 'work' ? 'Ouv' : 'F'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{pl.name}</p>
                        {pl.description && pl.description !== pl.name && (
                          <p className="text-xs text-gray-400 truncate">{pl.description}</p>
                        )}
                        <p className="text-xs font-semibold text-purple-600 mt-0.5">
                          {pl.unit_price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / {pl.unit || 'u'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MoreTypesButton({ onAdd }: { onAdd: (type: ItemType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const MORE = ITEM_TYPES.filter(t => !['supply', 'labor', 'work', 'section'].includes(t.value));
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3.5 py-2 rounded-xl transition-all border border-gray-200 shadow-sm hover:shadow">
        Autre type
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute bottom-full mb-1 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40">
          {MORE.map(t => {
            const st = TYPE_STYLE[t.value];
            return (
              <li key={t.value}>
                <button type="button" onClick={() => { onAdd(t.value as ItemType); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                  <span className={`w-2 h-2 rounded-full ${st?.dot || 'bg-gray-300'}`} />
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
