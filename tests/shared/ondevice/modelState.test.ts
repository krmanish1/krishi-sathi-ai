import {
  resetModelState,
  setPreferOffline,
  getPreferOffline,
  subscribePreferOffline,
  subscribeModelReady,
  setModelReady,
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

  it("subscribeModelReady fires when setModelReady is called", () => {
    const fn = jest.fn();
    const unsub = subscribeModelReady(fn);
    setModelReady("/path/model.task");
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("subscribePreferOffline fires when value changes", () => {
    const fn = jest.fn();
    const unsub = subscribePreferOffline(fn);
    setPreferOffline(true);
    expect(fn).toHaveBeenCalledTimes(1);
    setPreferOffline(true);
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
  });
});
