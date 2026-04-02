// ui/src/providers/LocaleProvider.tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { getUserPreferences, updateUserPreferences } from "@/api/userPreferences";
import { translate, type Locale } from "@/lib/i18n/index";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a key. Supports {param} interpolation. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [locale, setLocaleState] = useState<Locale>("en");

  const { data: prefs } = useQuery({
    queryKey: queryKeys.userPreferences.all,
    queryFn: getUserPreferences,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (prefs?.locale && (prefs.locale === "ko" || prefs.locale === "en")) {
      setLocaleState(prefs.locale as Locale);
    }
  }, [prefs?.locale]);

  const mutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userPreferences.all });
    },
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    mutation.mutate({ locale: newLocale });
  }, [mutation]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(key, locale, params),
    [locale],
  );

  return (
    <LocaleContext value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
