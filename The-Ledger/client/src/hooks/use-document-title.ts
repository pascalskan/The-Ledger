import { useEffect } from "react";

const APP_NAME = "The Ledger";

/**
 * Keeps document.title in step with the page's single <h1> (E-4 guarantees one
 * per route). Pages are lazy-loaded and several render their own header, so
 * rather than touching ~50 pages this watches the DOM and mirrors the heading.
 *
 * Without a title every tab, history entry and screen-reader page announcement
 * is the raw URL (axe `document-title`, 69/69 pages).
 */
export function useDocumentTitle() {
  useEffect(() => {
    let frame = 0;
    const sync = () => {
      frame = 0;
      const h1 = document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim();
      const next = h1 && h1.toLowerCase() !== APP_NAME.toLowerCase() ? `${h1} · ${APP_NAME}` : APP_NAME;
      if (document.title !== next) document.title = next;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
