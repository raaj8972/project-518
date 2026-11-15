// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  vi.resetModules();
});
afterEach(() => { window.history.replaceState(null, '', '/'); });

it('allows the opening and cinematic intro independently once in a document', async () => {
  const visit = await import('../src/components/cinematic/documentIntro');
  expect(visit.canPlayDocumentIntro('opening')).toBe(true);
  expect(visit.canPlayDocumentIntro('cinematic')).toBe(true);
  visit.markDocumentIntroPlayed('opening');
  expect(visit.canPlayDocumentIntro('opening')).toBe(false);
  expect(visit.canPlayDocumentIntro('cinematic')).toBe(true);
  visit.markDocumentIntroPlayed('cinematic');
  expect(visit.canPlayDocumentIntro('cinematic')).toBe(false);
});

it('does not grant another intro after leaving and returning to the entry page', async () => {
  const visit = await import('../src/components/cinematic/documentIntro');
  visit.recordDocumentRoute('/events');
  visit.recordDocumentRoute('/');
  expect(visit.isDocumentEntryRoute('/')).toBe(false);
  expect(visit.canPlayDocumentIntro('cinematic', '/')).toBe(false);
  expect(visit.canPlayDocumentIntro('opening', '/')).toBe(false);
});

it('does not start the Home film after entering the document on another page', async () => {
  window.history.replaceState(null, '', '/events');
  const visit = await import('../src/components/cinematic/documentIntro');
  expect(visit.canPlayDocumentIntro('opening', '/events')).toBe(true);
  expect(visit.canPlayDocumentIntro('cinematic', '/')).toBe(false);
  window.history.replaceState(null, '', '/');
  visit.recordDocumentRoute(window.location.pathname);
  expect(visit.canPlayDocumentIntro('cinematic')).toBe(false);
});

it('preserves the entry eligibility when only its query or hash changes', async () => {
  const visit = await import('../src/components/cinematic/documentIntro');
  window.history.replaceState(null, '', '/?theme=spiderman#events');
  visit.recordDocumentRoute(window.location.pathname);
  expect(visit.isDocumentEntryRoute()).toBe(true);
  expect(visit.canPlayDocumentIntro('opening')).toBe(true);
});

it('allows the intro again when a refresh creates a fresh document module', async () => {
  const firstVisit = await import('../src/components/cinematic/documentIntro');
  firstVisit.markDocumentIntroPlayed('opening');
  firstVisit.markDocumentIntroPlayed('cinematic');
  firstVisit.recordDocumentRoute('/schedule');
  expect(firstVisit.canPlayDocumentIntro('cinematic')).toBe(false);
  // A browser refresh reevaluates the module instead of preserving SPA state.
  vi.resetModules();
  const refreshedVisit = await import('../src/components/cinematic/documentIntro');
  expect(refreshedVisit.canPlayDocumentIntro('opening')).toBe(true);
  expect(refreshedVisit.canPlayDocumentIntro('cinematic')).toBe(true);
});
