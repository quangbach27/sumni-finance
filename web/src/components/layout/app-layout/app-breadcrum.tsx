import { Fragment } from 'react';

import { Link, useMatches } from '@tanstack/react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type Crumb = { label: string; to: string };

export default function AppBreadcrum() {
  const matches = useMatches();

  const crumbs: Crumb[] = [];
  for (const match of matches) {
    const { crumb, parentCrumbs } = match.staticData;
    if (!crumb) continue;
    const params = match.params as Record<string, string>;
    // Fill `$param` segments so every crumb holds a concrete pathname.
    const resolve = (to: string) =>
      to.replace(/\$(\w+)/g, (_, key: string) => params[key] ?? '');
    for (const parent of parentCrumbs ?? []) {
      crumbs.push({ label: parent.label, to: resolve(parent.to) });
    }
    crumbs.push({ label: crumb, to: match.pathname });
  }

  const trail = crumbs.filter(
    (c, i) => crumbs.findIndex((o) => o.to === c.to) === i,
  );

  if (trail.length === 0) return null;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {trail.map((crumb, i) => {
          const isLast = i === trail.length - 1;
          return (
            <Fragment key={crumb.to}>
              <BreadcrumbItem
                className={isLast ? 'min-w-0' : 'hidden md:inline-flex'}
              >
                {isLast ? (
                  <BreadcrumbPage className="truncate">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={crumb.to} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
