import { useEffect, useState } from 'react';
import {
  fetchNotebookLmCredentialsStatus,
  type NotebookLmCredentialsStatusResponse,
} from '../services/notebookLMService';

const NOTEBOOK_AUTH_STATUS_POLL_MS = 5 * 60 * 1000;

const EMPTY_STATUS: NotebookLmCredentialsStatusResponse = {
  has_credentials: false,
  valid: false,
  status: 'missing',
  validated_at: null,
  last_checked_at: null,
  last_used_at: null,
  cookie_names: [],
  days_until_soft_expiry: null,
  last_error: '',
  failure_count: 0,
  keepalive_enabled: false,
};

export const useNotebookLmAuthStatus = (enabled = true) => {
  const [status, setStatus] = useState<NotebookLmCredentialsStatusResponse>(EMPTY_STATUS);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string>('');

  const refresh = async () => {
    if (!enabled) {
      setStatus(EMPTY_STATUS);
      setLoading(false);
      setError('');
      return EMPTY_STATUS;
    }

    setLoading(true);
    try {
      const nextStatus = await fetchNotebookLmCredentialsStatus();
      setStatus(nextStatus);
      setError('');
      return nextStatus;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'No pudimos consultar el estado de NotebookLM.';
      setError(message);
      setStatus(EMPTY_STATUS);
      return EMPTY_STATUS;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setStatus(EMPTY_STATUS);
      setLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const nextStatus = await refresh();
      if (!cancelled) {
        setStatus(nextStatus);
      }
    };

    void run();
    const intervalId = window.setInterval(() => {
      void refresh();
    }, NOTEBOOK_AUTH_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  return {
    status,
    loading,
    error,
    refresh,
  };
};
