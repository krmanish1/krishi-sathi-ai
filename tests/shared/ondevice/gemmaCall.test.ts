import { isAbortError, isGemmaTimeoutError } from "@/shared/ondevice/gemmaCall";

describe("gemmaCall errors", () => {
  it("detects abort errors", () => {
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("GEMMA_TIMEOUT"))).toBe(false);
  });

  it("detects timeout errors", () => {
    expect(isGemmaTimeoutError(new Error("GEMMA_TIMEOUT"))).toBe(true);
  });
});
