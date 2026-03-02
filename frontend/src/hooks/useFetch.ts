import { useState, useEffect, useCallback } from 'react';

export interface UseFetchState<T> {
  data: T | null;
  items: T[] | null;
  loading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  items?: T[];
  error?: string;
}

export function useFetch<T>(
  fetchFn: () => Promise<ApiResponse<T> | ApiResponse<T[]>>,
  dependencies: React.DependencyList = []
) {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    items: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchFn();

      if (response.success) {
        if (Array.isArray(response.data)) {
          setState({
            data: null,
            items: response.data as T[],
            loading: false,
            error: null,
          });
        } else {
          setState({
            data: (response.data as T) || null,
            items: null,
            loading: false,
            error: null,
          });
        }
      } else {
        setState({
          data: null,
          items: null,
          loading: false,
          error: response.error || 'Une erreur est survenue',
        });
      }
    } catch (error) {
      setState({
        data: null,
        items: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }, [fetchFn]);

  const dependencyKey = JSON.stringify(dependencies);

  useEffect(() => {
    queueMicrotask(() => {
      void refetch();
    });
  }, [refetch, dependencyKey]);

  return { ...state, refetch };
}
