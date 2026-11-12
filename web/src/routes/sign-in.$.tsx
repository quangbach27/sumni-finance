import { SignIn } from '@clerk/react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/sign-in/$')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isSignedIn) {
      throw redirect({ href: safeRedirect(search.redirect) });
    }
  },
  component: SignInPage,
});

// Only allow same-origin relative paths to avoid open redirects.
function safeRedirect(target?: string) {
  return target && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/ledger-books';
}

function SignInPage() {
  const { redirect: target } = Route.useSearch();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/"
        forceRedirectUrl={safeRedirect(target)}
      />
    </main>
  );
}
