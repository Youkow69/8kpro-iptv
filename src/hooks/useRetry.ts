import { useState, useCallback } from 'react';

interface RetryState {
  error: string | null;
  retrying: boolean;
}

export function useRetry() {
  const [state, setState] = useState<RetryState>({ error: null, retrying: false });

  const execute = useCallback(async <T>(
    fn: () => Promise<T>,
    { maxRetries = 2, delay = 1500 } = {}
  ): Promise<T> => {
    setState({ error: null, retrying: false });
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          setState({ error: null, retrying: true });
          await new Promise((r) => setTimeout(r, delay * attempt));
        }
        const result = await fn();
        setState({ error: null, retrying: false });
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    const msg = lastError?.message?.includes('402')
      ? 'Serveur IPTV indisponible'
      : lastError?.message?.includes('Network')
        ? 'Erreur réseau — vérifiez votre connexion'
        : 'Erreur de chargement';
    setState({ error: msg, retrying: false });
    throw lastError;
  }, []);

  const clearError = useCallback(() => setState({ error: null, retrying: false }), []);

  return { ...state, execute, clearError };
}
