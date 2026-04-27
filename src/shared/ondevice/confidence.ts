import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";

export const isLowConfidence = (c: number): boolean => c < CONFIDENCE_THRESHOLD_LOW;
