import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/api/userPreferences";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeClass(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: prefs } = useQuery({
    queryKey: queryKeys.userPreferences.all,
    queryFn: getUserPreferences,
    staleTime: 5 * 60 * 1000,
  });

  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    getSystemTheme,
  );

  // Sync theme from server preferences
  useEffect(() => {
    if (prefs?.theme) {
      setThemeState(prefs.theme);
    }
  }, [prefs?.theme]);

  const mutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userPreferences.all });
    },
  });

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      mutation.mutate({ theme: newTheme });
    },
    [mutation],
  );

  // Resolve theme and apply .dark class
  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, [theme]);

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
