/**
 * Release / production-install contract tests.
 *
 * Run before shipping a store or APK build:
 *   npm test -- --testPathPattern=productionInstallContract
 *
 * These checks run in Node (CI); they do not replace on-device smoke tests
 * (see maestro/production-install.yaml + npm run smoke against a live API).
 */
import { weatherDisplayFromReport } from "./features/weather/weatherDisplayFromReport";
import { getFarmerWeather, getHealth } from "./shared/api/endpoints";
import { TIMEOUTS_MS } from "./shared/config/constants";
import { mapNetInfoToConnectivity } from "./shared/network/mapNetInfoToConnectivity";
import { queryConnectivityWire, type FarmerWeatherReport } from "./shared/api/types";

jest.mock("@/shared/config/env", () => ({ getApiBaseUrl: () => "http://release-check.test" }));

describe("production install contract", () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
  });

  it("reserves client timeouts for weather and query paths", () => {
    expect(TIMEOUTS_MS.weather).toBeGreaterThan(0);
    expect(TIMEOUTS_MS.query).toBeGreaterThan(0);
    expect(TIMEOUTS_MS.health).toBeGreaterThan(0);
  });

  it("maps connectivity the same way the backend query param expects", () => {
    expect(queryConnectivityWire("online")).toBe("online");
    expect(queryConnectivityWire("offline")).toBe("offline");
    expect(queryConnectivityWire("degraded")).toBe("online");
  });

  it("maps NetInfo snapshots without crashing (native production path)", () => {
    expect(mapNetInfoToConnectivity({ isConnected: false, isInternetReachable: false })).toBe("offline");
    expect(mapNetInfoToConnectivity({ isConnected: true, isInternetReachable: true })).toBe("online");
    expect(mapNetInfoToConnectivity({ isConnected: true, isInternetReachable: false })).toBe("degraded");
    expect(mapNetInfoToConnectivity({ isConnected: null, isInternetReachable: null })).toBeNull();
  });

  it("renders home weather card data from the documented FarmerWeatherReport wire shape", () => {
    const payload: FarmerWeatherReport = {
      farmer_id: "farmer-prod-check",
      lat: 27.1767,
      lng: 78.0081,
      current: {
        temperature_c: 29.25,
        feels_like_c: 31,
        humidity_pct: 62.5,
        wind_speed_kmh: 8.4,
        precipitation_mm: 0.1,
        weather_code: 3,
        condition: "Partly cloudy",
      },
      forecast: [
        {
          date: "2026-05-04",
          temp_max_c: 33,
          temp_min_c: 22.5,
          precipitation_mm: 1.2,
          precip_probability_pct: 35.75,
          weather_code: 2,
          condition: "Humid",
        },
      ],
      cached: false,
      fetched_at: "2026-05-02T12:00:00Z",
      expires_at: "2026-05-02T18:00:00Z",
    };
    const d = weatherDisplayFromReport(payload, "District, State");
    expect(d.tempLabel).toBe("29.25°C");
    expect(d.conditionLabel).toBe("Partly cloudy");
    expect(d.humidityLabel).toBe("62.5%");
    expect(d.rainLabel).toBe("35.75%");
    expect(d.source).toBe("live");
    expect(d.placeLabel).toBe("District, State");
  });

  it("GET /api/v1/health uses JSON accept header (store build can reach backend)", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"status":"ok"}',
    } as Response);
    global.fetch = fetchMock;

    await getHealth();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://release-check.test/api/v1/health",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
  });

  it("GET /api/v1/weather/{id} sends connectivity + force_refresh (EAS / phone bundle)", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ cached: false, current: { temperature_c: 1 } }),
    } as Response);
    global.fetch = fetchMock;

    await getFarmerWeather("farmer-uuid-1", "online", { forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://release-check.test/api/v1/weather/farmer-uuid-1?connectivity=online&force_refresh=true",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
