import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DesktopIcon, MobileIcon } from '@radix-ui/react-icons';

/** Render the real public components with their own viewport and CSS cascade. */
export function WebsitePreviewFrame({ children, title, mobile, onMobileChange, dirty = false, readOnly = false, focusSelector, height = 610 }: {
  children: ReactNode; title: string; mobile: boolean; onMobileChange: (mobile: boolean) => void; dirty?: boolean; readOnly?: boolean; focusSelector?: string; height?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);
  useLayoutEffect(() => {
    if (!container.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!frameDocument) return;
    const syncStyles = () => {
      frameDocument.head.querySelectorAll('[data-preview-style]').forEach(node => node.remove());
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute('data-preview-style', ''); frameDocument.head.append(clone);
      });
      const reset = frameDocument.createElement('style');
      reset.setAttribute('data-preview-style', '');
      reset.textContent = 'html,body{margin:0!important;padding:0!important;min-height:100%;overflow-x:hidden}body{background:#fff}*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#9ba98b}';
      frameDocument.head.append(reset);
    };
    const base = frameDocument.createElement('base'); base.href = document.baseURI; frameDocument.head.prepend(base);
    frameDocument.documentElement.dataset.theme = document.documentElement.dataset.theme || 'homebound';
    frameDocument.body.classList.add(`theme-${frameDocument.documentElement.dataset.theme}`);
    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); base.remove(); };
  }, [frameDocument]);
  useLayoutEffect(() => {
    if (!frameDocument || !focusSelector) return;
    const focus = () => {
      const section = frameDocument.querySelector(focusSelector);
      if (!section) return false;
      const view = frameDocument.defaultView;
      view?.scrollTo?.({ top: section.getBoundingClientRect().top + view.scrollY, behavior: 'instant' as ScrollBehavior });
      return true;
    };
    if (focus()) return;
    const observer = new MutationObserver(() => { if (focus()) observer.disconnect(); });
    observer.observe(frameDocument.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [frameDocument, focusSelector]);
  const viewport = mobile ? 390 : 1120;
  const scale = Math.min(1, Math.max(1, width - 28) / viewport);
  return <section className="admin-public-preview" aria-label={title}>
    <header><div><span className={dirty ? 'is-draft' : ''} /><strong>Website preview</strong><small>{dirty ? 'Unsaved draft' : 'Saved content'}</small></div><div role="group" aria-label="Preview screen size"><button type="button" aria-label="Desktop preview" aria-pressed={!mobile} onClick={() => onMobileChange(false)}><DesktopIcon /></button><button type="button" aria-label="Mobile preview" aria-pressed={mobile} onClick={() => onMobileChange(true)}><MobileIcon /></button></div></header>
    <div className="admin-preview-address"><span /><span /><span /><code>{title}</code></div>
    <div ref={container} className="admin-preview-canvas"><div style={{ width: viewport * scale, height, position: 'relative', flexShrink: 0 }}><iframe title={title} sandbox="allow-same-origin" srcDoc={'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="page-preview"></div></body></html>'} onLoad={event => {
      const loaded = event.currentTarget.contentDocument;
      if (!loaded) return;
      if (!loaded.getElementById('page-preview')) { const mount = loaded.createElement('div'); mount.id = 'page-preview'; loaded.body.append(mount); }
      setFrameDocument(loaded);
    }} style={{ width: viewport, height: height / scale, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0, display: 'block', maxWidth: 'none' }} />{frameDocument?.getElementById('page-preview') && createPortal(<div onClickCapture={event => { const target = event.target as Element; if (readOnly && target.closest?.('a,button,input,select,textarea')) { event.preventDefault(); event.stopPropagation(); } else if (target.closest?.('a')) event.preventDefault(); }}>{children}</div>, frameDocument.getElementById('page-preview')!)}</div></div>
    <footer>Scroll to explore. Changes appear on your website after you save.</footer>
  </section>;
}
