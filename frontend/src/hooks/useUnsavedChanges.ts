'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

type UseUnsavedChangesOptions = {
  message?: string;
};

const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = normalizeValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
};

const serializeValue = (value: unknown): string => JSON.stringify(normalizeValue(value));

export function useUnsavedChanges<T>(
  value: T,
  options?: UseUnsavedChangesOptions,
): {
  isDirty: boolean;
  captureBaseline: (nextValue?: T) => void;
  confirmIfDirty: () => boolean;
} {
  const message = options?.message ?? 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter cette page ?';
  const baselineSnapshotRef = useRef<string | null>(null);
  const currentSnapshot = useMemo(() => serializeValue(value), [value]);

  const isDirty = baselineSnapshotRef.current !== null && baselineSnapshotRef.current !== currentSnapshot;

  const captureBaseline = useCallback((nextValue?: T) => {
    baselineSnapshotRef.current = serializeValue(nextValue ?? value);
  }, [value]);

  const confirmIfDirty = useCallback(() => {
    if (!isDirty) {
      return true;
    }

    return window.confirm(message);
  }, [isDirty, message]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  return {
    isDirty,
    captureBaseline,
    confirmIfDirty,
  };
}