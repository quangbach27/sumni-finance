import { createFileRoute } from '@tanstack/react-router';

import { Button } from '#/components/ui/button';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <div className="flex flex-col gap-3 p-8">
      <Button variant="default">Hello</Button>
      <Button variant="outline">Hello</Button>
      <Button variant="secondary">Hello</Button>
      <Button variant="ghost">Hello</Button>
      <Button variant="destructive">Hello</Button>
      <Button variant="link">Hello</Button>
    </div>
  );
}
