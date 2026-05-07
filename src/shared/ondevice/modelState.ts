let _ready = false;
let _modelPath = "";

/** Called by useModelDownload (features layer) after download completes. */
export const setModelReady = (path: string): void => {
  if (!path || path.trim() === "") {
    throw new Error("setModelReady(path): path must be a non-empty string");
  }
  _ready = true;
  _modelPath = path;
};

/** True once the model binary exists on disk and has been loaded. */
export const isModelReady = (): boolean => _ready;

/** The resolved path to the model binary. */
export const getModelPath = (): string => _modelPath;

/** Reset state (for testing). */
export const resetModelState = (): void => {
  _ready = false;
  _modelPath = "";
};
