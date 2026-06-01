export {
  checkLocalGemmaModelOnDisk,
  detectModelVariant,
  deviceGemmaVariantPolicyFromRam,
  getDeviceGemmaVariantPolicy,
  modelVariantFromFilename,
  modelVariantToOnDeviceModelId,
  modelFilePath,
  scanLocalGemmaModelOnDisk,
  resolveLocalGemmaModelOnDisk,
} from "./localGemmaModelFile";
export type { DeviceGemmaVariantPolicy } from "./localGemmaModelFile";
export { logOnDevice } from "./ondeviceLog";
export type { OnDeviceLogEvent } from "./ondeviceLog";
export { hydrateOnDeviceModelFromDisk } from "./hydrateOnDeviceModel";
export {
  syncModelReadyFromDisk,
  recommendedModelVariant,
} from "./syncModelReadyFromDisk";
export type { ModelVariant } from "./localGemmaModelFile";
export { isLowConfidence } from "./confidence";
export { generate, setGemmaBackend, getBackend } from "./gemma";
export type { GemmaBackend, GenerateInput, GenerateOutput } from "./gemma";
export { mockGemmaBackend } from "./mock";
export { createNativeBackend } from "./createNativeBackend";
export { onDeviceAgent } from "./onDeviceAgent";
export { offlineFallback } from "./offlineFallback";
export {
  isModelReady,
  setModelReady,
  getModelPath,
  resetModelState,
  setPreferOffline,
  getPreferOffline,
  subscribePreferOffline,
  subscribeModelReady,
  clearModelReady,
} from "./modelState";
export { downloadGemmaModel, checkIsOnWifi, checkModelExists, downloadGemmaE4B, detectModelVariant as detectGemmaVariant, modelFilePath as gemmaModelFilePath } from "./gemmaDownload";
export type { DownloadProgress } from "./gemmaDownload";
