import {
  resetModelState,
  setPreferOffline,
  getPreferOffline,
} from "@/shared/ondevice/modelState";

describe("modelState preferOffline", () => {
  beforeEach(() => resetModelState());

  it("defaults to false", () => {
    expect(getPreferOffline()).toBe(false);
  });

  it("setPreferOffline(true) returns true", () => {
    setPreferOffline(true);
    expect(getPreferOffline()).toBe(true);
  });

  it("resetModelState clears preferOffline", () => {
    setPreferOffline(true);
    resetModelState();
    expect(getPreferOffline()).toBe(false);
  });

  it("setPreferOffline(false) after true returns false", () => {
    setPreferOffline(true);
    setPreferOffline(false);
    expect(getPreferOffline()).toBe(false);
  });
});
