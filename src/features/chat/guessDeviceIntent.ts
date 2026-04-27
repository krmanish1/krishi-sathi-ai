import type { DeviceIntent } from "@/shared/api/types";

/** Lightweight routing before the backend; mirrors common farmer queries. */
export function guessDeviceIntent(text: string): DeviceIntent {
  const t = text.toLowerCase();
  if (/(mandi|bazaar|market|price|bhav|rate|दाम|मंडी|भाव)/.test(t)) {
    return "market_price";
  }
  if (/(weather|rain|mausam|barish|monsoon|मौसम|बारिश)/.test(t)) {
    return "weather";
  }
  if (/(scheme|yojana|sarkar|sarkari|subsidy|pm-|किसान|योजना|सब्सिडी)/.test(t)) {
    return "scheme_query";
  }
  if (/(disease|pest|fungus|insect|sickness|rot|wilt|पीओ|रोग|कीड़ा|कीट)/.test(t)) {
    return "crop_disease";
  }
  if (/(loan|emi|kcc|कर्ज|लोन|बैंक|finance|money)/.test(t)) {
    return "financial";
  }
  if (/(sow|harvest|calendar|fertiliz|urea|drip|sowing|बुवाई|फसल|पानी|सिंच)/.test(t)) {
    return "crop_plan";
  }
  if (/(alert|warning|चेतावणी|चेतावनी|अलर्ट)/.test(t)) {
    return "alert";
  }
  return "general";
}
