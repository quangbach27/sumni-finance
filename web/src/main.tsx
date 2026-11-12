import { StrictMode } from 'react';

import ReactDOM from 'react-dom/client';

import { ClerkProvider, useAuth } from '@clerk/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';

import { env } from './lib/env';
import { queryClient } from './lib/query';
import { routeTree } from './routeTree.gen';

import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: { queryClient, auth: undefined! },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface StaticDataRouteOption {
    crumb?: string;
  }
}

function InnerApp() {
  const auth = useAuth();

  // Wait for Clerk to hydrate so guards never redirect on an unknown session.
  if (!auth.isLoaded) return null;

  return <RouterProvider router={router} context={{ auth }} />;
}

const rootElement = document.getElementById('app')!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ClerkProvider
        publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        appearance={{ cssLayerName: 'clerk' }}
        routerPush={(to) => router.navigate({ to })}
        routerReplace={(to) => router.navigate({ to, replace: true })}
      >
        <QueryClientProvider client={queryClient}>
          <InnerApp />
        </QueryClientProvider>
      </ClerkProvider>
    </StrictMode>,
  );
}
