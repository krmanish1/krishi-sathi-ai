import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { ApiStatusProvider, useApiStatus } from "./apiStatus";
import { getHealth } from "./endpoints";

jest.mock("./endpoints", () => ({ getHealth: jest.fn() }));
const mockHealth = getHealth as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiStatusProvider>{children}</ApiStatusProvider>
);

describe("useApiStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts as unknown", () => {
    mockHealth.mockResolvedValue({ status: "ok" });
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    expect(result.current).toBe("unknown");
  });

  it("transitions to warm when getHealth succeeds", async () => {
    mockHealth.mockResolvedValue({ status: "ok" });
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(result.current).toBe("warm");
  });

  it("transitions to cold after first failure", async () => {
    mockHealth.mockRejectedValue(new Error("timeout"));
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(result.current).toBe("cold");
  });

  it("transitions to down after 5 failures", async () => {
    mockHealth.mockRejectedValue(new Error("timeout"));
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    // First failure
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(result.current).toBe("cold");
    // Failures 2-5 via timer advances
    for (let i = 1; i < 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(8_000);
        await Promise.resolve();
      });
    }
    expect(result.current).toBe("down");
  });

  it("stays warm after first success even if later calls would fail", async () => {
    mockHealth.mockResolvedValueOnce({ status: "ok" });
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(result.current).toBe("warm");
    expect(result.current).toBe("warm");
  });
});
