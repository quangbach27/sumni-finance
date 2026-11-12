import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

import AppLayout from '@/components/layout/app-layout/app-layout';

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isSignedIn) {
      throw redirect({
        to: '/sign-in/$',
        params: { _splat: '' },
        search: { redirect: location.href },
      });
    }
  },
  component: Layout,
});

function Layout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
