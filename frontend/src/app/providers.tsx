'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
