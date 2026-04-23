import type {
  NotebookLmAuthPayload,
  NotebookLmCookieValidationResponse,
} from './notebookLMService';

export const NOTEBOOK_COOKIE_RAW_STORAGE_KEY = 'myma.notebooklm.cookies.raw';
export const NOTEBOOK_COOKIE_AUTH_STORAGE_KEY = 'myma.notebooklm.cookies.auth';
export const NOTEBOOK_COOKIE_VALIDATION_STORAGE_KEY = 'myma.notebooklm.cookies.validation';
export const NOTEBOOK_SELECTED_NOTEBOOK_STORAGE_KEY = 'myma.notebooklm.selected_notebook';

export interface StoredSelectedNotebook {
  id: string;
  nombre: string;
  notebook_id: string;
}

export const readStoredSelectedNotebook = (): StoredSelectedNotebook | null => {
  try {
    const raw = localStorage.getItem(NOTEBOOK_SELECTED_NOTEBOOK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSelectedNotebook;
    if (!parsed?.id || !parsed.notebook_id) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeStoredSelectedNotebook = (
  value: StoredSelectedNotebook | null
): void => {
  try {
    if (value) {
      localStorage.setItem(
        NOTEBOOK_SELECTED_NOTEBOOK_STORAGE_KEY,
        JSON.stringify(value)
      );
    } else {
      localStorage.removeItem(NOTEBOOK_SELECTED_NOTEBOOK_STORAGE_KEY);
    }
  } catch {
    /* noop */
  }
};

export const readStoredNotebookLmRawCookies = (): string => {
  try {
    return localStorage.getItem(NOTEBOOK_COOKIE_RAW_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const writeStoredNotebookLmRawCookies = (raw: string): void => {
  try {
    localStorage.setItem(NOTEBOOK_COOKIE_RAW_STORAGE_KEY, raw);
  } catch {
    /* noop */
  }
};

export const readStoredNotebookLmAuthPayload = (): NotebookLmAuthPayload | null => {
  try {
    const raw = localStorage.getItem(NOTEBOOK_COOKIE_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NotebookLmAuthPayload;
    if (!parsed || typeof parsed !== 'object' || !parsed.cookies) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeStoredNotebookLmAuthPayload = (
  payload: NotebookLmAuthPayload | null
): void => {
  try {
    if (payload) {
      localStorage.setItem(NOTEBOOK_COOKIE_AUTH_STORAGE_KEY, JSON.stringify(payload));
    } else {
      localStorage.removeItem(NOTEBOOK_COOKIE_AUTH_STORAGE_KEY);
    }
  } catch {
    /* noop */
  }
};

export const writeStoredNotebookLmValidation = (
  validation: NotebookLmCookieValidationResponse | null
): void => {
  try {
    if (validation) {
      localStorage.setItem(
        NOTEBOOK_COOKIE_VALIDATION_STORAGE_KEY,
        JSON.stringify(validation)
      );
    } else {
      localStorage.removeItem(NOTEBOOK_COOKIE_VALIDATION_STORAGE_KEY);
    }
  } catch {
    /* noop */
  }
};

export const readStoredNotebookLmValidation =
  (): NotebookLmCookieValidationResponse | null => {
    try {
      const raw = localStorage.getItem(NOTEBOOK_COOKIE_VALIDATION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as NotebookLmCookieValidationResponse;
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  };

export const clearStoredNotebookLmState = (): void => {
  try {
    localStorage.removeItem(NOTEBOOK_COOKIE_RAW_STORAGE_KEY);
    localStorage.removeItem(NOTEBOOK_COOKIE_AUTH_STORAGE_KEY);
    localStorage.removeItem(NOTEBOOK_COOKIE_VALIDATION_STORAGE_KEY);
  } catch {
    /* noop */
  }
};
