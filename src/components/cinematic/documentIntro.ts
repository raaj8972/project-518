type IntroKind = 'cinematic' | 'opening';

// App imports this eagerly, before any client-side redirects or lazy Home code.
// A browser refresh creates a new module instance; SPA navigation keeps this one.
const entryPathname = typeof window === 'undefined' ? '/' : window.location.pathname;
const played = new Set<IntroKind>();
let leftEntryRoute = false;

export function recordDocumentRoute(pathname: string) {
  if (pathname !== entryPathname) leftEntryRoute = true;
}

export function isDocumentEntryRoute(pathname = window.location.pathname) {
  return !leftEntryRoute && pathname === entryPathname;
}

export function canPlayDocumentIntro(kind: IntroKind, pathname = window.location.pathname) {
  return isDocumentEntryRoute(pathname) && !played.has(kind);
}

export function markDocumentIntroPlayed(kind: IntroKind) {
  played.add(kind);
}
