import { Outlet, createFileRoute } from '@tanstack/react-router';

import AppLayout from '@/components/layout/app-layout/app-layout';

export const Route = createFileRoute('/_app')({
  component: Layout,
});

function Layout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
