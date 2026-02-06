// Validators for form fields
export const validators = {
  email: (value: string): string | undefined => {
    if (!value) return 'Email requis';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Email invalide';
    return undefined;
  },

  required: (value: any): string | undefined => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'Ce champ est requis';
    }
    return undefined;
  },

  minLength: (min: number) => (value: string): string | undefined => {
    if (value && value.length < min) {
      return `Minimum ${min} caractères`;
    }
    return undefined;
  },

  maxLength: (max: number) => (value: string): string | undefined => {
    if (value && value.length > max) {
      return `Maximum ${max} caractères`;
    }
    return undefined;
  },

  minValue: (min: number) => (value: number): string | undefined => {
    if (value !== undefined && value !== null && value < min) {
      return `La valeur doit être au minimum ${min}`;
    }
    return undefined;
  },

  maxValue: (max: number) => (value: number): string | undefined => {
    if (value !== undefined && value !== null && value > max) {
      return `La valeur doit être au maximum ${max}`;
    }
    return undefined;
  },

  phone: (value: string): string | undefined => {
    if (!value) return undefined;
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      return 'Numéro de téléphone invalide';
    }
    return undefined;
  },

  password: (value: string): string | undefined => {
    if (!value) return 'Mot de passe requis';
    if (value.length < 8) return 'Au minimum 8 caractères';
    if (!/[A-Z]/.test(value)) return 'Doit contenir une majuscule';
    if (!/[0-9]/.test(value)) return 'Doit contenir un chiffre';
    return undefined;
  },

  siret: (value: string): string | undefined => {
    if (!value) return undefined;
    if (!/^\d{14}$/.test(value.replace(/\s/g, ''))) {
      return 'SIRET invalide (14 chiffres)';
    }
    return undefined;
  },

  url: (value: string): string | undefined => {
    if (!value) return undefined;
    try {
      new URL(value);
      return undefined;
    } catch {
      return 'URL invalide';
    }
  },
};

// Combined validators
export const combinedValidators = {
  required: (value: any) => validators.required(value),
  email: (value: string) => validators.email(value),
  phone: (value: string) => validators.phone(value),
  password: (value: string) => validators.password(value),
  siret: (value: string) => validators.siret(value),
  url: (value: string) => validators.url(value),
};
