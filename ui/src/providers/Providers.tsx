import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { LiveUpdatesProvider } from "./LiveUpdatesProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 0, // No cache during development
      gcTime: 0,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LiveUpdatesProvider>{children}</LiveUpdatesProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
