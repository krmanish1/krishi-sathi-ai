/**
 * MongoDB-inspired white theme tokens (see tailwind.config.js).
 * Deep navy-teal (#001E2B) ink on white canvas, bright #00ED64 brand green.
 */
export const theme = {
  pageBg: "#FFFFFF",
  surface: "#F9FBFA",
  surfaceMid: "#F3F6F4",
  cardElevated: "#FFFFFF",
  ink: "#001E2B",
  inkMuted: "#5C6C75",
  brand: "#00ED64",
  brandMid: "#00A35C",
  brandDeep: "#00684A",
  onBrand: "#001E2B",
  border: "#E8EDEB",
  borderLight: "#C8D5D1",
  danger: "#DB3030",
  warning: "#F59E0B",
  announcement: "#3B82F6",
} as const;

/** @deprecated Use `theme` — kept for gradual migration */
export const figma = {
  pageBg: theme.pageBg,
  ink: theme.ink,
  inkMuted: theme.inkMuted,
  titleGreen: "#001E2B",
  brand: theme.brand,
  brandEnd: theme.brandMid,
  earth: "#a67c52",
  amber: theme.warning,
  border: theme.border,
  cardMuted: theme.surfaceMid,
  coral: "#FEF2F2",
  mintOnGreen: "#BBFDE8",
  stone: "#8997A0",
} as const;
