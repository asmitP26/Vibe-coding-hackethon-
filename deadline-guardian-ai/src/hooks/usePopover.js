import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * usePopover - tiny open/close controller for dropdowns & menus.
 *
 * Returns a `ref` to attach to the popover's outer wrapper plus open state and
 * helpers. While open it closes on an outside click (pointerdown) or the Escape
 * key, which is exactly the behaviour the Topbar search, notifications, and
 * profile menus all need - so they share one implementation.
 */
export function usePopover(initial = false) {
  const [open, setOpen] = useState(initial);
  const ref = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return { open, setOpen, toggle, close, ref };
}

export default usePopover;
