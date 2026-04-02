// ui/src/providers/LocaleProvider.tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { getUserPreferences, updateUserPreferences } from "@/api/userPreferences";
import { type Locale, tr } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "ko",
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

  // Sync locale from server preferences
  useEffect(() => {
    if (prefs?.locale) {
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

  const t = useCallback((key: string) => tr(key, locale), [locale]);

  return (
    <LocaleContext value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
