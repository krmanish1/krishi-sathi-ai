/** Figma: Krishi AI Saathi (file aZhH4kPrNtnQbJD29kdSrx) — Offline Mode Dashboard */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        /* Loaded in RootProviders — use e.g. className="font-body" or font-display / font-xb */
        body: "Inter_400Regular",
        "body-medium": "Inter_500Medium",
        "body-semibold": "Inter_600SemiBold",
        display: "PlusJakartaSans_700Bold",
        xb: "PlusJakartaSans_800ExtraBold",
        jakarta: "PlusJakartaSans_600SemiBold",
      },
      colors: {
        // Surfaces
        page: { DEFAULT: "#F9F9F9" },
        card: { DEFAULT: "#FFFFFF" },
        muted: { DEFAULT: "#F3F3F3" },
        border: { DEFAULT: "#E2E2E2" },
        // Text
        ink: { DEFAULT: "#1A1C1C" },
        "ink-muted": { DEFAULT: "#40493D" },
        "title-green": { DEFAULT: "#14532D" },
        // Brand / primary green (CTA, nav active, FAB)
        brand: { DEFAULT: "#0D631B" },
        "brand-mid": { DEFAULT: "#2E7D32" },
        "brand-deep": { DEFAULT: "#0D631B" },
        // Light CTA surface on brand green (welcome, etc.)
        wheat: { DEFAULT: "#F4F0E6" },
        // Earth / offline accent
        earth: { DEFAULT: "#7A5649" },
        amber: { DEFAULT: "#6D5100" },
        // State
        success: { DEFAULT: "#0D631B" },
        danger: { DEFAULT: "#BA1A1A" },
        // Legacy aliases used in earlier templates
        surface: { DEFAULT: "#FFFFFF", muted: "#F3F3F3", paper: "#F9F9F9" },
        text: { DEFAULT: "#1A1C1C", muted: "#40493D" },
        // coral icon bg
        coral: { DEFAULT: "#FDCDBC" },
        "mint-subtle": { DEFAULT: "#88D982" },
        stone: { DEFAULT: "#78716C" },
        header: { blur: "rgba(250,250,249,0.8)" },
      },
      borderRadius: {
        bento: "12px",
        nav: "32px",
      },
      boxShadow: {
        fab: "0px 25px 50px -12px rgba(0,0,0,0.25)",
        cta: "0px 10px 15px -3px rgba(13,99,27,0.2),0px 4px 6px -4px rgba(13,99,27,0.2)",
        "nav-up": "0px -4px 24px 0px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
