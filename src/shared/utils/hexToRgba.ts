/** `#RRGGBB` only — for RN inline styles. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "").slice(0, 6);
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
