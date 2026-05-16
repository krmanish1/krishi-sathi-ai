let _ready = false;
let _modelPath = "";
let _preferOffline = false;

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

/** Whether the user prefers on-device inference over network calls. */
export const setPreferOffline = (value: boolean): void => {
  _preferOffline = value;
};

/** True if the user has opted into preferring on-device inference. */
export const getPreferOffline = (): boolean => _preferOffline;

/** Resets all runtime state. Call at boot after re-hydrating preferOffline from persisted store. Used in tests to isolate state between cases. */
export const resetModelState = (): void => {
  _ready = false;
  _modelPath = "";
  _preferOffline = false;
};
