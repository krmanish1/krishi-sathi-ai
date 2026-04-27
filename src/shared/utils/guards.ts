export const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;
