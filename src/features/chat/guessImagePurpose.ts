export type ImagePurpose = "crop_disease" | "soil_photo" | "pest_id";

export function guessImagePurpose(text: string): ImagePurpose {
  const t = text.toLowerCase();
  if (/(soil|mitti|माटी|मिट्टी|माती)/.test(t)) return "soil_photo";
  if (/(pest|kida|कीड़ा|insect|bug|kirda|कीट)/.test(t)) return "pest_id";
  return "crop_disease";
}
