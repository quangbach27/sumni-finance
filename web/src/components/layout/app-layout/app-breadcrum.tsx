import { Link, isMatch, useMatches } from '@tanstack/react-router';

export default function AppBreadcrum() {
  const matches = useMatches();

  const crumbs = matches
    .filter((match) => {
      return isMatch(match, 'staticData.crumb');
    })
    .map((match) => ({
      label: match.staticData.crumb,
      pathname: match.pathname,
    }));

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex">
        {crumbs.map((crumb, i) => (
          <li key={crumb.pathname}>
            {i < crumbs.length - 1 ? (
              <>
                <Link to={crumb.pathname}>{crumb.label}</Link>
                <span> / </span>
              </>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
