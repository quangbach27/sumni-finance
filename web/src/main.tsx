import { StrictMode, useEffect } from 'react';

import ReactDOM from 'react-dom/client';

import { ClerkProvider, useAuth } from '@clerk/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';

import ErrorPage from './components/layout/default-pages/error-page';
import NotFoundPage from './components/layout/default-pages/not-found-page';
import PendingPage from './components/layout/default-pages/pending-page';
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
  defaultPendingComponent: PendingPage,
  defaultErrorComponent: ErrorPage,
  defaultNotFoundComponent: NotFoundPage,
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

  useEffect(() => {
    router.invalidate();
  }, [auth.isSignedIn]);

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
        routerPush={(to) => router.history.push(to)}
        routerReplace={(to) => router.history.replace(to)}
      >
        <QueryClientProvider client={queryClient}>
          <InnerApp />
        </QueryClientProvider>
      </ClerkProvider>
    </StrictMode>,
  );
}
