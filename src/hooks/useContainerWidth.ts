import { useState, useCallback, useRef } from 'react';

/**
 * Returns [ref, width] — where ref should be attached to the container div.
 * width is the measured pixel width of that container.
 * Falls back to a default value until measured.
 */
export function useContainerWidth(defaultWidth = 600): [(node: HTMLDivElement | null) => void, number] {
  const [width, setWidth] = useState(defaultWidth);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (node !== null) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) setWidth(Math.floor(w));
        }
      });
      observer.observe(node);
      resizeObserverRef.current = observer;

      const rect = node.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(Math.floor(rect.width));
      }
    }
  }, []);

  return [ref, width];
}

/**
 * Returns [ref, width, height] — tracks both dimensions.
 * Attach ref to a flex-1 / h-full container so the chart fills available space.
 */
export function useContainerSize(defaultWidth = 600, defaultHeight = 300): [(node: HTMLDivElement | null) => void, number, number] {
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (node !== null) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.floor(entry.contentRect.width);
          const h = Math.floor(entry.contentRect.height);
          if (w > 0 && h > 0) setSize({ w, h });
        }
      });
      observer.observe(node);
      resizeObserverRef.current = observer;

      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          w: Math.floor(rect.width),
          h: Math.floor(rect.height),
        });
      }
    }
  }, []);

  return [ref, size.w, size.h];
}

