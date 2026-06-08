let _ready = false;
let _modelPath = "";
let _preferOffline = false;
const _preferOfflineListeners = new Set<() => void>();
const _modelReadyListeners = new Set<() => void>();

function notifyModelReady(): void {
  for (const fn of _modelReadyListeners) fn();
}

/** Called by useModelDownload (features layer) after download completes. */
export const setModelReady = (path: string): void => {
  if (!path || path.trim() === "") {
    throw new Error("setModelReady(path): path must be a non-empty string");
  }
  const wasReady = _ready;
  const prevPath = _modelPath;
  _ready = true;
  _modelPath = path;
  if (!wasReady || prevPath !== path) notifyModelReady();
};

/** True once the model binary exists on disk and has been loaded. */
export const isModelReady = (): boolean => _ready;

/** Clears on-disk ready state (e.g. native load failed or file removed). */
export const clearModelReady = (): void => {
  if (!_ready) return;
  _ready = false;
  _modelPath = "";
  notifyModelReady();
};

/** The resolved path to the model binary. */
export const getModelPath = (): string => _modelPath;

/** Whether the user prefers on-device inference over network calls. */
export const setPreferOffline = (value: boolean): void => {
  if (_preferOffline === value) return;
  _preferOffline = value;
  for (const fn of _preferOfflineListeners) fn();
};

/** Subscribe to prefer-offline toggles (for connectivity UI). */
export const subscribePreferOffline = (listener: () => void): (() => void) => {
  _preferOfflineListeners.add(listener);
  return () => {
    _preferOfflineListeners.delete(listener);
  };
};

/** True if the user has opted into preferring on-device inference. */
export const getPreferOffline = (): boolean => _preferOffline;

/** Subscribe when a local model path becomes ready (download complete or disk hydrate). */
export const subscribeModelReady = (listener: () => void): (() => void) => {
  _modelReadyListeners.add(listener);
  return () => {
    _modelReadyListeners.delete(listener);
  };
};

/** Resets all runtime state. Call at boot after re-hydrating preferOffline from persisted store. Used in tests to isolate state between cases. */
export const resetModelState = (): void => {
  const wasReady = _ready;
  _ready = false;
  _modelPath = "";
  _preferOffline = false;
  if (wasReady) notifyModelReady();
};
