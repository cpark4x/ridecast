'use client';

interface BookmarkletLinkProps {
  href: string;
}

export function BookmarkletLink({ href }: BookmarkletLinkProps) {
  return (
    /* eslint-disable-next-line @next/next/no-html-link-for-pages */
    <a
      href={href}
      onClick={(e) => e.preventDefault()}
      draggable
      className="flex-1 font-semibold text-sm text-[#EA580C] cursor-grab select-none"
    >
      Save to Ridecast
    </a>
  );
}
