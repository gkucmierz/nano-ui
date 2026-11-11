/**
 * Resolves route-level allowed query parameter keys (`meta.allowedQuery`) for a URL pathname
 * so `vue-url-cleaner` preserves explicit route query parameters on initial boot while
 * immediately scrubbing tracking parameters (`fbclid`, `utm_*`, `gclid`, `igshid`, `mc_eid`, etc.).
 */
export const resolveRouteAllowedQueryKeys = (pathname, routeList = []) => {
  if (!pathname || !Array.isArray(routeList)) return null;
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const matched = routeList.find((r) => r && r.path === normalizedPath);
  if (!matched || !matched.meta) return null;
  if (matched.meta.allowedQuery === false) return [];
  if (Array.isArray(matched.meta.allowedQuery)) return [...matched.meta.allowedQuery];
  return null;
};

export const buildInitialAllowedQueryKeys = (
  pathname,
  routeList = [],
  urlCleanerOptions = {}
) => {
  const baseAllowed = Array.isArray(urlCleanerOptions.allowedKeys)
    ? urlCleanerOptions.allowedKeys
    : [];
  if (urlCleanerOptions.autoFromRouteMeta === false) {
    return baseAllowed;
  }
  const normalizedPath =
    pathname && pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname || '/';
  const matched = Array.isArray(routeList)
    ? routeList.find((r) => r && r.path === normalizedPath)
    : null;
  if (matched?.meta?.allowedQuery === false) {
    return [];
  }
  const metaAllowed = resolveRouteAllowedQueryKeys(normalizedPath, routeList);
  return Array.isArray(metaAllowed) ? [...baseAllowed, ...metaAllowed] : baseAllowed;
};
