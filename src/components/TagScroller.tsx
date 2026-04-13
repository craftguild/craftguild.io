import { useCallback, useEffect, useRef, useState } from 'react';

type TagScrollerProps = Readonly<{
  label: string;
  tags: readonly string[];
}>;

export const TagScroller = ({ label, tags }: TagScrollerProps) => {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const updateScrollState = useCallback(() => {
    setHasScrolled((scrollerRef.current?.scrollLeft ?? 0) >= 1);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [tags, updateScrollState]);

  if (tags.length === 0) {
    return null;
  }

  return (
    <>
      {hasScrolled && (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2 bg-gradient-to-r from-white to-transparent"
          aria-hidden="true"
        />
      )}
      <ul
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto pl-1 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={label}
        onScroll={updateScrollState}
      >
        {tags.map((tag) => (
          <li
            key={tag}
            className="flex h-6 shrink-0 items-center rounded-md bg-slate-50 px-2.5 text-xs font-medium leading-none text-slate-800"
          >
            {tag}
          </li>
        ))}
      </ul>
      <span
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-2 bg-gradient-to-l from-white to-transparent"
        aria-hidden="true"
      />
    </>
  );
};
