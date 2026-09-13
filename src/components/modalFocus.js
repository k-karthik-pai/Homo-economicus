export function trapModalFocus(overlay, close) {
  const previous = document.activeElement;
  const handleKey = event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...overlay.querySelectorAll('button, input, a[href], textarea, select')]
      .filter(e => !e.disabled && !e.hidden && e.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  };
  document.addEventListener('keydown', handleKey);
  return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
}
