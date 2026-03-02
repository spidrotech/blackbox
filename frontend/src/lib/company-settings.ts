export interface CompanySettingsData {
  id?: number;
  name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  siret?: string;
  vat_number?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  iban?: string;
  bic?: string;
  rcs_city?: string;
  capital?: number;
  legal_mentions?: string;
  default_conditions?: string;
  default_payment_terms?: string;
}

export interface DocumentCompany {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  siret?: string;
  vatNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  iban?: string;
  bic?: string;
  rcsCity?: string;
  capital?: number;
  legalMentions?: string;
  defaultConditions?: string;
  defaultPaymentTerms?: string;
}

export interface DocumentDefaults {
  conditions: string;
  paymentTerms: string;
  bankDetails: string;
  legalMentions: string;
}

export const mapCompanySettingsToDocumentCompany = (
  company: CompanySettingsData | null | undefined
): DocumentCompany | null => {
  if (!company) return null;
  return {
    name: company.name,
    address: company.address,
    city: company.city,
    postalCode: company.postal_code,
    siret: company.siret,
    vatNumber: company.vat_number,
    phone: company.phone,
    email: company.email,
    website: company.website,
    logoUrl: company.logo_url,
    iban: company.iban,
    bic: company.bic,
    rcsCity: company.rcs_city,
    capital: company.capital,
    legalMentions: company.legal_mentions,
    defaultConditions: company.default_conditions,
    defaultPaymentTerms: company.default_payment_terms,
  };
};

export const getDocumentDefaultsFromCompany = (
  company: CompanySettingsData | null | undefined
): DocumentDefaults => {
  const conditions = (company?.default_conditions || '').trim();
  const paymentTerms = (company?.default_payment_terms || '').trim();
  const legalMentions = (company?.legal_mentions || '').trim();
  const bankDetails = company?.iban
    ? `IBAN : ${company.iban}${company.bic ? `\nBIC : ${company.bic}` : ''}`
    : '';

  return {
    conditions,
    paymentTerms,
    bankDetails,
    legalMentions,
  };
};
