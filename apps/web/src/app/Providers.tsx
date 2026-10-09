import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useHydrated } from '@/hooks/use-hydrated';
import { createQueryClient } from '@/lib/query-client';
import { useTheme } from './theme-context';
import { ThemeProvider } from './ThemeProvider';

// Toasts are never needed for the first paint: load sonner after the page.
const Toaster = lazy(async () => ({ default: (await import('sonner')).Toaster }));

function ThemedToaster() {
  const { theme } = useTheme();
  if (!useHydrated()) return null;
  return (
    <Suspense fallback={null}>
      <Toaster position="top-center" theme={theme === 'light' ? 'light' : 'dark'} />
    </Suspense>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ThemedToaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
