
'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook that returns `true` once the component has mounted on the client.
 * This is useful for preventing server-side rendering of client-only components
 * or deferring client-side logic until after the initial render.
 *
 * @returns {boolean} `true` if the component is mounted, otherwise `false`.
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
