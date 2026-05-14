export {
  checkLocalGemmaModelOnDisk,
  detectModelVariant,
  modelFilePath,
} from "./localGemmaModelFile";
export type { ModelVariant } from "./localGemmaModelFile";
export { isLowConfidence } from "./confidence";
export { generate, setGemmaBackend, getBackend } from "./gemma";
export type { GemmaBackend, GenerateInput, GenerateOutput } from "./gemma";
export { mockGemmaBackend } from "./mock";
export { createNativeBackend } from "./native-backend";
export { onDeviceAgent } from "./onDeviceAgent";
export { offlineFallback } from "./offlineFallback";
export { isModelReady, setModelReady, getModelPath } from "./modelState";
