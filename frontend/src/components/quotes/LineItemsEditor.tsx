'use client';

import { useState, useRef, useEffect } from 'react';

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

const UNIT_OPTIONS = ['u', 'h', 'jour', 'm', 'm\u00b2', 'm\u00b3', 'kg', 'forfait', 'ml'];
const VAT_OPTIONS = [20, 10, 5.5, 2.1, 0];

const TYPE_BADGE: Record<ItemType, string> = {
  supply:         'bg-blue-50 text-blue-700 border-blue-200',
  labor:          'bg-orange-50 text-orange-700 border-orange-200',
  work:           'bg-purple-50 text-purple-700 border-purple-200',
  subcontracting: 'bg-pink-50 text-pink-700 border-pink-200',
  equipment:      'bg-cyan-50 text-cyan-700 border-cyan-200',
  misc:           'bg-gray-50 text-gray-600 border-gray-200',
  other:          'bg-gray-50 text-gray-500 border-gray-200',
  section:        'bg-slate-100 text-slate-600 border-slate-200',
  text:           'bg-yellow-50 text-yellow-700 border-yellow-200',
  page_break:     'bg-gray-100 text-gray-400 border-gray-200',
};

function TypeBadge({ type }: { type: ItemType }) {
  const t = ITEM_TYPES.find(x => x.value === type);
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${TYPE_BADGE[type] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {t?.label || type}
    </span>
  );
}

/* ─── Rich Text Toolbar ─────────────────────────────────────────────────── */
function RichTextArea({
  value, onChange, placeholder, rows = 2, className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  // Sync external value changes (only when not focused)
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

  const toolbarBtn = (label: string, cmd: string, arg?: string, title?: string) => (
    <button
      type="button"
      title={title || cmd}
      onMouseDown={e => { e.preventDefault(); exec(cmd, arg); }}
      className="px-1.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
    >
      {label}
    </button>
  );

  return (
    <div className={`border rounded-lg overflow-hidden ${focused ? 'ring-2 ring-blue-500 border-blue-400' : 'border-gray-200'} ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 bg-gray-50/80">
        {toolbarBtn('B', 'bold', undefined, 'Gras')}
        {toolbarBtn('I', 'italic', undefined, 'Italique')}
        {toolbarBtn('U', 'underline', undefined, 'Soulign\u00e9')}
        <div className="w-px h-3 bg-gray-200 mx-0.5" />
        {toolbarBtn('\u2022\u2022', 'insertUnorderedList', undefined, 'Liste \u00e0 puces')}
        {toolbarBtn('1.', 'insertOrderedList', undefined, 'Liste num\u00e9rot\u00e9e')}
        <div className="w-px h-3 bg-gray-200 mx-0.5" />
        <button
          type="button"
          title="Effacer mise en forme"
          onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }}
          className="px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 rounded"
        >
          ✕
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
        style={{ minHeight: `${rows * 1.5}rem` }}
        className={`px-3 py-2 text-sm outline-none leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300`}
      />
    </div>
  );
}

/* ─── Insert Submenu ─────────────────────────────────────────────────────── */
function InsertSubmenu({
  position,
  onInsert,
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
      <button
        type="button"
        className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
      >
        <span>Ins\u00e9rer {position === 'before' ? 'au dessus' : 'en dessous'}</span>
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute left-full top-0 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
          {PRICE_TYPES.map(t => (
            <li key={t.value}>
              <button
                type="button"
                onClick={() => onInsert(position, t.value as ItemType)}
                className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t.label}
              </button>
            </li>
          ))}
          <li className="border-t border-gray-50 my-1" />
          {STRUCT_TYPES.map(t => (
            <li key={t.value}>
              <button
                type="button"
                onClick={() => onInsert(position, t.value as ItemType)}
                className="w-full text-left px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/* ─── Line Item Row ──────────────────────────────────────────────────────── */
interface LineItemRowProps {
  item: LineItemData;
  index: number;
  total: number;
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

  const isStructural = ['section', 'text', 'page_break'].includes(item.item_type);
  const qty = item.quantity ?? 1;
  const pu = item.unit_price ?? 0;
  const disc = item.discount_percent ?? 0;
  const lineTotal = qty * pu * (1 - disc / 100);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  /* ── Section row ── */
  if (item.item_type === 'section') {
    return (
      <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg group">
        <svg className="w-4 h-4 text-slate-400 cursor-grab flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex-shrink-0">Section</span>
        <input
          type="text"
          value={item.description}
          onChange={e => onUpdate(index, { description: e.target.value })}
          placeholder="Nom de la section..."
          className="flex-1 text-sm font-semibold text-slate-700 bg-transparent border-none outline-none placeholder:text-slate-300"
        />
        <ActionMenu index={index} total={total} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
          onMoveUp={onMoveUp} onMoveDown={onMoveDown} onInsert={onInsert} onDuplicate={onDuplicate} onRemove={onRemove} />
      </div>
    );
  }

  /* ── Page break row ── */
  if (item.item_type === 'page_break') {
    return (
      <div className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg group">
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <div className="flex-1 border-t-2 border-dashed border-gray-200" />
        <span className="text-xs text-gray-400 font-medium px-2">Saut de page</span>
        <div className="flex-1 border-t-2 border-dashed border-gray-200" />
        <ActionMenu index={index} total={total} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
          onMoveUp={onMoveUp} onMoveDown={onMoveDown} onInsert={onInsert} onDuplicate={onDuplicate} onRemove={onRemove} />
      </div>
    );
  }

  /* ── Text row ── */
  if (item.item_type === 'text') {
    return (
      <div className="p-3 bg-yellow-50/60 border border-yellow-100 rounded-lg group">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <RichTextArea
            value={item.description}
            onChange={v => onUpdate(index, { description: v })}
            placeholder="Texte libre..."
            rows={2}
            className="flex-1"
          />
          <ActionMenu index={index} total={total} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
            onMoveUp={onMoveUp} onMoveDown={onMoveDown} onInsert={onInsert} onDuplicate={onDuplicate} onRemove={onRemove} />
        </div>
      </div>
    );
  }

  /* ── Standard line item row ── */
  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg group hover:border-gray-300 transition-colors">
      {/* Row 1: designation + type + qty + unit + pu + disc + tva + total + menu */}
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <svg className="w-4 h-4 text-gray-300 mt-2.5 flex-shrink-0 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1" fill="currentColor" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="9" cy="18" r="1" fill="currentColor" />
          <circle cx="15" cy="6" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="18" r="1" fill="currentColor" />
        </svg>

        {/* Designation (rich text) + type badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TypeBadge type={item.item_type} />
            <select
              value={item.item_type}
              onChange={e => onUpdate(index, { item_type: e.target.value as ItemType })}
              className="text-[10px] border-0 bg-transparent text-gray-400 outline-none cursor-pointer hover:text-gray-600 p-0"
            >
              {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <RichTextArea
            value={item.description}
            onChange={v => onUpdate(index, { description: v })}
            placeholder="D\u00e9signation..."
            rows={2}
          />
        </div>

        {/* Numeric fields */}
        <div className="flex items-end gap-1.5 flex-shrink-0 mt-6">
          {/* Qty */}
          <div className="text-center">
            <label className="block text-[10px] text-gray-400 mb-0.5">Qt\u00e9</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={qty}
              onChange={e => onUpdate(index, { quantity: parseFloat(e.target.value) || 0 })}
              className="w-14 text-sm text-center border border-gray-200 rounded-md px-1.5 py-1 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
            />
          </div>
          {/* Unit */}
          <div className="text-center">
            <label className="block text-[10px] text-gray-400 mb-0.5">Unit\u00e9</label>
            <select
              value={item.unit || 'u'}
              onChange={e => onUpdate(index, { unit: e.target.value })}
              className="w-16 text-sm border border-gray-200 rounded-md px-1 py-1 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400 bg-white"
            >
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {/* PU HT */}
          <div className="text-center">
            <label className="block text-[10px] text-gray-400 mb-0.5">P.U. HT</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pu}
              onChange={e => onUpdate(index, { unit_price: parseFloat(e.target.value) || 0 })}
              className="w-24 text-sm text-right border border-gray-200 rounded-md px-1.5 py-1 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
            />
          </div>
          {/* TVA */}
          <div className="text-center">
            <label className="block text-[10px] text-gray-400 mb-0.5">TVA</label>
            <select
              value={item.vat_rate ?? 20}
              onChange={e => onUpdate(index, { vat_rate: parseFloat(e.target.value) })}
              className="w-16 text-sm border border-gray-200 rounded-md px-1 py-1 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400 bg-white"
            >
              {VAT_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
          {/* Total HT */}
          <div className="text-right">
            <label className="block text-[10px] text-gray-400 mb-0.5">Total HT</label>
            <div className="w-24 text-sm font-semibold text-gray-800 py-1 px-1.5 text-right">
              {lineTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
        </div>

        {/* Action menu */}
        <ActionMenu index={index} total={total} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
          onMoveUp={onMoveUp} onMoveDown={onMoveDown} onInsert={onInsert} onDuplicate={onDuplicate} onRemove={onRemove} />
      </div>

      {/* Row 2: optional long description */}
      {item.long_description !== undefined && (
        <div className="mt-2 ml-6">
          <textarea
            rows={2}
            value={item.long_description || ''}
            onChange={e => onUpdate(index, { long_description: e.target.value })}
            placeholder="Description longue (optionnel)..."
            className="w-full text-xs text-gray-500 border border-gray-100 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>
      )}
      {/* Toggle long_description */}
      {item.long_description === undefined && (
        <button
          type="button"
          onClick={() => onUpdate(index, { long_description: '' })}
          className="mt-1.5 ml-6 text-[11px] text-gray-400 hover:text-blue-600 transition-colors"
        >
          + Description longue
        </button>
      )}
    </div>
  );
}

/* ─── Action Menu ────────────────────────────────────────────────────────── */
function ActionMenu({
  index, total, menuOpen, setMenuOpen, menuRef,
  onMoveUp, onMoveDown, onInsert, onDuplicate, onRemove,
}: {
  index: number;
  total: number;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement>;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onInsert: (i: number, pos: 'before' | 'after', type: ItemType) => void;
  onDuplicate: (i: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div ref={menuRef} className="relative flex-shrink-0 mt-1.5">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="Actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {menuOpen && (
        <ul className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40 text-sm">
          {index > 0 && (
            <li>
              <button type="button" onClick={() => { onMoveUp(index); setMenuOpen(false); }}
                className="w-full text-left px-4 py-1.5 text-gray-700 hover:bg-gray-50">
                ↑ D\u00e9placer vers le haut
              </button>
            </li>
          )}
          {index < total - 1 && (
            <li>
              <button type="button" onClick={() => { onMoveDown(index); setMenuOpen(false); }}
                className="w-full text-left px-4 py-1.5 text-gray-700 hover:bg-gray-50">
                ↓ D\u00e9placer vers le bas
              </button>
            </li>
          )}
          {(index > 0 || index < total - 1) && <li className="border-t border-gray-50 my-1" />}
          <InsertSubmenu position="before" onInsert={(pos, type) => { onInsert(index, pos, type); setMenuOpen(false); }} />
          <InsertSubmenu position="after" onInsert={(pos, type) => { onInsert(index, pos, type); setMenuOpen(false); }} />
          <li className="border-t border-gray-50 my-1" />
          <li>
            <button type="button" onClick={() => { onDuplicate(index); setMenuOpen(false); }}
              className="w-full text-left px-4 py-1.5 text-gray-700 hover:bg-gray-50">
              Dupliquer
            </button>
          </li>
          <li className="border-t border-gray-50 my-1" />
          <li>
            <button type="button" onClick={() => { onRemove(index); setMenuOpen(false); }}
              className="w-full text-left px-4 py-1.5 text-red-600 hover:bg-red-50">
              Supprimer
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

/* ─── Line Items Editor ──────────────────────────────────────────────────── */
interface LineItemsEditorProps {
  items: LineItemData[];
  onChange: (items: LineItemData[]) => void;
  priceLibrary?: LineItemData[];
}

function newItem(type: ItemType = 'supply'): LineItemData {
  return {
    description: '',
    item_type: type,
    quantity: 1,
    unit: 'u',
    unit_price: 0,
    vat_rate: 20,
  };
}

export function LineItemsEditor({ items, onChange, priceLibrary = [] }: LineItemsEditorProps) {
  const [showLibrary, setShowLibrary] = useState(false);

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

  const addFromLibrary = (lib: LineItemData) => {
    onChange([...items, { ...lib, id: undefined }]);
    setShowLibrary(false);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Aucune ligne. Ajoutez des prestations ci-dessous.</p>
        </div>
      )}
      {items.map((item, index) => (
        <LineItemRow
          key={index}
          item={item}
          index={index}
          total={items.length}
          onUpdate={update}
          onRemove={remove}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onInsert={insert}
          onDuplicate={duplicate}
        />
      ))}

      {/* Add buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => addNew('supply')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100">
          + Fourniture
        </button>
        <button type="button" onClick={() => addNew('labor')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-800 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors border border-orange-100">
          + Main d'\u0153uvre
        </button>
        <button type="button" onClick={() => addNew('section')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200">
          + Section
        </button>
        {/* Dropdown for more types */}
        <MoreTypesButton onAdd={addNew} />
        {priceLibrary.length > 0 && (
          <button type="button" onClick={() => setShowLibrary(v => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors border border-purple-100">
            \u2605 Biblioth\u00e8que prix
          </button>
        )}
      </div>

      {/* Price library */}
      {showLibrary && priceLibrary.length > 0 && (
        <div className="mt-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
          <p className="text-xs font-semibold text-purple-700 mb-2">S\u00e9lectionner depuis la biblioth\u00e8que</p>
          <div className="flex flex-wrap gap-2">
            {priceLibrary.map((lib, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addFromLibrary(lib)}
                className="text-xs bg-white border border-purple-200 text-purple-800 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors"
              >
                \u2605 {lib.description}
              </button>
            ))}
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

  const MORE = ITEM_TYPES.filter(t => !['supply', 'labor', 'section'].includes(t.value));
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200">
        + Autre
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute bottom-full mb-1 left-0 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
          {MORE.map(t => (
            <li key={t.value}>
              <button
                type="button"
                onClick={() => { onAdd(t.value as ItemType); setOpen(false); }}
                className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
