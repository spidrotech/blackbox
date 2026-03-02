import { useState, useCallback } from 'react';

export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

export function useForm<T extends Record<string, unknown>>(
  initialData: T,
  onSubmit: (data: T) => Promise<void>,
  onSuccess?: () => void,
  validators?: Partial<Record<keyof T, (value: unknown) => string | undefined>>
) {
  const [state, setState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    touched: {},
    isSubmitting: false,
  });

  const validateField = useCallback(
    (name: keyof T, value: unknown) => {
      if (validators?.[name]) {
        return validators[name]!(value);
      }
      return undefined;
    },
    [validators]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const target = e.target;
      const { name } = target;
      const fieldName = name as keyof T;
      const nextValue: unknown =
        target instanceof HTMLInputElement && target.type === 'checkbox'
          ? target.checked
          : target.value;

      setState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          [fieldName]: nextValue,
        },
        touched: {
          ...prev.touched,
          [fieldName]: true,
        },
      }));

      const error = validateField(fieldName, nextValue);
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

  const setFieldValue = useCallback((name: keyof T, value: unknown) => {
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
