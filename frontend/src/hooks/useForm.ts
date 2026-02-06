import { useState, useCallback } from 'react';

export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

export function useForm<T extends Record<string, any>>(
  initialData: T,
  onSubmit: (data: T) => Promise<void>,
  onSuccess?: () => void,
  validators?: Partial<Record<keyof T, (value: any) => string | undefined>>
) {
  const [state, setState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    touched: {},
    isSubmitting: false,
  });

  const validateField = useCallback(
    (name: keyof T, value: any) => {
      if (validators?.[name]) {
        return validators[name]!(value);
      }
      return undefined;
    },
    [validators]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const fieldName = name as keyof T;

      setState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          [fieldName]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        },
        touched: {
          ...prev.touched,
          [fieldName]: true,
        },
      }));

      const error = validateField(fieldName, value);
      setState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          [fieldName]: error,
        },
      }));
    },
    [validateField]
  );

  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        [name]: value,
      },
    }));

    const error = validateField(name, value);
    setState((prev) => ({
      ...prev,
      errors: {
        ...prev.errors,
        [name]: error,
      },
    }));
  }, [validateField]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Valider tous les champs
      const newErrors: Partial<Record<keyof T, string>> = {};
      Object.keys(state.data).forEach((key) => {
        const fieldName = key as keyof T;
        const error = validateField(fieldName, state.data[fieldName]);
        if (error) {
          newErrors[fieldName] = error;
        }
      });

      if (Object.keys(newErrors).length > 0) {
        setState((prev) => ({
          ...prev,
          errors: newErrors,
        }));
        return;
      }

      setState((prev) => ({ ...prev, isSubmitting: true }));

      try {
        await onSubmit(state.data);
        onSuccess?.();
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setState((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [state.data, validateField, onSubmit, onSuccess]
  );

  const reset = useCallback(() => {
    setState({
      data: initialData,
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  }, [initialData]);

  return {
    ...state,
    handleChange,
    setFieldValue,
    handleSubmit,
    reset,
  };
}
