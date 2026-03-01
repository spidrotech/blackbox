'use client';

import { useRef, useState, useCallback } from 'react';
import { AddressAutocomplete, AddressResult } from '@/components/ui/AddressAutocomplete';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

type CustomerKind = 'individual' | 'company';
type Civility = 'M.' | 'Mme' | 'Autre';

interface Addr {
  street: string;
  street2: string;
  postalCode: string;
  city: string;
  country: string;
}

interface CompanySuggestion {
  name: string;
  siret: string;
  siren: string;
  address: string;
  postalCode: string;
  city: string;
}

const emptyAddr: Addr = { street: '', street2: '', postalCode: '', city: '', country: 'France' };

export function NewCustomerForm({ onSuccess, onClose }: Props) {
  const [kind, setKind] = useState<CustomerKind>('individual');
  const [civility, setCivility] = useState<Civility>('M.');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [addr, setAddr] = useState<Addr>(emptyAddr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Company autocomplete
  const [companySuggestions, setCompanySuggestions] = useState<CompanySuggestion[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const companyDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCompanies = useCallback(async (q: string) => {
    if (q.length < 2) { setCompanySuggestions([]); setCompanyOpen(false); return; }
    setCompanyLoading(true);
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&per_page=6`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const results: CompanySuggestion[] = (data.results || []).map((r: any) => ({
        name: r.nom_complet || r.nom_raison_sociale || '',
        siret: r.siege?.siret || '',
        siren: r.siren || '',
        address: r.siege?.adresse || '',
        postalCode: r.siege?.code_postal || '',
        city: r.siege?.commune || '',
      }));
      setCompanySuggestions(results);
      setCompanyOpen(results.length > 0);
    } catch {
      setCompanySuggestions([]);
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    if (companyDebounce.current) clearTimeout(companyDebounce.current);
    companyDebounce.current = setTimeout(() => searchCompanies(val), 300);
  };

  const selectCompany = (c: CompanySuggestion) => {
    setCompanyName(c.name);
    setSiret(c.siret || c.siren);
    setAddr(prev => ({ ...prev, street: c.address, postalCode: c.postalCode, city: c.city }));
    setCompanySuggestions([]);
    setCompanyOpen(false);
  };

  const handleAddressSelect = (r: AddressResult) => {
    setAddr(prev => ({ ...prev, street: r.street, postalCode: r.postalCode, city: r.city, country: r.country }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (kind === 'individual' && !firstName && !lastName) { setError('Le nom ou prÃ©nom est requis.'); return; }
    if (kind === 'company' && !companyName) { setError('Le nom de la sociÃ©tÃ© est requis.'); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        type: kind,
        email: email || undefined,
        phone: phone || undefined,
        siret: siret || undefined,
        vat: vatNumber || undefined,
        notes: notes || undefined,
      };
      if (kind === 'individual') {
        payload.name = [firstName, lastName].filter(Boolean).join(' ');
        payload.first_name = firstName || undefined;
        payload.last_name = lastName || undefined;
      } else {
        payload.name = companyName;
        const contact = [firstName, lastName].filter(Boolean).join(' ');
        if (contact) payload.contact_name = contact;
      }
      if (addr.street || addr.city || addr.postalCode) {
        payload.address = { street: addr.street, city: addr.city, postalCode: addr.postalCode, country: addr.country || 'France' };
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiUrl}/customers/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) { onSuccess(); onClose(); }
      else setError(result.detail || 'Erreur lors de la crÃ©ation.');
    } catch {
      setError('Erreur rÃ©seau.');
    } finally {
      setLoading(false);
    }
  };

  /* â”€â”€ helpers â”€â”€ */
  const Lbl = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
    <label className="block text-xs font-medium text-slate-600 mb-1">
      {children}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="overflow-y-auto max-h-[72vh] px-6 py-5 space-y-5">

          {/* Type Particulier / Professionnel */}
          <div>
            <Lbl>Statut</Lbl>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(['Particulier', 'Professionnel'] as const).map(opt => (
                <button key={opt} type="button"
                  onClick={() => setKind(opt === 'Particulier' ? 'individual' : 'company')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    (opt === 'Particulier' ? kind === 'individual' : kind === 'company')
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Company search (professional) */}
          {kind === 'company' && (
            <div className="relative">
              <Lbl req>Nom de la sociÃ©tÃ©</Lbl>
              <div className="relative">
                <input type="text" value={companyName}
                  onChange={e => handleCompanyNameChange(e.target.value)}
                  onFocus={() => companySuggestions.length > 0 && setCompanyOpen(true)}
                  placeholder="Ex : ECOENERGIEPRO ou SIREN..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  autoComplete="off"
                />
                {companyLoading && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {companyOpen && companySuggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl py-1">
                  {companySuggestions.map(c => (
                    <li key={c.siret || c.name} onMouseDown={() => selectCompany(c)}
                      className="px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-none">
                      <div className="font-medium text-sm text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                        {c.siret && <span>SIRET {c.siret}</span>}
                        {c.city && <span>Â· {c.postalCode} {c.city}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* CivilitÃ© */}
          <div>
            <Lbl>{kind === 'company' ? 'CivilitÃ© du contact' : 'CivilitÃ©'}</Lbl>
            <div className="flex gap-2">
              {(['M.', 'Mme', 'Autre'] as Civility[]).map(c => (
                <button key={c} type="button" onClick={() => setCivility(c)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    civility === c ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Nom & PrÃ©nom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Lbl req={kind === 'individual'}>Nom</Lbl>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Dupont"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <Lbl>PrÃ©nom</Lbl>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Jean"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* SIRET + TVA (professionnel) */}
          {kind === 'company' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Lbl>Siret / Siren</Lbl>
                <input type="text" value={siret} onChange={e => setSiret(e.target.value)}
                  placeholder="123 456 789 00012"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Lbl>NumÃ©ro de TVA</Lbl>
                <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)}
                  placeholder="FR12345678901"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Adresse */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Adresse</p>
            <AddressAutocomplete
              label="Rue et nÂ° de rue"
              value={addr.street}
              onChange={v => setAddr(p => ({ ...p, street: v }))}
              onSelect={handleAddressSelect}
              placeholder="Entrez une adresse..."
            />
            <input type="text" value={addr.street2}
              onChange={e => setAddr(p => ({ ...p, street2: e.target.value }))}
              placeholder="ComplÃ©ment d'adresse (BÃ¢t, Appt...)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-5 gap-2">
              <input type="text" value={addr.postalCode}
                onChange={e => setAddr(p => ({ ...p, postalCode: e.target.value }))}
                placeholder="Code postal"
                className="col-span-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input type="text" value={addr.city}
                onChange={e => setAddr(p => ({ ...p, city: e.target.value }))}
                placeholder="Ville"
                className="col-span-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={addr.country} onChange={e => setAddr(p => ({ ...p, country: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option>France</option><option>Belgique</option><option>Suisse</option>
              <option>Luxembourg</option><option>Monaco</option><option>Autre</option>
            </select>
          </div>

          {/* Contact */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Lbl>Email</Lbl>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="contact@exemple.fr"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Lbl>TÃ©lÃ©phone</Lbl>
                <div className="flex">
                  <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-sm text-slate-600 gap-1 shrink-0">
                    ðŸ‡«ðŸ‡· <span className="text-xs">+33</span>
                  </span>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="flex-1 rounded-r-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Lbl>Notes</Lbl>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Informations complÃ©mentaires..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2">
            {loading && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
