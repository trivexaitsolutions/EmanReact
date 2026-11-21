import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { API_URL } from '../constants/api';
import { translate } from './translations';

export type AppLanguage = { code: string; name: string; nativeName: string; isDefault?: boolean };
type Catalog = Record<string, string>;
type CacheRecord = { version: string; translations: Catalog };
type I18nContextValue = {
  language: string;
  languages: AppLanguage[];
  ready: boolean;
  setLanguage: (next: string) => Promise<void>;
  refreshLanguages: () => Promise<void>;
  // Always check the selected catalog's version, e.g. after successful login.
  refreshTranslations: () => Promise<void>;
  t: (english: string) => string;
  entityText: (type: string, entity: any, field?: string) => string;
};

export const BASE_LANGUAGES: AppLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', isDefault: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
];
const LANGUAGE_KEY = '@eman:language:v1';
// Includes API URL so local development and live server never share a catalog.
const CACHE_PREFIX = `@eman:i18n:catalog:v2:${encodeURIComponent(API_URL)}:`;
const languageCodePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const PUBLIC_KEY = /^(SKILL|NAKA|CITY|STATE):\d+:[a-zA-Z]+$/;
const FOREGROUND_REFRESH_MS = 5 * 60 * 1000;
const I18nContext = createContext<I18nContextValue | null>(null);

async function fetchJson(url: string, ms = 7000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseLanguages(data: any): AppLanguage[] {
  if (!data?.success || !Array.isArray(data.languages)) throw new Error('Invalid languages response');
  const unique = new Map<string, AppLanguage>();
  for (const item of data.languages) {
    if (!languageCodePattern.test(String(item.code || '')) || item.isActive === false) continue;
    unique.set(item.code, {
      code: item.code, name: String(item.name || item.code),
      nativeName: String(item.nativeName || item.name || item.code), isDefault: item.code === 'en',
    });
  }
  if (!unique.has('en')) unique.set('en', BASE_LANGUAGES[0]);
  return [...unique.values()].sort((a, b) => (a.code === 'en' ? -1 : b.code === 'en' ? 1 : 0));
}

function normalizeCatalog(input: unknown): Catalog {
  const values: Catalog = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return values;
  for (const [key, value] of Object.entries(input)) {
    if (PUBLIC_KEY.test(key) && typeof value === 'string' && value.trim()) values[key] = value;
  }
  return values;
}

async function readCachedCatalog(language: string): Promise<CacheRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${language}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.version !== 'string' || !parsed.translations ||
      typeof parsed.translations !== 'object' || Array.isArray(parsed.translations)) return null;
    return { version: parsed.version, translations: normalizeCatalog(parsed.translations) };
  } catch (_) { return null; }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState('en');
  const [languages, updateLanguages] = useState<AppLanguage[]>(BASE_LANGUAGES);
  const [catalogs, updateCatalogs] = useState<Record<string, Catalog>>({});
  const [ready, setReady] = useState(false);
  const languageRef = useRef('en');
  const pendingChecks = useRef(new Map<string, Promise<void>>());
  const lastActiveCheck = useRef(0);

  const refreshLanguages = useCallback(async () => {
    try {
      const json = await fetchJson(`${API_URL}/i18n/languages`);
      const active = parseLanguages(json);
      updateLanguages(active);
      if (!active.some(item => item.code === languageRef.current)) {
        languageRef.current = 'en';
        updateLanguage('en');
        await AsyncStorage.setItem(LANGUAGE_KEY, 'en');
      }
    } catch (_) {
      // Offline or old backend: keep the three built-in languages available.
      console.info('[i18n] Language API unavailable; using local defaults.');
    }
  }, []);

  const checkCatalog = useCallback((code: string): Promise<void> => {
    if (code === 'en' || !languageCodePattern.test(code)) return Promise.resolve();
    const existing = pendingChecks.current.get(code);
    if (existing) return existing;
    const job = (async () => {
      const cached = await readCachedCatalog(code);
      // Show previously downloaded translations immediately, even when offline.
      if (cached) updateCatalogs(prev => ({ ...prev, [code]: cached.translations }));
      try {
        const meta = await fetchJson(`${API_URL}/i18n/version?language=${encodeURIComponent(code)}`);
        if (!meta?.success || meta.language !== code || typeof meta.version !== 'string') {
          throw new Error('Invalid translation version');
        }
        if (cached && cached.version === meta.version) return; // Zero catalog downloads for unchanged data.
        const response = await fetchJson(`${API_URL}/i18n/catalog?language=${encodeURIComponent(code)}`);
        if (!response?.success || response.language !== code || !response.translations ||
          Array.isArray(response.translations)) throw new Error('Invalid translation catalog');
        const next = normalizeCatalog(response.translations);
        // Catalog response can be newer than the version check if Admin publishes mid-request.
        const version = typeof response.version === 'string' ? response.version : meta.version;
        await AsyncStorage.setItem(`${CACHE_PREFIX}${code}`, JSON.stringify({ version, translations: next }));
        updateCatalogs(prev => ({ ...prev, [code]: next }));
      } catch (_) {
        // Do not discard valid previously cached translations on network failure.
        // If this is an older backend without /version, still support /catalog.
        if (cached) return;
        try {
          const response = await fetchJson(`${API_URL}/i18n/catalog?language=${encodeURIComponent(code)}`);
          if (!response?.success || response.language !== code || !response.translations || Array.isArray(response.translations)) return;
          const next = normalizeCatalog(response.translations);
          // Legacy catalogs have no version: next launch checks and downloads again.
          const version = typeof response.version === 'string' ? response.version : '';
          await AsyncStorage.setItem(`${CACHE_PREFIX}${code}`, JSON.stringify({ version, translations: next }));
          updateCatalogs(prev => ({ ...prev, [code]: next }));
        } catch (_) { /* offline: original entity name is displayed */ }
      }
    })();
    const tracked = job.finally(() => { pendingChecks.current.delete(code); });
    pendingChecks.current.set(code, tracked);
    return tracked;
  }, []);

  // Invoked explicitly after Customer OTP verification or Worker login.
  const refreshTranslations = useCallback(async () => {
    lastActiveCheck.current = Date.now();
    await checkCatalog(languageRef.current);
  }, [checkCatalog]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (mounted && saved && languageCodePattern.test(saved)) {
          languageRef.current = saved;
          updateLanguage(saved);
        }
      } catch (_) { /* default English */ }
      if (mounted) setReady(true);
      // Fresh app launch always checks server version for the selected language.
      lastActiveCheck.current = Date.now();
      void checkCatalog(languageRef.current);
      void refreshLanguages();
    })();
    return () => { mounted = false; };
  }, [checkCatalog, refreshLanguages]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastActiveCheck.current < FOREGROUND_REFRESH_MS) return;
      lastActiveCheck.current = now;
      void refreshLanguages();
      void checkCatalog(languageRef.current);
    });
    return () => subscription.remove();
  }, [checkCatalog, refreshLanguages]);

  const setLanguage = useCallback(async (next: string) => {
    if (!languages.some(item => item.code === next)) return;
    languageRef.current = next;
    updateLanguage(next);
    await AsyncStorage.setItem(LANGUAGE_KEY, next);
    // Load the selected language's saved catalog and verify its version.
    lastActiveCheck.current = Date.now();
    void checkCatalog(next);
  }, [languages, checkCatalog]);

  const t = useCallback((english: string) => translate(language, english), [language]);
  const entityText = useCallback((type: string, entity: any, field = 'name'): string => {
    if (!entity) return '';
    const original = String(entity[field] ?? '');
    const id = Number(entity.id);
    if (language === 'en' || !Number.isSafeInteger(id) || id < 1) return original;
    const key = `${type.toUpperCase()}:${id}:${field}`;
    return catalogs[language]?.[key] || original;
  }, [catalogs, language]);

  const value = useMemo(() => ({ language, languages, ready, setLanguage, refreshLanguages, refreshTranslations, t, entityText }),
    [language, languages, ready, setLanguage, refreshLanguages, refreshTranslations, t, entityText]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be inside I18nProvider');
  return context;
}
