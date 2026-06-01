import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { ApiStatusProvider, useApiStatus } from "@/shared/api/apiStatus";
import { ApiError } from "@/shared/api/errors";
import { getHealth } from "@/shared/api/endpoints";
import { resetBackendCircuit } from "@/shared/api/routing";

jest.mock("@/shared/api/endpoints", () => ({ getHealth: jest.fn() }));
jest.mock("@/shared/network", () => ({ useConnectivity: () => "online" }));
const mockHealth = getHealth as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiStatusProvider>{children}</ApiStatusProvider>
);

describe("useApiStatus", () => {
  beforeEach(() => {
    resetBackendCircuit();
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

  it("transitions to down immediately on network request failed", async () => {
    mockHealth.mockRejectedValue(new TypeError("Network request failed"));
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(result.current).toBe("down");
    expect(mockHealth).toHaveBeenCalledTimes(1);
  });

  it("transitions to down after 3 non-network failures", async () => {
    mockHealth.mockRejectedValue(
      new ApiError("UPSTREAM_UNAVAILABLE", 503, "cold", true, undefined, "RETRY_ONLINE_LATER"),
    );
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(result.current).toBe("cold");
    for (let i = 1; i < 3; i++) {
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
