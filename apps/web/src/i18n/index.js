import { useRouter } from "next/router";
import { en } from "@/i18n/en";
import { tr } from "@/i18n/tr";

export const DICTIONARIES = { en, tr };
export const LOCALES = ["en", "tr"];
export const DEFAULT_LOCALE = "en";
/* Next.js reads this cookie to honour an explicit choice over Accept-Language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/* Replaces {name} placeholders in a translated string. */
export function fmt(template, values = {}) {
  return Object.keys(values).reduce(
    (out, key) => out.split(`{${key}}`).join(String(values[key])),
    template,
  );
}

/*
 * The active locale comes from the URL (`/` for English, `/tr` for Turkish),
 * so every page renders in the right language on the server — no flash, and
 * each language has its own crawlable address.
 */
export function useI18n() {
  const { locale, defaultLocale } = useRouter();
  const active = LOCALES.includes(locale)
    ? locale
    : (defaultLocale ?? DEFAULT_LOCALE);
  return { locale: active, t: DICTIONARIES[active] };
}
