

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { useState, type ReactNode } from 'react';
import { RoleProvider } from '@/context/role';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm',
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' }, duration: 6000 },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
      </RoleProvider>
    </QueryClientProvider>
  );
}
