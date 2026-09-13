import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en } from "@/i18n/en";
import { tr } from "@/i18n/tr";

export const DICTIONARIES = { en, tr };
export const LOCALES = ["en", "tr"];
export const DEFAULT_LOCALE = "en";
export const STORAGE_KEY = "nexthive.locale";

/* Replaces {name} placeholders in a translated string. */
export function fmt(template, values = {}) {
  return Object.keys(values).reduce(
    (out, key) => out.split(`{${key}}`).join(String(values[key])),
    template,
  );
}

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  t: DICTIONARIES[DEFAULT_LOCALE],
  setLocale: () => {},
});

function readStoredLocale() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && LOCALES.includes(stored)) return stored;
  } catch {
    /* private mode / blocked storage — fall through to detection */
  }
  const preferred = (navigator.languages || [navigator.language || ""])
    .map((tag) => String(tag).toLowerCase().split("-")[0])
    .find((tag) => LOCALES.includes(tag));
  return preferred ?? DEFAULT_LOCALE;
}

/*
 * The site is statically rendered in the default locale and switched on the
 * client, so the first paint always matches the server markup.
 */
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = DICTIONARIES[locale].htmlLang;
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (!LOCALES.includes(next)) return;
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* preference simply does not persist */
    }
  }, []);

  const value = useMemo(
    () => ({ locale, t: DICTIONARIES[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
