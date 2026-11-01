import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/reports')({
  staticData: { crumb: 'Báo cáo' },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_app/reports"!</div>;
}
