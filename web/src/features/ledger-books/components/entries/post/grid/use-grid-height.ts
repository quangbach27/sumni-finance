import { useSyncExternalStore } from 'react';

const ROW_HEIGHT = 50;
const HEADER_HEIGHT = 64;
// Space the page needs around the grid (header, fund source card, buttons).
const PAGE_CHROME = 360;
const MIN_MAX_HEIGHT = 420;

export { ROW_HEIGHT, HEADER_HEIGHT };

const subscribeResize = (onChange: () => void) => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};

/** Window height; the grid needs a numeric height for virtualization. */
const useViewportHeight = () =>
  useSyncExternalStore(
    subscribeResize,
    () => window.innerHeight,
    () => 800,
  );

/** Grid height: fits the rows (plus one spare), capped to what the page leaves. */
export function useGridHeight(rowCount: number) {
  const viewportHeight = useViewportHeight();
  const maxHeight = Math.max(MIN_MAX_HEIGHT, viewportHeight - PAGE_CHROME);
  return Math.min(HEADER_HEIGHT + ROW_HEIGHT * (rowCount + 1), maxHeight);
}
