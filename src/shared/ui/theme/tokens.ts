/**
 * Spotify-inspired dark theme tokens (see tailwind.config.js).
 * Proprietary Spotify fonts are not bundled — Inter / Plus Jakarta approximate UI density.
 */
export const theme = {
  pageBg: "#121212",
  surface: "#181818",
  surfaceMid: "#1f1f1f",
  cardElevated: "#252525",
  ink: "#ffffff",
  inkMuted: "#b3b3b3",
  brand: "#1ed760",
  brandMid: "#1db954",
  brandDeep: "#168d40",
  onBrand: "#000000",
  border: "#4d4d4d",
  borderLight: "#7c7c7c",
  danger: "#f3727f",
  warning: "#ffa42b",
  announcement: "#539df5",
} as const;

/** @deprecated Use `theme` — kept for gradual migration */
export const figma = {
  pageBg: theme.pageBg,
  ink: theme.ink,
  inkMuted: theme.inkMuted,
  titleGreen: "#ffffff",
  brand: theme.brand,
  brandEnd: theme.brandMid,
  earth: "#a67c52",
  amber: theme.warning,
  border: theme.border,
  cardMuted: theme.surfaceMid,
  coral: "#3d2a28",
  mintOnGreen: "#86efac",
  stone: "#a3a3a3",
} as const;
