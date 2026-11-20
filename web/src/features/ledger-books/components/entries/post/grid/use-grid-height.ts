import { useLayoutEffect, useRef, useState } from 'react';

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 44;
// Used until the slot has been measured.
const FALLBACK_HEIGHT = 400;

export { ROW_HEIGHT, HEADER_HEIGHT };

/**
 * Height of the element the ref is attached to. The grid needs a numeric
 * height for virtualization, so it fills a flex slot and reads its size.
 */
export function useGridHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(FALLBACK_HEIGHT);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setHeight(el.clientHeight || FALLBACK_HEIGHT);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, height };
}
