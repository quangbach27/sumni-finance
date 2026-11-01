import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings')({
  staticData: { crumb: 'Cài đặt' },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_app/settings"!</div>;
}
