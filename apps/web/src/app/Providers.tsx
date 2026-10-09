import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { createQueryClient } from '@/lib/query-client';
import { useTheme } from './theme-context';
import { ThemeProvider } from './ThemeProvider';

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-center" theme={theme === 'light' ? 'light' : 'dark'} />;
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
