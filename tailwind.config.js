/** Spotify-inspired dark theme — immersive UI, functional green accent (#1ed760). Typography: Inter / Plus Jakarta (Circular-like stack unavailable in-app). */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        body: "Inter_400Regular",
        "body-medium": "Inter_500Medium",
        "body-semibold": "Inter_600SemiBold",
        display: "PlusJakartaSans_700Bold",
        xb: "PlusJakartaSans_800ExtraBold",
        jakarta: "PlusJakartaSans_600SemiBold",
      },
      colors: {
        // Spotify surfaces (semantic aliases preserved for existing classNames)
        page: { DEFAULT: "#121212" },
        card: { DEFAULT: "#181818" },
        "card-mid": { DEFAULT: "#252525" },
        muted: { DEFAULT: "#1f1f1f" },
        border: { DEFAULT: "#4d4d4d" },
        "border-light": { DEFAULT: "#7c7c7c" },
        separator: { DEFAULT: "#b3b3b3" },
        // Text — inverted for dark immersion
        ink: { DEFAULT: "#ffffff" },
        "ink-muted": { DEFAULT: "#b3b3b3" },
        "ink-soft": { DEFAULT: "#cbcbcb" },
        /** Legacy screen headings — map to primary white on dark */
        "title-green": { DEFAULT: "#ffffff" },
        /** Functional accent only — CTAs, active nav, play */
        brand: { DEFAULT: "#1ed760" },
        "brand-border": { DEFAULT: "#1db954" },
        "brand-mid": { DEFAULT: "#1db954" },
        "brand-deep": { DEFAULT: "#168d40" },
        /** Text/icons on Spotify green */
        "on-brand": { DEFAULT: "#000000" },
        primary: { DEFAULT: "#1ed760" },
        /** Rare light pill (marketing / consent pattern) */
        wheat: { DEFAULT: "#eeeeee" },
        earth: { DEFAULT: "#a67c52" },
        amber: { DEFAULT: "#ffa42b" },
        success: { DEFAULT: "#1ed760" },
        danger: { DEFAULT: "#f3727f" },
        warning: { DEFAULT: "#ffa42b" },
        announcement: { DEFAULT: "#539df5" },
        surface: { DEFAULT: "#181818", muted: "#1f1f1f", paper: "#121212" },
        text: { DEFAULT: "#ffffff", muted: "#b3b3b3" },
        coral: { DEFAULT: "#3d2a28" },
        "mint-subtle": { DEFAULT: "#86efac" },
        stone: { DEFAULT: "#a3a3a3" },
        header: { blur: "rgba(18,18,18,0.88)" },
      },
      borderRadius: {
        bento: "12px",
        nav: "32px",
        pill: "9999px",
        "pill-lg": "500px",
      },
      letterSpacing: {
        button: "1.6px",
      },
      boxShadow: {
        fab: "0px 25px 50px -12px rgba(0,0,0,0.5)",
        cta: "0px 8px 24px rgba(0,0,0,0.45)",
        card: "0px 8px 8px rgba(0,0,0,0.35)",
        dialog: "0px 8px 24px rgba(0,0,0,0.5)",
        "nav-up": "0px -8px 24px rgba(0,0,0,0.35)",
        inset: "rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset",
      },
    },
  },
  plugins: [],
};
