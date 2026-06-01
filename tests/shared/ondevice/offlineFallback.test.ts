jest.mock("i18next", () => ({
  t: (key: string) =>
    ({
      "offline.modelNotDownloaded": "Please download the AI model first to chat offline.",
      "offline.inferenceFailed": "The offline model is on your device but could not run.",
      "offline.modelWrongFormat": "Download the model again in the new format.",
      "offline.modelNotDownloadedWeather": "Please download weather model.",
      "offline.inferenceFailedWeather": "Weather model could not run.",
    })[key] ?? key,
}));

import { offlineFallback } from "@/shared/ondevice/offlineFallback";
import { resetModelState, setModelReady } from "@/shared/ondevice/modelState";

describe("offlineFallback", () => {
  beforeEach(() => resetModelState());

  it("asks to download when model is not ready", () => {
    const r = offlineFallback({ text: "hello", language: "en", intent: "general" });
    expect(r.text).toContain("download the AI model");
  });

  it("reports inference failure when model is ready but Gemma failed", () => {
    setModelReady("/data/gemma-4-E2B-it.litertlm");
    const r = offlineFallback(
      { text: "hello", language: "en", intent: "general" },
      undefined,
      { reason: "inference_failed" },
    );
    expect(r.text).toContain("could not run");
    expect(r.text).not.toContain("download the AI model first");
  });

  it("asks to re-download when only legacy web.task path is registered", () => {
    setModelReady("file:///doc/gemma-4-E2B-it-web.task");
    const r = offlineFallback({ text: "hello", language: "en", intent: "general" });
    expect(r.text).toContain("new format");
  });
});
