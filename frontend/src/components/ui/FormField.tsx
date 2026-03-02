'use client';

import { Input } from './Input';
import { Select, SelectOption } from './Select';

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'textarea' | 'select';
  value: string | number | readonly string[] | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string;
  touched?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  hint?: string;
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  touched,
  placeholder,
  options = [],
  required,
  disabled,
  rows,
  hint,
}: FormFieldProps) {
  const showError = touched && error;

  if (type === 'select') {
    return (
      <Select
        label={label}
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        error={showError ? error : undefined}
        required={required}
        disabled={disabled}
      />
    );
  }

  if (type === 'textarea') {
    return (
      <div className="space-y-1">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows || 4}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            showError ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        />
        {showError && <p className="text-red-500 text-sm">{error}</p>}
        {hint && !showError && <p className="text-gray-500 text-sm">{hint}</p>}
      </div>
    );
  }

  return (
    <Input
      label={label}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      error={showError ? error : undefined}
      required={required}
      disabled={disabled}
      helperText={hint}
    />
  );
}
