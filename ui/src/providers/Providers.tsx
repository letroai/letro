import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { LiveUpdatesProvider } from "./LiveUpdatesProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10 * 1000, // 10 seconds default
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
