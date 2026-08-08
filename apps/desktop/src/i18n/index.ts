import { useEffect } from "react";

import { setFormattingPreferences } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings";
import type { AppLanguage } from "@/types";
import { en, type TranslationKey } from "./languages/en";

export type { TranslationKey } from "./languages/en";

export interface LanguageDefinition {
	code: string;
	name: string;
	nativeName: string;
}

type Dictionary = Record<TranslationKey, string>;
type Variables = Record<string, string | number>;

/*
 * Every file in ./languages defines `export const $ = {code, name, nativeName}`
 * plus a dictionary export named after the code (en.ts → `en`, tr.ts → `tr`).
 * Dropping a new file into the folder is all it takes to add a language.
 */
const modules = import.meta.glob<Record<string, unknown>>("./languages/*.ts", {
	eager: true,
});

const dictionaries = new Map<string, Dictionary>();
const definitions: LanguageDefinition[] = [];
for (const mod of Object.values(modules)) {
	const meta = mod.$ as LanguageDefinition | undefined;
	if (!meta?.code) continue;
	const dictionary = mod[meta.code] as Dictionary | undefined;
	if (!dictionary) continue;
	definitions.push(meta);
	dictionaries.set(meta.code, dictionary);
}

export const LANGUAGES: LanguageDefinition[] = definitions.sort((a, b) =>
	a.code.localeCompare(b.code),
);

export type ResolvedLanguage = string;

let activeLanguage: ResolvedLanguage = "en";

function resolveLanguage(preference: AppLanguage): ResolvedLanguage {
	if (preference !== "system" && dictionaries.has(preference)) {
		return preference;
	}
	const wanted = navigator.language.toLowerCase();
	for (const { code } of LANGUAGES) {
		const lower = code.toLowerCase();
		if (wanted === lower || wanted.startsWith(`${lower}-`)) return code;
	}
	return "en";
}

function setLanguagePreference(preference: AppLanguage): ResolvedLanguage {
	activeLanguage = resolveLanguage(preference);
	return activeLanguage;
}

export function translate(key: TranslationKey, variables?: Variables): string {
	// Incomplete dictionaries fall back to English per key.
	const template = dictionaries.get(activeLanguage)?.[key] ?? en[key];
	if (!variables) return template;
	return template.replace(/\{(\w+)\}/g, (match, name: string) => {
		const value = variables[name];
		return value === undefined ? match : String(value);
	});
}

export function useLocalization() {
	const languagePreference = useSettingsStore(
		(state) => state.settings?.language ?? "system",
	);
	const timeZone = useSettingsStore(
		(state) => state.settings?.timeZone ?? "system",
	);
	const language = setLanguagePreference(languagePreference);
	setFormattingPreferences(languagePreference, timeZone);

	useEffect(() => {
		document.documentElement.lang = language;
	}, [language]);
}

export function useTranslation() {
	const languagePreference = useSettingsStore(
		(state) => state.settings?.language ?? "system",
	);
	const language = setLanguagePreference(languagePreference);
	const t = (key: TranslationKey, variables?: Variables) =>
		translate(key, variables);
	return { language, t };
}
