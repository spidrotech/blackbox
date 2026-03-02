'use client';

import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { FormField } from './FormField';
import { SelectOption } from './Select';

export interface FormConfig<T> {
  fields: Array<{
    name: keyof T;
    label: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'textarea' | 'select';
    placeholder?: string;
    required?: boolean;
    options?: SelectOption[];
    hint?: string;
    rows?: number;
  }>;
}

export interface FormBuilderProps<T extends Record<string, unknown>> {
  title: string;
  config: FormConfig<T>;
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitText?: string;
}

export function FormBuilder<T extends Record<string, unknown>>({
  title,
  config,
  data,
  errors,
  touched,
  isSubmitting,
  onChange,
  onSubmit,
  submitText = 'Soumettre',
}: FormBuilderProps<T>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {config.fields.map((field) => {
              const rawValue = data[field.name as keyof T];
              const normalizedValue: string | number | readonly string[] | undefined =
                typeof rawValue === 'string' || typeof rawValue === 'number'
                  ? rawValue
                  : Array.isArray(rawValue)
                    ? rawValue.map((value) => String(value))
                    : '';

              return (
                <div key={String(field.name)} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <FormField
                    label={field.label}
                    name={String(field.name)}
                    type={field.type || 'text'}
                    value={normalizedValue}
                    onChange={onChange}
                    error={errors[field.name]}
                    touched={touched[field.name]}
                    placeholder={field.placeholder}
                    options={field.options}
                    required={field.required}
                    hint={field.hint}
                    rows={field.rows}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-6 border-t">
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {submitText}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
