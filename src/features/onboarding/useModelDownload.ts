// Re-exports from shared for backward compatibility.
// New code should import directly from @/shared/ondevice.
export {
  downloadGemmaModel,
  downloadGemmaE4B,
  checkIsOnWifi,
  checkModelExists,
  detectModelVariant,
  modelFilePath,
} from "@/shared/ondevice/gemmaDownload";
export type { DownloadProgress } from "@/shared/ondevice/gemmaDownload";
export type { ModelVariant } from "@/shared/ondevice/localGemmaModelFile";
