/** Maps 0–1 WebRTC band energy to visible bar height. */
export function amplifyAudioLevel(raw: number, gain = 4): number {
  if (raw <= 0.001) return 0;
  const boosted = Math.min(1, raw * gain);
  return Math.pow(boosted, 0.55);
}
