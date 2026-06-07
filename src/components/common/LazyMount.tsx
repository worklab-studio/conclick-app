'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Defers rendering its children until they scroll near the viewport. Used to
 * keep below-the-fold dashboard panels (map, weekly traffic) from firing their
 * data requests on initial page load — they mount + fetch only when needed.
 * A min-height placeholder preserves layout so there's no scroll jump.
 */
export function LazyMount({
  children,
  minHeight = 320,
  rootMargin = '300px',
  className,
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;

    // Fallback for environments without IntersectionObserver.
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }

    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return (
    <div ref={ref} className={className} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
