'use client';

import { useRef, useEffect } from 'react';

export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Build bookmarklet at runtime using the CURRENT page origin.
    // This guarantees the URL is always correct regardless of env vars.
    const origin = window.location.origin;
    const bookmarklet = `javascript:(function(){var w=window.open('${origin}/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'ridecast_save','width=480,height=280,left='+(screen.width/2-240)+',top='+(screen.height/2-140));if(!w){location.href='${origin}/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title);}})()`;
    ref.current?.setAttribute('href', bookmarklet);
  }, []);

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
