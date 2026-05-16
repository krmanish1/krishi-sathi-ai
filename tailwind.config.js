/** MongoDB-inspired white theme — clean canvas, bright #00ED64 brand green, deep navy-teal ink. */
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
        // Canvas white surfaces
        page: { DEFAULT: "#FFFFFF" },
        card: { DEFAULT: "#FFFFFF" },
        "card-mid": { DEFAULT: "#F3F6F4" },
        muted: { DEFAULT: "#F9FBFA" },
        border: { DEFAULT: "#E8EDEB" },
        "border-light": { DEFAULT: "#C8D5D1" },
        separator: { DEFAULT: "#8997A0" },
        // Text — deep navy-teal for light backgrounds
        ink: { DEFAULT: "#001E2B" },
        "ink-muted": { DEFAULT: "#5C6C75" },
        "ink-soft": { DEFAULT: "#8997A0" },
        /** Primary headings on white canvas */
        "title-green": { DEFAULT: "#001E2B" },
        /** MongoDB green — CTAs, active nav, primary actions */
        brand: { DEFAULT: "#00ED64" },
        "brand-border": { DEFAULT: "#00A35C" },
        "brand-mid": { DEFAULT: "#00A35C" },
        "brand-deep": { DEFAULT: "#00684A" },
        /** Deep navy-teal on MongoDB green (sufficient contrast) */
        "on-brand": { DEFAULT: "#001E2B" },
        primary: { DEFAULT: "#00ED64" },
        /** Pale mint pill for marketing / soft accents */
        wheat: { DEFAULT: "#E3FCF7" },
        earth: { DEFAULT: "#a67c52" },
        amber: { DEFAULT: "#F59E0B" },
        success: { DEFAULT: "#00ED64" },
        danger: { DEFAULT: "#DB3030" },
        warning: { DEFAULT: "#F59E0B" },
        announcement: { DEFAULT: "#3B82F6" },
        surface: { DEFAULT: "#F9FBFA", muted: "#F3F6F4", paper: "#FFFFFF" },
        text: { DEFAULT: "#001E2B", muted: "#5C6C75" },
        coral: { DEFAULT: "#FEF2F2" },
        "mint-subtle": { DEFAULT: "#BBFDE8" },
        stone: { DEFAULT: "#8997A0" },
        header: { blur: "rgba(255,255,255,0.90)" },
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
        fab: "0px 25px 50px -12px rgba(0,30,43,0.18)",
        cta: "0px 8px 24px rgba(0,30,43,0.12)",
        card: "0px 4px 12px rgba(0,30,43,0.08)",
        dialog: "0px 16px 48px rgba(0,30,43,0.12)",
        "nav-up": "0px -8px 24px rgba(0,30,43,0.08)",
        inset: "rgb(232,237,235) 0px 1px 0px, rgb(200,213,209) 0px 0px 0px 1px inset",
      },
    },
  },
  plugins: [],
};
