'use client';

import { useRef, useEffect } from 'react';

interface BookmarkletLinkProps {
  href: string;
}

export function BookmarkletLink({ href }: BookmarkletLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Set href after hydration — bypasses React's javascript: URL sanitization
    ref.current?.setAttribute('href', href);
  }, [href]);

  return (
    <a
      ref={ref}
      href="#"
      onClick={(e) => e.preventDefault()}
      draggable
      className="flex-1 font-semibold text-sm text-[var(--accent-text)] cursor-grab select-none"
    >
      Save to Ridecast
    </a>
  );
}
