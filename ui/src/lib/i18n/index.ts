// ui/src/lib/i18n/index.ts
import ko from "./ko.js";
import en from "./en.js";

export type Locale = "ko" | "en";
export type TranslationKey = keyof typeof en;

const messages: Record<Locale, Record<string, string>> = { ko, en };

/**
 * Returns a translated string. Supports interpolation with {key} syntax.
 * @example t("settings.pauseResult", "ko", { agents: 3, tasks: 2 })
 */
export function translate(key: string, locale: Locale, params?: Record<string, string | number>): string {
  const val = messages[locale]?.[key] ?? messages.en[key] ?? key;
  if (!params) return val;
  return val.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}
