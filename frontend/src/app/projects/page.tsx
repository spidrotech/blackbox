'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { customerService, projectService, quoteService } from '@/services/api';
import { Customer, Project, Quote } from '@/types';
import { buildDetailPath, buildEditPath } from '@/lib/routes';
import { formatCurrency, formatDate } from '@/lib/utils';
import { franceRegionsMap, franceDepartmentsMap } from '@/lib/france-maps';

/* ─── Constants ──────────────────────────────────────────────── */

const BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200', dot: 'bg-slate-400' },
  planned: { label: 'Planifié', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  in_progress: { label: 'En cours', cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', dot: 'bg-violet-500' },
  paused: { label: 'En pause', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-400' },
  completed: { label: 'Terminé', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Annulé', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
  archived: { label: 'Archivé', cls: 'bg-gray-50 text-gray-400 ring-1 ring-gray-200', dot: 'bg-gray-300' },
};

const TABS = [
  { value: '', label: 'Tous', color: 'text-gray-600' },
  { value: 'planned', label: 'Planifié', color: 'text-blue-600' },
  { value: 'in_progress', label: 'En cours', color: 'text-violet-600' },
  { value: 'paused', label: 'En pause', color: 'text-amber-600' },
  { value: 'completed', label: 'Terminé', color: 'text-emerald-600' },
  { value: 'cancelled', label: 'Annulé', color: 'text-red-600' },
] as const;

type Coords = { x: number; y: number };

type RegionId =
  | 'hdf'
  | 'idf'
  | 'normandie'
  | 'bretagne'
  | 'pdl'
  | 'cvl'
  | 'grand-est'
  | 'bfc'
  | 'naq'
  | 'ara'
  | 'occitanie'
  | 'paca'
  | 'corse';

type RegionDefinition = {
  id: RegionId;
  label: string;
  shortLabel: string;
  coords: Coords;
  path: string;
  departments: string[];
  fill: string;
  stroke: string;
  textColor: string;
};


type WorksiteLocation = {
  fullAddress: string;
  city?: string;
  postalCode?: string;
  departmentCode?: string;
  coords: Coords | null;
  regionId: RegionId | null;
};

type AggregatedWorksite = {
  key: string;
  displayName: string;
  addressLabel: string;
  cityLabel?: string;
  postalCode?: string;
  departmentCode?: string;
  regionId: RegionId | null;
  coords: Coords | null;
  customerNames: string[];
  projects: Project[];
  quotes: Quote[];
  totalBudget: number;
  dominantStatus: Project['status'] | null;
  earliestStartDate?: string;
  latestEndDate?: string;
  searchableText: string;
};

const STATUS_PRIORITY: Project['status'][] = [
  'in_progress',
  'planned',
  'paused',
  'completed',
  'cancelled',
  'draft',
  'archived',
];

const MARKER_FILL_BY_DOT: Record<string, string> = {
  'slate-400': '#94a3b8',
  'blue-500': '#3b82f6',
  'violet-500': '#8b5cf6',
  'amber-400': '#fbbf24',
  'emerald-500': '#10b981',
  'red-500': '#ef4444',
  'gray-300': '#d1d5db',
};



const REGION_MAP: Record<RegionId, string> = {
  ara: 'ara', bfc: 'bfc', bretagne: 'bre', cvl: 'cvl', corse: 'cor',
  'grand-est': 'ges', hdf: 'hdf', idf: 'idf', normandie: 'nor',
  naq: 'naq', occitanie: 'occ', pdl: 'pdl', paca: 'pac'
};

function getPathCenter(pathStr: string): Coords {
  const re = /[ML](-?[\d.]+),(-?[\d.]+)/g;
  let m;
  let minX=10000, maxX=-10000, minY=10000, maxY=-10000;
  let found = false;
  while((m = re.exec(pathStr))) {
    found = true;
    const x = parseFloat(m[1]), y = parseFloat(m[2]);
    if(x < minX) minX = x;
    if(x > maxX) maxX = x;
    if(y < minY) minY = y;
    if(y > maxY) maxY = y;
  }
  if (!found) return { x: 0, y: 0 };
  return { x: (minX + maxX)/2, y: (minY + maxY)/2 };
}

function getPathBBox(pathStr: string): { x: number; y: number; w: number; h: number } {
  const re = /[ML](-?[\d.]+),(-?[\d.]+)/g;
  let m;
  let minX = 1e5, maxX = -1e5, minY = 1e5, maxY = -1e5;
  while ((m = re.exec(pathStr))) {
    const x = parseFloat(m[1]), y = parseFloat(m[2]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

const DEFAULT_VIEWBOX = '11 -5 606 600';

const REGION_DEFINITIONS_BASE: RegionDefinition[] = [
  { id: 'hdf', label: 'Hauts-de-France', shortLabel: 'HDF', coords: {x:0,y:0}, path: '', departments: ['02', '59', '60', '62', '80'], fill: '#e0e7ff', stroke: '#c7d2fe', textColor: '#3730a3' },
  { id: 'idf', label: 'Île-de-France', shortLabel: 'IDF', coords: {x:0,y:0}, path: '', departments: ['75', '77', '78', '91', '92', '93', '94', '95'], fill: '#c7d2fe', stroke: '#a5b4fc', textColor: '#312e81' },
  { id: 'normandie', label: 'Normandie', shortLabel: 'NOR', coords: {x:0,y:0}, path: '', departments: ['14', '27', '50', '61', '76'], fill: '#dbeafe', stroke: '#bfdbfe', textColor: '#1e40af' },
  { id: 'bretagne', label: 'Bretagne', shortLabel: 'BRE', coords: {x:0,y:0}, path: '', departments: ['22', '29', '35', '56'], fill: '#bae6fd', stroke: '#7dd3fc', textColor: '#075985' },
  { id: 'pdl', label: 'Pays de la Loire', shortLabel: 'PDL', coords: {x:0,y:0}, path: '', departments: ['44', '49', '53', '72', '85'], fill: '#e0f2fe', stroke: '#bae6fd', textColor: '#0c4a6e' },
  { id: 'cvl', label: 'Centre-Val de Loire', shortLabel: 'CVL', coords: {x:0,y:0}, path: '', departments: ['18', '28', '36', '37', '41', '45'], fill: '#ccfbf1', stroke: '#99f6e4', textColor: '#115e59' },
  { id: 'grand-est', label: 'Grand Est', shortLabel: 'GE', coords: {x:0,y:0}, path: '', departments: ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'], fill: '#f1f5f9', stroke: '#cbd5e1', textColor: '#334155' },
  { id: 'bfc', label: 'Bourgogne-Franche-Comté', shortLabel: 'BFC', coords: {x:0,y:0}, path: '', departments: ['21', '25', '39', '58', '70', '71', '89', '90'], fill: '#e2e8f0', stroke: '#cbd5e1', textColor: '#334155' },
  { id: 'naq', label: 'Nouvelle-Aquitaine', shortLabel: 'NAQ', coords: {x:0,y:0}, path: '', departments: ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'], fill: '#ede9fe', stroke: '#ddd6fe', textColor: '#4c1d95' },
  { id: 'ara', label: 'Auvergne-Rhône-Alpes', shortLabel: 'ARA', coords: {x:0,y:0}, path: '', departments: ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'], fill: '#dbeafe', stroke: '#bfdbfe', textColor: '#1e40af' },
  { id: 'occitanie', label: 'Occitanie', shortLabel: 'OCC', coords: {x:0,y:0}, path: '', departments: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'], fill: '#ffedd5', stroke: '#fecdd3', textColor: '#9f1239' },
  { id: 'paca', label: 'Provence-Alpes-Côte d’Azur', shortLabel: 'PACA', coords: {x:0,y:0}, path: '', departments: ['04', '05', '06', '13', '83', '84'], fill: '#fce7f3', stroke: '#fda4af', textColor: '#9f1239' },
  { id: 'corse', label: 'Corse', shortLabel: 'COR', coords: {x:0,y:0}, path: '', departments: ['20'], fill: '#fee2e2', stroke: '#fca5a5', textColor: '#991b1b' },
];

const REGION_DEFINITIONS: RegionDefinition[] = REGION_DEFINITIONS_BASE.map(def => {
  const realPath = franceRegionsMap.locations.find(l => l.id === REGION_MAP[def.id])?.path || def.path;
  const coords = getPathCenter(realPath);
  return { ...def, path: realPath, coords };
});

const DEPARTMENT_LABELS: Record<string, string> = {
  '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence', '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes',
  '07': 'Ardèche', '08': 'Ardennes', '09': 'Ariège', '10': 'Aube', '11': 'Aude', '12': 'Aveyron', '13': 'Bouches-du-Rhône',
  '14': 'Calvados', '15': 'Cantal', '16': 'Charente', '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '20': 'Corse',
  '21': 'Côte-d’Or', '22': 'Côtes-d’Armor', '23': 'Creuse', '24': 'Dordogne', '25': 'Doubs', '26': 'Drôme', '27': 'Eure',
  '28': 'Eure-et-Loir', '29': 'Finistère', '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers', '33': 'Gironde', '34': 'Hérault',
  '35': 'Ille-et-Vilaine', '36': 'Indre', '37': 'Indre-et-Loire', '38': 'Isère', '39': 'Jura', '40': 'Landes', '41': 'Loir-et-Cher',
  '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique', '45': 'Loiret', '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère',
  '49': 'Maine-et-Loire', '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne', '53': 'Mayenne', '54': 'Meurthe-et-Moselle',
  '55': 'Meuse', '56': 'Morbihan', '57': 'Moselle', '58': 'Nièvre', '59': 'Nord', '60': 'Oise', '61': 'Orne', '62': 'Pas-de-Calais',
  '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques', '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin',
  '68': 'Haut-Rhin', '69': 'Rhône', '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe', '73': 'Savoie', '74': 'Haute-Savoie',
  '75': 'Paris', '76': 'Seine-Maritime', '77': 'Seine-et-Marne', '78': 'Yvelines', '79': 'Deux-Sèvres', '80': 'Somme', '81': 'Tarn',
  '82': 'Tarn-et-Garonne', '83': 'Var', '84': 'Vaucluse', '85': 'Vendée', '86': 'Vienne', '87': 'Haute-Vienne', '88': 'Vosges',
  '89': 'Yonne', '90': 'Territoire de Belfort', '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne', '95': 'Val-d’Oise',
};


const STREET_TYPE_ALIASES: Record<string, string> = {
  av: 'avenue',
  ave: 'avenue',
  avenue: 'avenue',
  bd: 'boulevard',
  blvd: 'boulevard',
  boulevard: 'boulevard',
  rte: 'route',
  route: 'route',
  chem: 'chemin',
  ch: 'chemin',
  chemin: 'chemin',
  imp: 'impasse',
  impasse: 'impasse',
  all: 'allee',
  allee: 'allee',
  pl: 'place',
  place: 'place',
  sq: 'square',
  square: 'square',
  res: 'residence',
  residence: 'residence',
  faub: 'faubourg',
  faubourg: 'faubourg',
};

const ADDRESS_NOISE_WORDS = new Set([
  'france',
  'bat',
  'batiment',
  'batimenta',
  'app',
  'appartement',
  'appt',
  'porte',
  'etage',
  'rdc',
  'lot',
  'villa',
  'immeuble',
  'esc',
  'escalier',
  'chez',
]);

const REGION_BY_ID = REGION_DEFINITIONS.reduce<Record<RegionId, RegionDefinition>>((acc, region) => {
  acc[region.id] = region;
  return acc;
}, {} as Record<RegionId, RegionDefinition>);

const CITY_COORDS: Record<string, Coords> = {
  paris: { x: 310, y: 195 }, 'île-de-france': { x: 310, y: 195 },
  lyon: { x: 370, y: 380 }, marseille: { x: 400, y: 510 },
  toulouse: { x: 235, y: 480 }, nice: { x: 480, y: 490 },
  nantes: { x: 140, y: 290 }, strasbourg: { x: 500, y: 185 },
  montpellier: { x: 330, y: 490 }, bordeaux: { x: 165, y: 415 },
  lille: { x: 310, y: 90 }, rennes: { x: 130, y: 230 },
  reims: { x: 365, y: 165 }, toulon: { x: 430, y: 520 },
  grenoble: { x: 410, y: 400 }, dijon: { x: 385, y: 285 },
  angers: { x: 165, y: 280 }, nîmes: { x: 350, y: 480 },
  'clermont-ferrand': { x: 310, y: 370 }, 'le havre': { x: 230, y: 165 },
  'saint-étienne': { x: 350, y: 385 }, brest: { x: 55, y: 195 },
  tours: { x: 230, y: 290 }, amiens: { x: 295, y: 130 },
  limoges: { x: 240, y: 370 }, perpignan: { x: 290, y: 530 },
  metz: { x: 450, y: 170 }, besançon: { x: 430, y: 290 },
  orléans: { x: 280, y: 255 }, rouen: { x: 260, y: 165 },
  mulhouse: { x: 490, y: 250 }, caen: { x: 195, y: 175 },
  nancy: { x: 450, y: 195 }, avignon: { x: 370, y: 475 },
  poitiers: { x: 210, y: 330 }, 'la rochelle': { x: 140, y: 360 },
  pau: { x: 180, y: 500 }, bayonne: { x: 140, y: 500 },
  valence: { x: 375, y: 410 }, ajaccio: { x: 530, y: 540 },
  bastia: { x: 545, y: 490 }, troyes: { x: 355, y: 225 },
  chambéry: { x: 425, y: 385 }, annecy: { x: 430, y: 370 },
  colmar: { x: 490, y: 230 }, dunkerque: { x: 295, y: 65 },
  quimper: { x: 65, y: 220 }, lorient: { x: 80, y: 240 },
  vannes: { x: 100, y: 250 }, 'saint-malo': { x: 130, y: 210 },
  chartres: { x: 265, y: 225 }, auxerre: { x: 345, y: 260 },
  bourges: { x: 295, y: 310 }, nevers: { x: 320, y: 310 },
  moulins: { x: 320, y: 340 }, vichy: { x: 325, y: 355 },
  'le mans': { x: 205, y: 255 }, laval: { x: 165, y: 245 },
  albi: { x: 270, y: 470 }, rodez: { x: 290, y: 440 },
  cahors: { x: 240, y: 440 }, agen: { x: 200, y: 450 },
  tarbes: { x: 195, y: 510 }, auch: { x: 210, y: 480 },
  carcassonne: { x: 280, y: 500 }, béziers: { x: 310, y: 500 },
  arles: { x: 375, y: 490 }, 'aix-en-provence': { x: 400, y: 500 },
  cannes: { x: 470, y: 500 }, antibes: { x: 475, y: 495 },
  gap: { x: 430, y: 430 }, briançon: { x: 450, y: 410 },
  digne: { x: 440, y: 460 },
};

function normalizeText(value?: string): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractPostalCode(value?: string): string | undefined {
  const match = value?.match(/\b\d{5}\b/);
  return match?.[0];
}

function resolveDepartmentCode(postalCode?: string): string | undefined {
  if (!postalCode || postalCode.length < 2) return undefined;
  const prefix = postalCode.slice(0, 2);
  if (prefix === '20') return '20';
  return prefix;
}

function compactAddress(parts: Array<string | undefined>): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(', ');
}

function canonicalizeStreetName(value?: string): string {
  const normalized = normalizeText(value);
  if (!normalized) return '';

  const tokens = normalized
    .split(' ')
    .filter(Boolean)
    .map((token) => STREET_TYPE_ALIASES[token] ?? token)
    .filter((token) => !ADDRESS_NOISE_WORDS.has(token))
    .filter((token) => !/^\d+[a-z]?$/.test(token) || token.length > 3)
    .filter((token) => !/^(bis|ter|quater)$/.test(token));

  return tokens.join(' ');
}

function extractStreetNumber(value?: string): string {
  const normalized = normalizeText(value);
  const match = normalized.match(/\b\d{1,4}[a-z]?\b/);
  return match?.[0] ?? '';
}

function extractCityFromAddress(value?: string): string {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  const withoutPostalCode = normalized.replace(/\b\d{5}\b/g, ' ').trim();
  if (!withoutPostalCode) return '';

  const parts = withoutPostalCode
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const candidate = parts.at(-1) ?? withoutPostalCode;
  return candidate
    .split(' ')
    .filter(Boolean)
    .filter((token) => !ADDRESS_NOISE_WORDS.has(token))
    .join(' ');
}

function buildCanonicalAddressKey(address?: string, city?: string, postalCode?: string): string {
  const normalizedAddress = normalizeText(address);
  if (!normalizedAddress && !city && !postalCode) return '';

  const resolvedPostalCode = postalCode ?? extractPostalCode(address) ?? '';
  const resolvedCity = normalizeText(city) || extractCityFromAddress(address);
  const streetNumber = extractStreetNumber(address);
  const canonicalStreet = canonicalizeStreetName(
    normalizedAddress
      .replace(/\b\d{5}\b/g, ' ')
      .replace(new RegExp(`\\b${resolvedCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ')
  );

  return [resolvedPostalCode, resolvedCity, streetNumber, canonicalStreet]
    .filter(Boolean)
    .join('|');
}

function getCustomerDisplayName(customer?: Customer): string {
  if (!customer) return '—';
  return customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || '—';
}

function getCustomerCity(customer?: Customer): string | undefined {
  return customer?.address?.city || customer?.billingAddress?.city || (customer as unknown as { city?: string })?.city;
}

function guessCoordsFromAddress(address?: string): Coords | null {
  if (!address) return null;
  const key = normalizeText(address);
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const normalizedCity = normalizeText(city);
    if (key.includes(normalizedCity) || normalizedCity.includes(key)) return coords;
  }
  return null;
}

function guessProjectCoords(project: Project, customer?: Customer): Coords | null {
  const projectAddress = compactAddress([
    project.worksite?.street,
    [project.worksite?.postal_code, project.worksite?.city].filter(Boolean).join(' '),
  ]);
  const fromProject = guessCoordsFromAddress(projectAddress || project.worksite?.city);
  if (fromProject) return fromProject;
  return guessCoordsFromAddress(getCustomerCity(customer));
}

function guessQuoteCoords(quote: Quote, customer?: Customer): Coords | null {
  const fromAddress = guessCoordsFromAddress(quote.worksite_address ?? quote.worksiteAddress);
  if (fromAddress) return fromAddress;
  return guessCoordsFromAddress(getCustomerCity(customer));
}

function findClosestRegion(coords: Coords | null): RegionId | null {
  if (!coords) return null;
  let closestId: RegionId | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  REGION_DEFINITIONS.forEach((region) => {
    const dx = coords.x - region.coords.x;
    const dy = coords.y - region.coords.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      closestId = region.id;
    }
  });
  return closestId;
}

function resolveRegionId(postalCode?: string, coords?: Coords | null): RegionId | null {
  if (postalCode) {
    const department = postalCode.slice(0, 2);
    const region = REGION_DEFINITIONS.find((item) => item.departments.includes(department));
    if (region) return region.id;
  }
  return findClosestRegion(coords ?? null);
}

function buildProjectLocation(project: Project, customer?: Customer): WorksiteLocation {
  const city = project.worksite?.city || getCustomerCity(customer);
  const postalCode = project.worksite?.postal_code;
  const departmentCode = resolveDepartmentCode(postalCode);
  const fullAddress = compactAddress([
    project.worksite?.street,
    [postalCode, city].filter(Boolean).join(' '),
  ]) || city || '';
  const coords = guessProjectCoords(project, customer);
  return {
    fullAddress,
    city: city || undefined,
    postalCode,
    departmentCode,
    coords,
    regionId: resolveRegionId(postalCode, coords),
  };
}

function buildQuoteLocation(quote: Quote, customer?: Customer): WorksiteLocation {
  const fullAddress = (quote.worksite_address ?? quote.worksiteAddress ?? '').trim();
  const postalCode = extractPostalCode(fullAddress);
  const departmentCode = resolveDepartmentCode(postalCode);
  const coords = guessQuoteCoords(quote, customer);
  return {
    fullAddress,
    postalCode,
    departmentCode,
    coords,
    regionId: resolveRegionId(postalCode, coords),
  };
}

function buildWorksiteKey(location: WorksiteLocation, fallback: string): string {
  const canonicalAddressKey = buildCanonicalAddressKey(
    location.fullAddress,
    location.city,
    location.postalCode,
  );
  if (canonicalAddressKey) {
    return `addr:${canonicalAddressKey}`;
  }
  if (location.postalCode && location.city) {
    return `loc:${normalizeText(`${location.postalCode} ${location.city}`)}`;
  }
  return fallback;
}

function deriveDominantStatus(projects: Project[]): Project['status'] | null {
  for (const status of STATUS_PRIORITY) {
    if (projects.some((project) => project.status === status)) return status;
  }
  return null;
}

function deriveDateRange(projects: Project[]): { earliestStartDate?: string; latestEndDate?: string } {
  const startDates = projects.map((project) => project.start_date).filter(Boolean) as string[];
  const endDates = projects.map((project) => project.end_date).filter(Boolean) as string[];
  return {
    earliestStartDate: startDates.length > 0 ? [...startDates].sort()[0] : undefined,
    latestEndDate: endDates.length > 0 ? [...endDates].sort().at(-1) : undefined,
  };
}

function getMarkerFill(worksite: AggregatedWorksite): string {
  if (!worksite.dominantStatus) return '#8b5cf6';
  const dot = (BADGE[worksite.dominantStatus] ?? BADGE.draft).dot.replace('bg-', '');
  return MARKER_FILL_BY_DOT[dot] ?? '#8b5cf6';
}

function getWorksitePrimaryLink(worksite: AggregatedWorksite): string | null {
  if (worksite.projects.length > 0) return buildDetailPath('projects', worksite.projects[0].id);
  if (worksite.quotes.length > 0) return buildDetailPath('quotes', worksite.quotes[0].id);
  return null;
}

function getWorksiteEditLink(worksite: AggregatedWorksite): string | null {
  if (worksite.projects.length > 0) return buildEditPath('projects', worksite.projects[0].id);
  return null;
}

function FranceMap({
  worksites,
  regionCounts,
  departmentCounts,
  selectedWorksiteKey,
  selectedRegionId,
  selectedDepartmentCode,
  onSelectWorksite,
  onSelectRegion,
  onSelectDepartment,
}: {
  worksites: AggregatedWorksite[];
  regionCounts: Record<RegionId, number>;
  departmentCounts: Record<string, number>;
  selectedWorksiteKey: string | null;
  selectedRegionId: RegionId | null;
  selectedDepartmentCode: string | null;
  onSelectWorksite: (key: string | null) => void;
  onSelectRegion: (id: RegionId | null) => void;
  onSelectDepartment: (code: string | null) => void;
}) {
  const visibleMarkers = worksites.filter((worksite) => worksite.coords);
  const selectedRegionLabel = selectedRegionId ? REGION_BY_ID[selectedRegionId].label : null;
  const selectedDepartmentsList = selectedRegionId ? REGION_DEFINITIONS.find(r => r.id === selectedRegionId)?.departments || [] : [];

  /* ── Compute zoomed viewBox when a region is selected ── */
  const viewBox = useMemo(() => {
    if (!selectedRegionId) return DEFAULT_VIEWBOX;
    const region = REGION_BY_ID[selectedRegionId];
    const bbox = getPathBBox(region.path);
    // Expand bbox to include departments for accuracy
    const deps = region.departments;
    for (const depCode of deps) {
      const depData = franceDepartmentsMap.locations.find(l => l.id === depCode);
      if (!depData) continue;
      const db = getPathBBox(depData.path);
      const right = Math.max(bbox.x + bbox.w, db.x + db.w);
      const bottom = Math.max(bbox.y + bbox.h, db.y + db.h);
      bbox.x = Math.min(bbox.x, db.x);
      bbox.y = Math.min(bbox.y, db.y);
      bbox.w = right - bbox.x;
      bbox.h = bottom - bbox.y;
    }
    const pad = Math.max(bbox.w, bbox.h) * 0.18;
    return `${bbox.x - pad} ${bbox.y - pad} ${bbox.w + pad * 2} ${bbox.h + pad * 2}`;
  }, [selectedRegionId]);

  const handleClear = () => {
    onSelectRegion(null);
    onSelectDepartment(null);
    onSelectWorksite(null);
  };

  return (
    <div className="relative">
      <svg viewBox={viewBox} className="w-full h-auto max-h-[600px] drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
        
        {/* Background click-area to deselect */}
        {selectedRegionId && (
          <rect x="-500" y="-500" width="2000" height="2000" fill="transparent" onClick={handleClear} />
        )}

        {REGION_DEFINITIONS.map((region) => {
          const count = regionCounts[region.id] ?? 0;
          const isActive = selectedRegionId === region.id;
          const isDimmed = selectedRegionId !== null && !isActive;
          return (
            <g
              key={region.id}
              className="cursor-pointer group outline-none" onClick={() => onSelectRegion(isActive ? null : region.id)}
            >
              <path
                d={region.path}
                fill={region.fill}
                stroke={isActive ? region.stroke : '#ffffff'}
                strokeWidth={isActive ? 3.2 : 2.4}
                opacity={count > 0 ? (isDimmed ? 0.35 : 1) : (isDimmed ? 0.2 : 0.8)}
                strokeLinejoin="round"
                className="transition-all duration-300 hover:opacity-100 hover:brightness-95 drop-shadow-sm"
              />
              {isActive && (
                <path
                  d={region.path}
                  fill="none"
                  stroke="#111827"
                  strokeWidth="1.1"
                  opacity="0.18"
                  strokeLinejoin="round"
                />
              )}
              <text
                x={region.coords.x}
                y={region.coords.y - 3}
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fill={region.textColor}
                opacity={isDimmed ? 0.6 : 1}
              >
                {region.shortLabel}
              </text>
              <text
                x={region.coords.x}
                y={region.coords.y + 11}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill={count > 0 ? region.textColor : '#dbe4ee'}
                opacity={isDimmed ? 0.6 : 0.95}
              >
                {count}
              </text>
            </g>
          );
        })}

        {selectedDepartmentsList.map((depCode) => {
          const count = departmentCounts[depCode] ?? 0;
          const isSelected = selectedDepartmentCode === depCode;
          const depMapData = franceDepartmentsMap.locations.find(l => l.id === depCode);
          if (!depMapData) return null;
          const depCenter = getPathCenter(depMapData.path);
          return (
            <g
              key={depCode}
              className="cursor-pointer transition-all duration-150"
              onClick={() => onSelectDepartment(isSelected ? null : depCode)}
            >
              <path
                d={depMapData.path}
                fill={isSelected ? '#1e293b' : '#f8fafc'}
                stroke={selectedRegionId ? REGION_BY_ID[selectedRegionId].stroke : '#e2e8f0'}
                strokeWidth={isSelected ? 1.5 : 1}
                opacity={count > 0 ? 1 : 0.8} className="hover:brightness-95 hover:fill-slate-100 transition-all"
              />
              {count > 0 && (
                <text
                  x={depCenter.x}
                  y={depCenter.y + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill={isSelected ? '#ffffff' : '#0f172a'}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}

        {visibleMarkers.map((worksite) => {
          if (!worksite.coords) return null;
          const fill = getMarkerFill(worksite);
          const totalItems = worksite.projects.length + worksite.quotes.length;
          const isSelected = selectedWorksiteKey === worksite.key;
          const matchesRegion = selectedRegionId === null || worksite.regionId === selectedRegionId;
          const matchesDepartment = selectedDepartmentCode === null || worksite.departmentCode === selectedDepartmentCode;
          const isVisible = matchesRegion && matchesDepartment;
          const radius = isSelected ? 11 : Math.min(10, 7 + Math.max(0, totalItems - 1));

          return (
            <g
              key={worksite.key}
              className="cursor-pointer"
              opacity={isVisible ? 1 : 0.22}
              onClick={() => {
                if (!isVisible) return;
                onSelectWorksite(isSelected ? null : worksite.key);
              }}
            >
              {isSelected && (
                <circle cx={worksite.coords.x} cy={worksite.coords.y} r="18" fill="none" stroke={fill} strokeWidth="2" opacity="0.35">
                  <animate attributeName="r" values="14;20;14" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={worksite.coords.x} cy={worksite.coords.y + 2} r={radius} fill="black" opacity="0.08" />
              <circle cx={worksite.coords.x} cy={worksite.coords.y} r={radius} fill={fill} stroke="white" strokeWidth="2.5" />
              <circle cx={worksite.coords.x} cy={worksite.coords.y} r="3" fill="white" opacity="0.95" />
              {totalItems > 1 && (
                <text
                  x={worksite.coords.x + radius + 4}
                  y={worksite.coords.y + 3}
                  fontSize="10"
                  fontWeight="700"
                  fill="#1f2937"
                >
                  {totalItems}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-md border border-slate-100">
        <p className="text-xs font-bold text-gray-700">{visibleMarkers.length} / {worksites.length} chantier{worksites.length !== 1 ? 's' : ''}</p>
        <p className="text-[10px] text-gray-400">positionnés sur la carte</p>
      </div>

      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-md border border-slate-100 max-w-[240px]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Filtre région</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{selectedRegionLabel ?? 'Toute la France'}</p>
          </div>
          {selectedRegionId && (
            <button
              onClick={handleClear}
              className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
              title="Réinitialiser le filtre"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
        {!selectedRegionId && (
          <p className="text-[10px] text-gray-400 mt-0.5">Cliquez sur une région pour zoomer et affiner.</p>
        )}
        {selectedRegionId && selectedDepartmentCode && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Dept. : <span className="font-medium text-gray-600">{DEPARTMENT_LABELS[selectedDepartmentCode] ?? selectedDepartmentCode}</span>
          </p>
        )}
      </div>

      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-md border border-slate-100">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(BADGE).filter(([key]) => key !== 'archived' && key !== 'draft').map(([key, value]) => (
            <span key={key} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className={`w-2 h-2 rounded-full ${value.dot}`} />
              {value.label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            Devis groupés
          </span>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, sub, gradient, ring, icon }: {
  title: string;
  value: string | number;
  sub?: string;
  gradient: string;
  ring: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${ring} bg-white p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.07] ${gradient}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient} text-white shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quoteWorksites, setQuoteWorksites] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<string>('');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selectedWorksiteKey, setSelectedWorksiteKey] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<RegionId | null>(null);
  const [selectedDepartmentCode, setSelectedDepartmentCode] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const toArray = <T,>(value: unknown): T[] => Array.isArray(value) ? (value as T[]) : [];

  const loadData = async () => {
    try {
      const [projectsRes, customersRes, quotesRes] = await Promise.all([
        projectService.getAll(),
        customerService.getAll(),
        quoteService.getAll(),
      ]);

      if (projectsRes.success) {
        const projectData = toArray<Project>(projectsRes.data);
        const projectItems = toArray<Project>((projectsRes as unknown as { items?: unknown }).items);
        setProjects(projectData.length > 0 ? projectData : projectItems);
      }

      if (customersRes.success) {
        const customerData = toArray<Customer>(customersRes.data);
        const customerItems = toArray<Customer>((customersRes as unknown as { items?: unknown }).items);
        setCustomers(customerData.length > 0 ? customerData : customerItems);
      }

      if (quotesRes.success) {
        const quoteData = toArray<Quote>(quotesRes.data);
        const quoteItems = toArray<Quote>((quotesRes as unknown as { items?: unknown }).items);
        const quoteList = quoteData.length > 0 ? quoteData : quoteItems;
        const worksiteQuotes = quoteList.filter((quote) => {
          const address = (quote.worksite_address ?? quote.worksiteAddress ?? '').trim();
          const linkedProjectId = quote.project_id ?? quote.projectId;
          return address.length > 0 && !linkedProjectId;
        });
        setQuoteWorksites(worksiteQuotes);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const getCustomerName = useCallback((customerId?: number) => {
    if (!customerId) return '—';
    return getCustomerDisplayName(customerMap.get(customerId));
  }, [customerMap]);

  const worksites = useMemo(() => {
    const buckets = new Map<string, {
      key: string;
      addressLabel: string;
      cityLabel?: string;
      postalCode?: string;
      departmentCode?: string;
      regionId: RegionId | null;
      coords: Coords | null;
      customerNames: string[];
      projects: Project[];
      quotes: Quote[];
      totalBudget: number;
    }>();

    const ensureBucket = (key: string, location: WorksiteLocation) => {
      const existing = buckets.get(key);
      if (existing) {
        if (!existing.coords && location.coords) existing.coords = location.coords;
        if (!existing.regionId && location.regionId) existing.regionId = location.regionId;
        if (!existing.cityLabel && location.city) existing.cityLabel = location.city;
        if (!existing.postalCode && location.postalCode) existing.postalCode = location.postalCode;
        if (!existing.departmentCode && location.departmentCode) existing.departmentCode = location.departmentCode;
        if (!existing.addressLabel && location.fullAddress) existing.addressLabel = location.fullAddress;
        return existing;
      }

      const created = {
        key,
        addressLabel: location.fullAddress,
        cityLabel: location.city,
        postalCode: location.postalCode,
        departmentCode: location.departmentCode,
        regionId: location.regionId,
        coords: location.coords,
        customerNames: [],
        projects: [],
        quotes: [],
        totalBudget: 0,
      };
      buckets.set(key, created);
      return created;
    };

    projects.forEach((project) => {
      const customer = customerMap.get(project.customer_id);
      const location = buildProjectLocation(project, customer);
      const bucket = ensureBucket(buildWorksiteKey(location, `project-${project.id}`), location);
      bucket.projects.push(project);
      bucket.totalBudget += project.estimated_budget ?? 0;
      const customerName = getCustomerDisplayName(customer);
      if (customerName !== '—') bucket.customerNames.push(customerName);
    });

    quoteWorksites.forEach((quote) => {
      const customer = customerMap.get(quote.customer_id ?? quote.customerId ?? 0);
      const location = buildQuoteLocation(quote, customer);
      const bucket = ensureBucket(buildWorksiteKey(location, `quote-${quote.id}`), location);
      bucket.quotes.push(quote);
      const customerName = getCustomerDisplayName(customer);
      if (customerName !== '—') bucket.customerNames.push(customerName);
    });

    return Array.from(buckets.values())
      .map((bucket) => {
        const dedupedCustomerNames = Array.from(new Set(bucket.customerNames));
        const { earliestStartDate, latestEndDate } = deriveDateRange(bucket.projects);
        const displayName = bucket.addressLabel
          || bucket.cityLabel
          || bucket.projects[0]?.name
          || bucket.quotes[0]?.reference
          || 'Chantier sans adresse';
        const searchableParts = [
          displayName,
          bucket.addressLabel,
          bucket.cityLabel,
          dedupedCustomerNames.join(' '),
          bucket.projects.map((project) => project.name).join(' '),
          bucket.quotes.map((quote) => quote.reference).join(' '),
        ];

        const worksite: AggregatedWorksite = {
          key: bucket.key,
          displayName,
          addressLabel: bucket.addressLabel || bucket.cityLabel || 'Adresse non renseignée',
          cityLabel: bucket.cityLabel,
          postalCode: bucket.postalCode,
          departmentCode: bucket.departmentCode,
          regionId: bucket.regionId,
          coords: bucket.coords,
          customerNames: dedupedCustomerNames,
          projects: bucket.projects,
          quotes: bucket.quotes,
          totalBudget: bucket.totalBudget,
          dominantStatus: deriveDominantStatus(bucket.projects),
          earliestStartDate,
          latestEndDate,
          searchableText: normalizeText(searchableParts.filter(Boolean).join(' ')),
        };

        return worksite;
      })
      .sort((left, right) => {
        const rightWeight = right.projects.length + right.quotes.length;
        const leftWeight = left.projects.length + left.quotes.length;
        if (rightWeight !== leftWeight) return rightWeight - leftWeight;
        return left.displayName.localeCompare(right.displayName, 'fr');
      });
  }, [customerMap, projects, quoteWorksites]);

  const quoteDerivedWorksitesCount = useMemo(
    () => worksites.filter((worksite) => worksite.quotes.length > 0).length,
    [worksites]
  );

  const baseFilteredWorksites = useMemo(() => {
    const query = normalizeText(search);
    return worksites.filter((worksite) => {
      const matchesStatus = tab === ''
        ? true
        : worksite.projects.some((project) => project.status === tab);
      const matchesSearch = query === '' || worksite.searchableText.includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [search, tab, worksites]);

  const regionCounts = useMemo(() => {
    const counts = REGION_DEFINITIONS.reduce<Record<RegionId, number>>((acc, region) => {
      acc[region.id] = 0;
      return acc;
    }, {} as Record<RegionId, number>);
    baseFilteredWorksites.forEach((worksite) => {
      if (worksite.regionId) counts[worksite.regionId] += 1;
    });
    return counts;
  }, [baseFilteredWorksites]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const source = selectedRegionId
      ? baseFilteredWorksites.filter((worksite) => worksite.regionId === selectedRegionId)
      : [];
    source.forEach((worksite) => {
      if (!worksite.departmentCode) return;
      counts[worksite.departmentCode] = (counts[worksite.departmentCode] ?? 0) + 1;
    });
    return counts;
  }, [baseFilteredWorksites, selectedRegionId]);

  const filteredWorksites = useMemo(() => {
    return baseFilteredWorksites.filter((worksite) => {
      const matchesRegion = selectedRegionId ? worksite.regionId === selectedRegionId : true;
      const matchesDepartment = selectedDepartmentCode ? worksite.departmentCode === selectedDepartmentCode : true;
      return matchesRegion && matchesDepartment;
    });
  }, [baseFilteredWorksites, selectedDepartmentCode, selectedRegionId]);

  useEffect(() => {
    if (!selectedRegionId) {
      if (selectedDepartmentCode !== null) setSelectedDepartmentCode(null);
      return;
    }

    const allowedDepartments = new Set(REGION_BY_ID[selectedRegionId].departments);
    if (selectedDepartmentCode && !allowedDepartments.has(selectedDepartmentCode)) {
      setSelectedDepartmentCode(null);
    }
  }, [selectedDepartmentCode, selectedRegionId]);

  useEffect(() => {
    if (selectedWorksiteKey && !filteredWorksites.some((worksite) => worksite.key === selectedWorksiteKey)) {
      setSelectedWorksiteKey(null);
    }
  }, [filteredWorksites, selectedWorksiteKey]);

  const selectedWorksite = useMemo(
    () => filteredWorksites.find((worksite) => worksite.key === selectedWorksiteKey) ?? null,
    [filteredWorksites, selectedWorksiteKey]
  );

  const countByTab = useCallback((value: string) => {
    if (value === '') return worksites.length;
    return worksites.filter((worksite) => worksite.projects.some((project) => project.status === value)).length;
  }, [worksites]);

  const kpis = useMemo(() => {
    const active = worksites.filter((worksite) => worksite.projects.some((project) => project.status === 'in_progress')).length;
    const planned = worksites.filter((worksite) => worksite.projects.some((project) => project.status === 'planned')).length;
    const completed = worksites.filter((worksite) => worksite.projects.some((project) => project.status === 'completed')).length;
    const totalBudget = worksites.reduce((sum, worksite) => sum + worksite.totalBudget, 0);
    return { active, planned, completed, totalBudget };
  }, [worksites]);

  const handleRegionSelect = useCallback((regionId: RegionId | null) => {
    setSelectedRegionId(regionId);
    setSelectedDepartmentCode(null);
  }, []);

  const handleDepartmentSelect = useCallback((departmentCode: string | null) => {
    setSelectedDepartmentCode(departmentCode);
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-violet-100" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-600 animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Chargement des chantiers...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chantiers</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {worksites.length} chantier{worksites.length !== 1 ? 's' : ''} regroupé{worksites.length !== 1 ? 's' : ''} par adresse
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                Carte
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                Liste
              </button>
            </div>
            <Link href="/projects/new" className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 shadow-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau chantier
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="En cours"
            value={kpis.active}
            sub="sites avec travaux actifs"
            gradient="bg-gradient-to-br from-violet-500 to-violet-600"
            ring="border-violet-100"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>}
          />
          <KPICard
            title="Planifiés"
            value={kpis.planned}
            sub="sites à venir"
            gradient="bg-gradient-to-br from-blue-400 to-blue-500"
            ring="border-blue-100"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>}
          />
          <KPICard
            title="Terminés"
            value={kpis.completed}
            sub="sites clôturés"
            gradient="bg-gradient-to-br from-emerald-400 to-emerald-500"
            ring="border-emerald-100"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
          />
          <KPICard
            title="Budget total"
            value={kpis.totalBudget > 0 ? formatCurrency(kpis.totalBudget) : '—'}
            sub="cumul des projets rattachés"
            gradient="bg-gradient-to-br from-amber-400 to-amber-500"
            ring="border-amber-100"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
          />
        </div>

        <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-violet-50/40 border-b border-violet-100">
            <div>
              <h2 className="text-sm font-semibold text-violet-800">Regroupement intelligent des chantiers</h2>
              <p className="text-xs text-violet-700 mt-0.5">
                5 devis à la même adresse = 1 chantier sur la carte, avec 5 devis rattachés.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-violet-700 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white ring-1 ring-violet-200 font-semibold">
                {quoteWorksites.length} devis non rattaché{quoteWorksites.length > 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white ring-1 ring-violet-200 font-semibold">
                {quoteDerivedWorksitesCount} chantier{quoteDerivedWorksitesCount > 1 ? 's' : ''} issu{quoteDerivedWorksitesCount > 1 ? 's' : ''} des devis
              </span>
            </div>
          </div>
        </div>

        {view === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <FranceMap
                worksites={baseFilteredWorksites}
                regionCounts={regionCounts}
                departmentCounts={departmentCounts}
                selectedWorksiteKey={selectedWorksiteKey}
                selectedRegionId={selectedRegionId}
                selectedDepartmentCode={selectedDepartmentCode}
                onSelectWorksite={setSelectedWorksiteKey}
                onSelectRegion={handleRegionSelect}
                onSelectDepartment={handleDepartmentSelect}
              />
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[540px]">
              <div className="px-4 pt-4 pb-2 border-b border-gray-50 flex-shrink-0 space-y-2">
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
                    placeholder="Rechercher un chantier, un devis ou une adresse..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-gray-500">
                    {filteredWorksites.length} résultat{filteredWorksites.length > 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {selectedRegionId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRegionId(null);
                          setSelectedDepartmentCode(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors font-medium"
                      >
                        {REGION_BY_ID[selectedRegionId].label}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                    {selectedDepartmentCode && (
                      <button
                        type="button"
                        onClick={() => setSelectedDepartmentCode(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors font-medium"
                      >
                        {selectedDepartmentCode} · {DEPARTMENT_LABELS[selectedDepartmentCode] ?? 'Département'}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {filteredWorksites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <svg className="w-10 h-10 mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" /></svg>
                    <p className="text-sm">Aucun chantier trouvé</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {filteredWorksites.map((worksite) => {
                      const badge = worksite.dominantStatus ? BADGE[worksite.dominantStatus] ?? BADGE.draft : null;
                      const isActive = selectedWorksiteKey === worksite.key;
                      const totalItems = worksite.projects.length + worksite.quotes.length;
                      const regionLabel = worksite.regionId ? REGION_BY_ID[worksite.regionId].label : 'Région estimée';
                      const primaryLink = getWorksitePrimaryLink(worksite);
                      return (
                        <li
                          key={worksite.key}
                          className={`px-4 py-3 cursor-pointer transition-colors ${isActive ? 'bg-violet-50 border-l-2 border-l-violet-500' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}`}
                          onClick={() => setSelectedWorksiteKey(isActive ? null : worksite.key)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {primaryLink ? (
                                <Link href={primaryLink} className="text-sm font-semibold text-gray-800 hover:text-violet-600 block truncate" onClick={(event) => event.stopPropagation()}>
                                  {worksite.displayName}
                                </Link>
                              ) : (
                                <p className="text-sm font-semibold text-gray-800 truncate">{worksite.displayName}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs">
                                <span className="text-gray-400 truncate">{worksite.customerNames.join(', ') || 'Client non renseigné'}</span>
                                <span className="text-violet-600 truncate max-w-[220px]">{worksite.addressLabel}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">
                                  {totalItems} élément{totalItems > 1 ? 's' : ''}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">
                                  {regionLabel}
                                </span>
                              </div>
                            </div>
                            {badge ? (
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                Devis
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'map' && selectedRegionId && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Départements · {REGION_BY_ID[selectedRegionId].label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un département pour filtrer les chantiers.</p>
              </div>
              <span className="text-xs font-medium text-gray-500">
                {(REGION_BY_ID[selectedRegionId].departments?.length || 0)} département{(REGION_BY_ID[selectedRegionId].departments?.length || 0) > 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {REGION_BY_ID[selectedRegionId].departments.map((depCode) => {
                const isActive = selectedDepartmentCode === depCode;
                const count = departmentCounts[depCode] ?? 0;
                return (
                  <button
                    key={depCode}
                    type="button"
                    onClick={() => setSelectedDepartmentCode(isActive ? null : depCode)}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${isActive ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center justify-center min-w-8 h-8 rounded-lg text-xs font-bold ${isActive ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {depCode}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">{count}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-2 line-clamp-2">{DEPARTMENT_LABELS[depCode]}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'map' && selectedWorksite && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedWorksite.displayName}</h3>
                <p className="text-sm text-violet-600 mt-0.5">{selectedWorksite.addressLabel}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedWorksite.customerNames.join(', ') || 'Client non renseigné'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {getWorksitePrimaryLink(selectedWorksite) && (
                  <Link href={getWorksitePrimaryLink(selectedWorksite) ?? '#'} className="px-3 py-1.5 text-xs font-medium bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors">
                    Ouvrir le dossier principal
                  </Link>
                )}
                {getWorksiteEditLink(selectedWorksite) && (
                  <Link href={getWorksiteEditLink(selectedWorksite) ?? '#'} className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    Modifier le chantier
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] uppercase text-gray-400 font-semibold">Région</p>
                <p className="text-sm font-medium text-gray-700">{selectedWorksite.regionId ? REGION_BY_ID[selectedWorksite.regionId].label : 'À estimer'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] uppercase text-gray-400 font-semibold">Département</p>
                <p className="text-sm font-medium text-gray-700">{selectedWorksite.departmentCode ? `${selectedWorksite.departmentCode} · ${DEPARTMENT_LABELS[selectedWorksite.departmentCode] ?? 'Département'}` : '—'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] uppercase text-gray-400 font-semibold">Projets</p>
                <p className="text-sm font-medium text-gray-700">{selectedWorksite.projects.length}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] uppercase text-gray-400 font-semibold">Devis</p>
                <p className="text-sm font-medium text-gray-700">{selectedWorksite.quotes.length}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] uppercase text-gray-400 font-semibold">Budget</p>
                <p className="text-sm font-medium text-gray-700">{selectedWorksite.totalBudget > 0 ? formatCurrency(selectedWorksite.totalBudget) : '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800">Projets rattachés</h4>
                  <span className="text-xs text-gray-500">{selectedWorksite.projects.length}</span>
                </div>
                {selectedWorksite.projects.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-400">Aucun projet créé pour cette adresse.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {selectedWorksite.projects.map((project) => {
                      const badge = BADGE[project.status] ?? BADGE.draft;
                      return (
                        <div key={project.id} className="px-4 py-3 flex items-start justify-between gap-3">
                          <div>
                            <Link href={buildDetailPath('projects', project.id)} className="text-sm font-semibold text-gray-900 hover:text-violet-600">
                              {project.name}
                            </Link>
                            <p className="text-xs text-gray-500 mt-0.5">{getCustomerName(project.customer_id)}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800">Devis rattachés</h4>
                  <span className="text-xs text-gray-500">{selectedWorksite.quotes.length}</span>
                </div>
                {selectedWorksite.quotes.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-400">Aucun devis en attente sur cette adresse.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {selectedWorksite.quotes.map((quote) => (
                      <div key={quote.id} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div>
                          <Link href={buildDetailPath('quotes', quote.id)} className="text-sm font-semibold text-gray-900 hover:text-violet-600">
                            {quote.reference}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">{getCustomerName(quote.customer_id ?? quote.customerId)}</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          Devis
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 border-b border-gray-100 gap-4">
              <div className="flex gap-0.5 overflow-x-auto">
                {TABS.map((item) => {
                  const active = tab === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setTab(item.value)}
                      className={`flex flex-col items-center px-3 py-2 border-b-2 transition-colors ${active ? `border-current ${item.color}` : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                      <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                      <span className={`text-[10px] font-semibold mt-0.5 ${active ? '' : 'text-gray-400'}`}>{countByTab(item.value)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="w-64 pb-2">
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
                    placeholder="Recherche..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredWorksites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" /></svg>
                </div>
                <p className="text-sm font-medium text-gray-500">Aucun chantier trouvé</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Chantier</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Clients</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Région / Adresse</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Dates</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Budget</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredWorksites.map((worksite) => {
                    const badge = worksite.dominantStatus ? BADGE[worksite.dominantStatus] ?? BADGE.draft : null;
                    const primaryLink = getWorksitePrimaryLink(worksite);
                    const editLink = getWorksiteEditLink(worksite);
                    const totalItems = worksite.projects.length + worksite.quotes.length;
                    return (
                      <tr key={worksite.key} className="group hover:bg-violet-50/30 transition-colors">
                        <td className="px-5 py-4">
                          {primaryLink ? (
                            <Link href={primaryLink} className="text-sm font-semibold text-gray-900 hover:text-violet-600 transition-colors">
                              {worksite.displayName}
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold text-gray-900">{worksite.displayName}</span>
                          )}
                          <p className="text-xs text-gray-400 truncate max-w-[260px] mt-0.5">
                            {worksite.projects.length} projet{worksite.projects.length > 1 ? 's' : ''} · {worksite.quotes.length} devis · {totalItems} élément{totalItems > 1 ? 's' : ''}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">{worksite.customerNames.join(', ') || '—'}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-violet-700">{worksite.regionId ? REGION_BY_ID[worksite.regionId].label : 'Région estimée'}</span>
                            <span className="text-sm text-gray-600 truncate max-w-[240px]">{worksite.addressLabel}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {badge ? (
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                              Devis
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm text-gray-600">{worksite.earliestStartDate ? formatDate(worksite.earliestStartDate) : '—'}</div>
                          {worksite.latestEndDate && <div className="text-xs text-gray-400 mt-0.5">→ {formatDate(worksite.latestEndDate)}</div>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {worksite.totalBudget > 0 ? <span className="text-sm font-semibold text-gray-800">{formatCurrency(worksite.totalBudget)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {primaryLink && <Link href={primaryLink} className="px-2.5 py-1 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors">Voir</Link>}
                            {editLink && <Link href={editLink} className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">Modifier</Link>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
